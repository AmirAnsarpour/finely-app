<div align="center">

<img src="src/renderer/assets/finely.png" width="96" height="96" alt="Finely logo" style="border-radius: 22px" />

# Finely

**A beautiful, private personal finance tracker — no account, no cloud, no subscription.**

Track your income, expenses, investments, and accounts entirely offline.  
Your data is plain JSON files on your own machine. Nothing leaves your device.

[![Version](https://img.shields.io/badge/version-1.1.0-6c8ef5?style=flat-square)](https://github.com/AmirAnsarpour/finely-app)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey?style=flat-square)](#build-from-source)
[![Built with Electron](https://img.shields.io/badge/built%20with-Electron-47848f?style=flat-square)](https://www.electronjs.org/)

[**Build from Source**](#build-from-source) · [**Features**](#features)

</div>

---

## What is Finely?

Finely is a desktop app that helps you take control of your money — without giving up your privacy. It runs 100% offline on your computer.

- No sign-up. No login. No internet required.
- Data stored as plain JSON files you can read, copy, or back up yourself.
- Point the data folder at Dropbox or Google Drive for optional cross-device sync.

---

## Features

### 📊 Dashboard
Get an instant snapshot of your financial health each month:
- Income, expenses, net balance, and savings rate — with month-over-month comparison arrows
- 6-month income vs. expenses bar chart
- Budget tracker — see how close each category is to its limit
- **Budget forecast** — "At this pace, Food will exceed budget on day 22"
- **Spending insights** — auto-generated tips like "Biggest increase: Transport +34% vs last month"
- Net worth strip: liquid balance, goal savings, remaining debt, portfolio value

### 💸 Transactions
- Add income or expense transactions in seconds (or use **Ctrl+N** from anywhere in the app)
- Assign transactions to a **category**, **account**, **date**, **tags**, and a note
- Full search and filters: by type, category, date range, or tag
- Inline edit — click a transaction to edit it in place without opening a modal
- Export to CSV for use in Excel / Sheets

### 🗂️ Categories
- Create custom categories with your choice of icon and color
- Set a **monthly budget limit** per category
- Enable **budget rollover** — unspent budget carries over to next month
- Drag to reorder categories

### 🏦 Accounts
Track multiple bank cards, wallets, or cash accounts separately:
- Each account shows its **current balance**, total income received, and total expenses spent
- When adding a transaction, optionally assign it to an account
- Finely **blocks an expense** if the selected account doesn't have enough balance
- Transactions without an account are "unassigned" — they still count in your global balance

### 📈 Reports
- Monthly breakdown with a category pie chart and daily spending chart
- Compare any month in your history
- Filter by category to drill into spending patterns

### 🎯 Goals
- Create savings goals (vacation fund, emergency fund, etc.)
- Log contributions and track progress toward your target amount and deadline

### 💳 Installments
- Track loans, payment plans, and any recurring debt
- Log each payment as paid or unpaid
- See upcoming payments flagged in the sidebar

### 📉 Investments
- Track holdings in crypto, gold, and fiat currencies
- Live prices fetched from Nobitex (IRT / USDT)
- View **cost basis** (total amount you paid) alongside current value
- See **P&L** — profit or loss — per holding

### ⚙️ Settings
- **Themes:** Light, Dark, Deep Black, or match your system
- **Currency:** 20+ currencies with correct formatting
- **Calendar:** Gregorian or Jalali (Iranian / Shamsi) — the whole app switches
- **Week start day:** Sunday, Monday, or Saturday
- **Data folder:** change where your data is saved (e.g. point it at Dropbox)
- **Backup / Restore:** export everything as a ZIP, import it on any machine

---

## Build from Source

Want to run the latest code or build your own installer? Follow these steps.

### Prerequisites

You need **Git** and **Bun** installed.

**Install Bun on Linux / macOS:**
```bash
curl -fsSL https://bun.sh/install | bash
# Then restart your terminal
```

**Install Bun on Windows (PowerShell):**
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
# Then restart your terminal
```

> Don't have Git? Download it from [git-scm.com](https://git-scm.com/downloads).

---

### Run in Development Mode

```bash
# 1. Clone the repository
git clone https://github.com/AmirAnsarpour/finely-app.git

# 2. Enter the project folder
cd finely-app

# 3. Install dependencies
bun install

# 4. Start the app
bun run dev
```

The app window opens automatically. Changes to source files hot-reload instantly.

---

### Build a Release Package

#### Windows — build on a Windows machine

```powershell
# Build the app, then package it
bun run package:win
```

This produces two files in the `release/` folder:
- `Finely-x.x.x-portable.exe` — portable single file, no install needed
- `Finely-x.x.x-setup.exe` — traditional NSIS installer

#### Linux — build on a Linux machine

```bash
# Build the app, then package it
bun run package:linux
```

This produces three files in the `release/` folder:
- `Finely-x.x.x.AppImage` — universal, runs on any distro
- `Finely-x.x.x-amd64.deb` — for Debian / Ubuntu
- `Finely-x.x.x.x86_64.rpm` — for Fedora / openSUSE

> **Cross-compiling:** Building a Windows `.exe` from Linux (or vice versa) requires extra setup (Wine on Linux, or a Windows VM). The easiest approach is to build on the target OS.

---

### All Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Start in development mode with hot reload |
| `bun run build` | Compile TypeScript and bundle assets |
| `bun run preview` | Preview the compiled build without packaging |
| `bun run package` | Build + package for the **current** OS |
| `bun run package:win` | Build + package for **Windows** (portable + NSIS) |
| `bun run package:linux` | Build + package for **Linux** (AppImage + deb + rpm) |

---

## Where is my data?

All your data is stored as readable JSON files on your machine. No database, no encryption, no lock-in.

```
<data folder>/
  transactions.json
  categories.json
  accounts.json
  settings.json
  goals.json
  installments.json
  investments.json
```

**Default data folder locations:**

| OS | Default path |
|---|---|
| Windows | `%APPDATA%\finely` |
| Linux | `~/.config/finely` |

You can change this path any time in **Settings → Data Storage**.

### Sync across devices

Point the data folder to a cloud-synced folder:
1. Open **Settings → Data Storage → Change Folder**
2. Select your Dropbox / Google Drive / OneDrive folder
3. Install Finely on your other device and point it to the same synced folder

### Backup & Restore

- **Export:** Settings → Backup → Export ZIP — saves all your data in one file
- **Import:** Settings → Backup → Import ZIP — restores data from a backup on any machine

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Electron](https://www.electronjs.org/) 32 |
| UI framework | [React](https://react.dev/) 18 + TypeScript |
| Bundler | [electron-vite](https://electron-vite.org/) + Vite |
| Charts | [Recharts](https://recharts.org/) |
| Icons | [Lucide](https://lucide.dev/) |
| Package manager | [Bun](https://bun.sh/) |
| Installer builder | [electron-builder](https://www.electron.build/) |

---

## FAQ

**Does Finely send my data anywhere?**  
No. The app is fully offline. The only network request it makes is fetching live investment prices from Nobitex (only on the Investments page, and only if you use that feature).

**Can I use it without the Investments feature?**  
Yes. Investments are completely optional. Every other feature works with no internet connection at all.

**The app won't open on Windows (SmartScreen warning)?**  
Click **More info**, then **Run anyway**. This happens because the app isn't code-signed with a paid certificate. The source code is fully open — you can build it yourself if you prefer.

**Can I run it on macOS?**  
macOS is not officially supported yet (no macOS build target is configured), but you can run it in development mode with `bun run dev` on a Mac.

---

<div align="center">
Made with care by <a href="https://github.com/AmirAnsarpour">Amir Ansarpour</a>
</div>
