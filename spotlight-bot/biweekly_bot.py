import asyncio
import datetime as dt
import json
import os
import random
from pathlib import Path

import aiohttp
import discord
from discord import app_commands
from discord.ext import tasks

TOKEN = os.environ["DISCORD_TOKEN"]
CHANNEL_ID = int(os.environ["CHANNEL_ID"])
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")  # optional, but avoids rate limits

INTERVAL = dt.timedelta(days=14)
STATE_FILE = Path("state.json")

PER_TIER = 2  # projects shown per difficulty level
# GitHub's search API allows ~10 calls/min without a token, ~30 with one.
SAMPLE_PER_TIER = 4 if GITHUB_TOKEN else 3

# Hand-picked repos ("owner/name"). These are mixed with newly discovered ones,
# so add anything you want to guarantee will appear. Keep at least PER_TIER per tier.
POOL = {
    "Easy": [
        "mdn/content",
        "freeCodeCamp/freeCodeCamp",
        "exercism/website",
        "firstcontributions/first-contributions",
        "TheAlgorithms/Python",
        "microsoft/Web-Dev-For-Beginners",
        "public-apis/public-apis",
        "kamranahmedse/developer-roadmap",
    ],
    "Medium": [
        "zulip/zulip",
        "scikit-learn/scikit-learn",
        "django/django",
        "pallets/flask",
        "matplotlib/matplotlib",
        "home-assistant/core",
        "mui/material-ui",
        "pandas-dev/pandas",
    ],
    "Hard": [
        "rust-lang/rust",
        "kubernetes/kubernetes",
        "python/cpython",
        "golang/go",
        "nodejs/node",
        "llvm/llvm-project",
        "tensorflow/tensorflow",
        "microsoft/vscode",
    ],
}
COLORS = {"Easy": 0x2ECC71, "Medium": 0xF1C40F, "Hard": 0xE74C3C}

TIER_INFO = {
    "Easy": ("🌱 Easy: Great First Contributions",
             "Beginner-friendly projects with good docs and starter issues. A solid place to make your first pull request."),
    "Medium": ("🔧 Medium: Level Up",
               "Established projects with active communities. You'll need some experience, but the maintainers welcome new contributors."),
    "Hard": ("🚀 Hard: Take On a Challenge",
             "Large, well-known codebases. Expect a steeper learning curve and a big payoff on your resume."),
}

# Discovery: star range as a rough difficulty proxy (bigger project = bigger codebase)
TIER_STARS = {"Easy": "300..3000", "Medium": "3000..20000", "Hard": ">20000"}


# ---------- state (remembers what was already announced) ----------

def load_state() -> dict:
    if STATE_FILE.exists():
        state = json.loads(STATE_FILE.read_text())
    else:
        state = {}
    state.setdefault("last_post", None)
    state.setdefault("history", [])
    state.setdefault("used", {})  # repos already featured, per tier
    return state


def save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2))


# ---------- GitHub helpers ----------

async def gh_get(session: aiohttp.ClientSession, path: str, **params):
    try:
        async with session.get(f"https://api.github.com{path}", params=params) as r:
            if r.status != 200:
                print(f"GitHub {r.status} for {path}")
                return None
            return await r.json()
    except aiohttp.ClientError as e:
        print(f"GitHub request failed: {e}")
        return None


async def score_repo(session, full_name: str) -> dict | None:
    """Documentation / beginner-friendliness score (roughly 0-145)."""
    repo = await gh_get(session, f"/repos/{full_name}")
    if not repo or repo.get("archived"):
        return None

    community = await gh_get(session, f"/repos/{full_name}/community/profile") or {}
    files = community.get("files") or {}
    issues = await gh_get(
        session,
        "/search/issues",
        q=f'repo:{full_name} label:"good first issue" state:open is:issue',
    )
    good_first = (issues or {}).get("total_count", 0)

    score = community.get("health_percentage") or 0       # 0-100: README, CONTRIBUTING, etc.
    score += 15 if repo.get("homepage") else 0             # has a docs/website link
    score += 10 if files.get("contributing") else 0        # has contributor guide
    score += min(good_first, 20)                           # beginner issues available

    return {
        "repo": full_name,
        "score": score,
        "url": repo["html_url"],
        "description": repo.get("description") or "No description",
        "homepage": repo.get("homepage"),
        "language": repo.get("language") or "n/a",
        "stars": repo.get("stargazers_count", 0),
        "good_first": good_first,
        "contributing": (files.get("contributing") or {}).get("html_url"),
    }


async def discover(session, tier: str, exclude: set[str]) -> list[str]:
    """Finds active repos with beginner-friendly issues in the tier's star range."""
    since = (dt.date.today() - dt.timedelta(days=30)).isoformat()
    q = (
        f"good-first-issues:>=3 help-wanted-issues:>=3 archived:false is:public "
        f"stars:{TIER_STARS[tier]} pushed:>{since}"
    )
    # random page so each post sees a different slice of the results
    for page in (random.randint(1, 5), 1):
        data = await gh_get(
            session, "/search/repositories", q=q, sort="updated", per_page=30, page=page
        )
        names = [r["full_name"] for r in (data or {}).get("items", [])]
        fresh = [n for n in names if n.lower() not in exclude]
        if fresh:
            return fresh
    return []


async def pick_projects(session, state: dict) -> dict[str, list[dict]]:
    """Returns {tier: [best PER_TIER projects]}. Never repeats a featured repo
    unless nothing new can be found."""
    used = state.setdefault("used", {})
    seen_all = {r.lower() for repos in used.values() for r in repos}
    seen_all |= {h["repo"].lower() for h in state["history"]}
    picks: dict[str, list[dict]] = {}

    for i, (tier, repos) in enumerate(POOL.items()):
        if i and not GITHUB_TOKEN:
            await asyncio.sleep(6)  # stay under the 10 searches/min unauthenticated limit

        fresh_curated = [r for r in repos if r.lower() not in seen_all]
        found = await discover(session, tier, seen_all)
        candidates = list(dict.fromkeys(fresh_curated + found))

        if len(candidates) < PER_TIER:  # nothing new anywhere, allow repeats
            candidates = list(repos)

        candidates = random.sample(candidates, min(SAMPLE_PER_TIER, len(candidates)))
        scored = [s for s in [await score_repo(session, c) for c in candidates] if s]
        best = sorted(scored, key=lambda s: s["score"], reverse=True)[:PER_TIER]

        picks[tier] = best
        used.setdefault(tier, []).extend(p["repo"] for p in best)
        seen_all.update(p["repo"].lower() for p in best)

    return picks


def short(text: str, n: int = 150) -> str:
    return text if len(text) <= n else text[: n - 1].rstrip() + "…"


def build_embed(tier: str, projects: list[dict]) -> discord.Embed:
    title, desc = TIER_INFO[tier]
    embed = discord.Embed(title=title, description=desc, color=COLORS[tier])
    for p in projects:
        links = [f"[Repo]({p['url']})"]
        if p["homepage"]:
            links.append(f"[Docs]({p['homepage']})")
        if p["contributing"]:
            links.append(f"[Contributing]({p['contributing']})")
        issues_url = f"{p['url']}/issues?q=is%3Aopen+label%3A%22good+first+issue%22"
        links.append(f"[Good first issues]({issues_url})")

        value = (
            f"{short(p['description'])}\n"
            f"{p['language']} | {p['stars']:,} stars | Docs score {p['score']}/145 "
            f"| {p['good_first']} good first issues\n"
            + " | ".join(links)
        )
        embed.add_field(name=p["repo"], value=value, inline=False)
    return embed


# ---------- the bot ----------

class ProjectBot(discord.Client):
    def __init__(self):
        super().__init__(intents=discord.Intents.default())
        self.tree = app_commands.CommandTree(self)
        self.session: aiohttp.ClientSession | None = None

    async def setup_hook(self):
        headers = {"Accept": "application/vnd.github+json", "User-Agent": "project-bot"}
        if GITHUB_TOKEN:
            headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
        self.session = aiohttp.ClientSession(headers=headers)
        await self.tree.sync()
        self.check_schedule.start()

    async def close(self):
        if self.session:
            await self.session.close()
        await super().close()

    async def announce(self) -> bool:
        state = load_state()
        picks = await pick_projects(self.session, state)
        if not any(picks.values()):
            print("Could not pick any projects (GitHub API problem?). Will retry.")
            return False

        channel = self.get_channel(CHANNEL_ID) or await self.fetch_channel(CHANNEL_ID)
        embeds = [build_embed(tier, ps) for tier, ps in picks.items() if ps]
        embeds[-1].set_footer(text="New projects every 2 weeks • Earn gems for merged PRs at opensourcery.umd.edu/gems")
        await channel.send(
            content=(
                "# 🔮 Open Source Spotlight\n"
                "Fresh projects to contribute to, picked for every skill level. "
                "Pick one, find a good first issue, and open a PR!"
            ),
            embeds=embeds,
        )

        now = dt.datetime.now(dt.timezone.utc)
        state["last_post"] = now.isoformat()
        for tier, ps in picks.items():
            for p in ps:
                state["history"].append(
                    {"repo": p["repo"], "tier": tier, "date": now.date().isoformat()}
                )
        save_state(state)
        return True

    @tasks.loop(hours=1)
    async def check_schedule(self):
        last = load_state()["last_post"]
        if last and dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(last) < INTERVAL:
            return
        await self.announce()

    @check_schedule.before_loop
    async def before_check(self):
        await self.wait_until_ready()


client = ProjectBot()


@client.tree.command(name="history", description="Show past featured projects")
async def history(interaction: discord.Interaction):
    items = load_state()["history"]
    if not items:
        await interaction.response.send_message("No projects featured yet.")
        return
    lines = [
        f"{h['date']} | {h.get('tier', '?')}: [{h['repo']}](https://github.com/{h['repo']})"
        for h in items[-18:]
    ]
    await interaction.response.send_message("\n".join(lines), suppress_embeds=True)


@client.tree.command(name="spotlight_now", description="(Admin) Post new projects right now")
@app_commands.default_permissions(manage_guild=True)
async def spotlight_now(interaction: discord.Interaction):
    await interaction.response.defer(ephemeral=True)
    ok = await client.announce()
    await interaction.followup.send("Posted!" if ok else "Couldn't pick projects, check the logs.")


@client.event
async def on_ready():
    print(f"Logged in as {client.user}")


if __name__ == "__main__":
    client.run(TOKEN)