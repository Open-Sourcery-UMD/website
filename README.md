# Open Sourcery Website

The official website for [Open Sourcery](https://github.com/Open-Sourcery-UMD), an open-source development club at the University of Maryland, College Park. The site serves as a community hub where Developers can discover projects, form teams, track engagement, and stay connected with club events.

## Tech Stack

- **Framework:** Next.js
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Firebase (Authentication + Firestore)
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/Open-Sourcery-UMD/website.git
   cd website
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file from the example:

   ```bash
   cp .env.example .env.local
   ```

   Fill in the required API keys. Firebase is preconfigured, but you'll need keys for the other API integrations for full access. Reach out to a maintainer if you need access.

4. Start the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the site.

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch from `dev`:
   ```bash
   git checkout -b your-feature-name
   ```
3. Make your changes
4. Test locally to make sure everything works
5. Open a pull request targeting the `dev` branch

### Finding Work

Check the [GitHub Issues](https://github.com/Open-Sourcery-UMD/website/issues) for open tasks. Issues labeled `good first issue` are a great starting point for new contributors.

### Guidelines

- Follow existing code patterns and conventions
- Keep PRs focused (one feature or fix per pull request)
- Write clear commit messages describing what changed and why
