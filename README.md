# Open Sourcery Website

The official website for Open Sourcery. Built using Next.js with Typescript and Tailwind

## Getting Started

### Requirements

- Install [Visual Studio Code](https://code.visualstudio.com/Download) for the coding environment
- Install the VSCode extension [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) for code styling, syntax checking, and finding problems
- Install Node/npm for managing packages
  - Mac or Linux: Install Node: see [here](https://nodejs.org/en/download/) for downloadable installer.
  - Windows: Install [nvm, node.js, and npm](https://docs.microsoft.com/en-us/windows/nodejs/setup-on-wsl2#install-nvm-nodejs-and-npm). Follow Steps 1 - 9 at the link to the left.

### Running the Website Locally

```bash
npm i  # install dependencies
npm run dev  # run the website on localhost:3000
```

## Deployment

The website is hosted using [Vercel](https://vercel.com/).

Locally test a build with:

```bash
npm run build # create the build in the .next/ directory
npm run start # run the build locally
```