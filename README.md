<div align="center">

<img src="src/renderer/assets/finely.png" width="96" height="96" alt="Finely logo" style="border-radius: 22px" />

# Finely

**A beautiful, private personal finance tracker — no account, no cloud, no subscription.**

Track your income, expenses, investments, and accounts entirely offline.  
Your data is plain JSON files on your own machine. Nothing leaves your device.

[![Version](https://img.shields.io/badge/version-1.1.0-6c8ef5?style=flat-square)](https://github.com/AmirAnsarpour/finely-app)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=flat-square)](#build-from-source)
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
- **Transfer money between accounts** without it counting as income or expense
- Finely **blocks an expense or transfer** if the selected account doesn't have enough balance
- Transactions without an account are "unassigned" — they still count in your global balance

### 🖥️ System Tray
- Finely keeps running in the system tray when you close the window — it doesn't quit
- **Click** the tray icon for Quick Add — a small popup to log a transaction without opening the full app
- **Right-click** for the menu — Open App (as you left it) or Quit Finely
- Optionally show your total balance right on the tray icon — an always-visible label on macOS, a hover tooltip on Windows/Linux (off by default, toggle in Settings)

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

### 🤖 AI Insights (optional, bring your own key)
Everything here lives on its own **AI Insights** page and is completely off by default — nothing is sent anywhere until you add an API key in Settings.

- **Any provider** — OpenAI, Anthropic (Claude), Google (Gemini), or any OpenAI-compatible endpoint (Groq, local models, etc.). Finely auto-detects which models your key can access, so you pick from a dropdown instead of guessing model names
- **Monthly spending analysis** — a written breakdown of what's driving your spending and how to manage it better, rendered as formatted text (RTL-aware for Persian). Run it on demand or turn on automatic monthly analysis
- **Chat with your data** — ask free-form questions about your spending, streamed back token-by-token
- **Natural-language quick add** — type "20 bucks for lunch yesterday" and Finely fills in the amount, category, and date for you to review before saving
- **Smart category suggestions** — as you type a transaction note, get an AI-backed category suggestion when your own history doesn't have an obvious match
- **AI-suggested budgets** — one click to get suggested monthly budgets per category, with a review-and-apply step
- **Ask about a category** — drill into any category from the Reports page and ask the AI about it directly
- **Debt payoff strategy** (Installments) and **savings goal suggestions** (Goals)
- **Token usage log** — see how many tokens each feature has used over time (counts only, never a fabricated dollar estimate — pricing varies too much per model/provider to keep accurate)
- **Privacy by design:** only aggregated category totals are ever sent — never transaction notes, tags, or account names. The API key is encrypted with your OS keychain (Keychain / DPAPI / libsecret) and stored on your device only, never in the plain-JSON data folder. No official SDKs are bundled either — every provider is called over plain HTTPS, so nothing is hardcoded to one vendor

### 🔐 Data Encryption (optional)
- Lock your entire data folder with a passphrase — every JSON file is encrypted (AES-256-GCM, scrypt-derived key), so even a synced Dropbox/Drive folder is unreadable without it
- Off by default; turn it on any time from Settings or during first-run setup
- **Unlock with Touch ID** on macOS, or automatically once you're signed into your device on Windows/Linux — both optional, off by default, and toggled independently from encryption itself
- The passphrase is never stored anywhere. If you forget it, the data cannot be recovered — there's no reset

### ⚙️ Settings
- **First-run setup wizard:** currency, data folder location, and optional encryption — all in one guided flow
- **Themes:** Light, Dark, Deep Black, or match your system
- **Currency:** 20+ currencies with correct formatting
- **Calendar:** Gregorian or Jalali (Iranian / Shamsi) — the whole app switches
- **Week start day:** Sunday, Monday, or Saturday
- **Data folder:** change where your data is saved (e.g. point it at Dropbox)
- **Backup / Restore:** export everything as a ZIP, import it on any machine
- **Auto-update** (Windows portable build): checks GitHub releases and installs updates in place

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

#### macOS — build on a Mac

```bash
# Build the app, then package it
bun run package:mac
```

This produces two files per architecture in the `release/` folder:
- `Finely-x.x.x-x64.dmg` / `Finely-x.x.x-arm64.dmg` — disk image installer
- `Finely-x.x.x-x64-mac.zip` / `Finely-x.x.x-arm64-mac.zip` — zipped app bundle

#### Linux — build on a Linux machine

```bash
# Build the app, then package it
bun run package:linux
```

This produces three files in the `release/` folder:
- `Finely-x.x.x.AppImage` — universal, runs on any distro
- `Finely-x.x.x-amd64.deb` — for Debian / Ubuntu
- `Finely-x.x.x.x86_64.rpm` — for Fedora / openSUSE

> **Cross-compiling:** Building for one OS from another (e.g. a Windows `.exe` from Linux) requires extra setup (Wine on Linux, or a Windows VM) — and macOS builds can only be produced on a Mac. The easiest approach is to build on the target OS.

---

### All Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Start in development mode with hot reload |
| `bun run build` | Compile TypeScript and bundle assets |
| `bun run preview` | Preview the compiled build without packaging |
| `bun run package` | Build + package for the **current** OS |
| `bun run package:win` | Build + package for **Windows** (portable + NSIS) |
| `bun run package:mac` | Build + package for **macOS** (dmg + zip, Intel + Apple Silicon) |
| `bun run package:linux` | Build + package for **Linux** (AppImage + deb + rpm) |

---

## Where is my data?

All your data is stored as readable JSON files on your machine. No database, no lock-in — and no encryption unless you turn it on yourself in Settings.

```
<data folder>/
  transactions.json
  categories.json
  accounts.json
  settings.json
  goals.json
  installments.json
  investments.json
  analyses.json         # saved AI spending analyses (only if you've used AI Insights)
  ai-usage.json         # AI token usage log (only if you've used AI Insights)
  ai-chat.json          # AI chat history (only if you've used the Chat tab)
  .finely-vault.json    # present only if you've turned on Data Encryption
```

If Data Encryption is on, every file above except `.finely-vault.json` itself is stored as ciphertext rather than plain JSON — the app decrypts on the fly once you unlock it.

**Default data folder locations:**

| OS | Default path |
|---|---|
| Windows | `%APPDATA%\finely` |
| macOS | `~/Library/Application Support/finely` |
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
No, by default. The app is fully offline except for two opt-in features: fetching live investment prices from Nobitex (Investments page), and AI Insights, which — only if you add an API key — sends aggregated category totals (never transaction notes, tags, or account names) to the AI provider you choose.

**Can I use it without the Investments or AI Insights features?**  
Yes. Both are completely optional. Every other feature works with no internet connection at all.

**What happens if I forget my encryption passphrase?**  
Your data cannot be recovered. The passphrase is never stored anywhere — not even by Finely itself — so there's no reset or backdoor. Write it down somewhere safe if you turn encryption on.

**Is "Unlock with Touch ID" / automatic unlock actually secure?**  
It's a convenience trade-off, not a security upgrade over the passphrase. Enabling it wraps your encryption key with your OS's own secure storage (Keychain / DPAPI / libsecret), so anyone already signed into your device account could open your Finely data too — you're trading the second factor (the passphrase) for not having to type it every launch. It's off by default and fully optional; the passphrase field always works as a fallback even when it's on.

**The app won't open on Windows (SmartScreen warning)?**  
Click **More info**, then **Run anyway**. This happens because the app isn't code-signed with a paid certificate. The source code is fully open — you can build it yourself if you prefer.

**The app won't open on macOS ("unidentified developer")?**  
Right-click the app in Finder, choose **Open**, then confirm **Open** in the dialog. This happens for the same reason as the Windows warning above — the build isn't signed with a paid Apple Developer certificate yet.

---

<div align="center">
Made with care by <a href="https://github.com/AmirAnsarpour">Amir Ansarpour</a>
</div>
