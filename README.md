# Finely

A personal income & expense tracker built with Electron, React, and TypeScript. Data is stored as plain JSON files on your machine — no accounts, no cloud, no subscriptions.

## Prerequisites

- [Bun](https://bun.sh/) — install it with:

```bash
curl -fsSL https://bun.sh/install | bash
```

## Getting Started

```bash
git clone https://github.com/AmirAnsarpour/finely-app.git
cd finely-app
bun install
bun run dev
```

That's it — the app window opens automatically.

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start the app in development mode with hot reload |
| `bun run build` | Compile the app for production |
| `bun run preview` | Preview the production build |
| `bun run package` | Build and package for the current OS |
| `bun run package:win` | Build and package for Windows |
| `bun run package:linux` | Build and package for Linux |

Packaged installers are output to the `release/` folder.

## Features

- **Dashboard** — monthly income, expenses, net balance, and savings rate with month-over-month comparison, 6-month chart, and budget tracker
- **Transactions** — add, edit, delete, search, and filter; grouped by date; export to CSV
- **Reports** — monthly breakdown with category pie chart and daily spending chart; export to CSV
- **Categories** — custom categories with colors, icons, and optional monthly budget limits
- **Settings** — themes (Light / Dark / Black / System), multi-currency, custom data folder, ZIP backup and restore

## Data Storage

All data lives in three plain JSON files:

```
<data folder>/
  transactions.json
  categories.json
  settings.json
```

You can change the data folder in **Settings → Data Storage**. Point it at a Dropbox or Google Drive folder to sync across devices.

## Tech Stack

Electron · React · TypeScript · electron-vite · Recharts · Bun
