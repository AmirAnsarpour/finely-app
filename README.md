# Finely

A personal income & expense tracker built with Electron, React, and TypeScript. Data is stored as plain JSON files on your machine — no accounts, no cloud, no subscriptions.

---

## Prerequisites

You need [Bun](https://bun.sh/) as the package manager and runtime.

**Linux / macOS**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Windows** (PowerShell)
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

> After installing, restart your terminal so the `bun` command is available.

---

## Getting Started

```bash
git clone https://github.com/AmirAnsarpour/finely-app.git
cd finely-app
bun install
bun run dev
```

The app window opens automatically.

---

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start in development mode with hot reload |
| `bun run build` | Compile for production |
| `bun run preview` | Preview the production build |
| `bun run package` | Build and package for the current OS |
| `bun run package:win` | Build and package for Windows (.exe installer) |
| `bun run package:linux` | Build and package for Linux (.AppImage) |

Packaged installers are output to the `release/` folder.

---

## Features

- **Dashboard** — monthly income, expenses, net balance, and savings rate with month-over-month comparison, 6-month chart, and budget tracker
- **Transactions** — add, edit, delete, search, and filter; grouped by date; export to CSV
- **Reports** — monthly breakdown with category pie charts and daily spending chart
- **Categories** — custom categories with colors, icons, and optional monthly budget limits
- **Installments** — track loans, payment plans, and recurring debts with per-payment history
- **Settings** — themes (Light / Dark / Black / System), multi-currency, Jalali / Gregorian calendar, configurable week start day, custom data folder, ZIP backup and restore

---

## Data Storage

All data lives in plain JSON files:

```
<data folder>/
  transactions.json
  categories.json
  settings.json
  installments.json
```

You can change the data folder in **Settings → Data Storage**. Point it at a Dropbox or Google Drive folder to sync across devices.

---

## Tech Stack

Electron · React · TypeScript · electron-vite · Recharts · Bun
