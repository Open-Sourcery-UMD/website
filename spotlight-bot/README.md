# Project Spotlight Bot

Posts open-source projects (Easy / Medium / Hard) to a Discord channel every 2 weeks.

## Setup
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt

## Environment variables
- `DISCORD_TOKEN`: the bot token from the Discord Developer Portal (Bot tab)
- `CHANNEL_ID`: the channel to post in
- `GITHUB_TOKEN`: optional, a GitHub token that avoids rate limits

## Run
    export DISCORD_TOKEN="..."
    export CHANNEL_ID="..."
    export GITHUB_TOKEN="..."
    python3 biweekly_bot.py

The bot needs View Channel, Send Messages, Embed Links and Read Message History in that channel.
Commands: `/history` (everyone) and `/spotlight_now` (Manage Server).
