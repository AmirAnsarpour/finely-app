# Finely

A personal income & expense tracker built with Electron, React, and TypeScript. Data is stored as plain JSON files on your machine — no accounts, no cloud, no subscriptions.

## Features

**Dashboard**
- Monthly income, expenses, net balance, and savings rate with month-over-month comparison
- 6-month income vs. expenses bar chart
- Budget progress tracker (per-category spending limits)
- Last 10 transactions at a glance

**Transactions**
- Add, edit inline, and delete transactions
- Filter by type (income/expense), category, date range, and keyword search
- Grouped by date with Today/Yesterday labels
- Export to CSV

**Reports**
- Full monthly breakdown across the last 12 months
- Category pie chart and daily spending chart
- Month-over-month deltas for every metric
- Export selected month to CSV

**Categories**
- Custom income and expense categories with colors and icons
- Optional monthly budget per category

**Settings**
- Themes: Light, Dark, Black, System
- Multi-currency support
- Choose your own data folder — point it at a Dropbox or Google Drive folder to sync across devices
- Backup and restore via ZIP export/import

## Tech Stack

- [Electron](https://www.electronjs.org/) — desktop shell
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) — UI
- [electron-vite](https://electron-vite.org/) — build tooling
- [Recharts](https://recharts.org/) — charts
- [Bun](https://bun.sh/) — package manager & runtime
- [electron-builder](https://www.electron.build/) — packaging & distribution

## Development

**Prerequisites:** [Bun](https://bun.sh/) installed.

```bash
bun install
bun run dev
```

Other scripts:

| Command | Description |
|---|---|
| `bun run build` | Compile renderer + main with electron-vite |
| `bun run preview` | Preview the production build |
| `bun run package` | Build + package for the current OS |
| `bun run package:win` | Build + package for Windows |
| `bun run package:mac` | Build + package for macOS |
| `bun run package:linux` | Build + package for Linux |

Packaged output lands in `release/`.

## Download

Pre-built installers are attached to every [GitHub Release](https://github.com/AmirAnsarpour/finely-app/releases).

| Platform | Format |
|---|---|
| Windows | NSIS installer (`.exe`), MSI (`.msi`), Portable (`.exe`) |
| macOS | Disk image (`.dmg`), Installer package (`.pkg`) |
| Linux | AppImage, `.deb`, `.rpm`, Snap, `.tar.gz` |

## Data Storage

All data is stored as human-readable JSON files:

```
<data folder>/
  transactions.json
  categories.json
  settings.json
```

The default data folder is inside the app's user-data directory. You can change it in **Settings → Data Storage** to any folder you like — including a cloud-synced folder for multi-device access.

## Building from Source

```bash
git clone https://github.com/AmirAnsarpour/finely-app.git
cd finely-app
bun install
bun run package        # current OS
bun run package:win    # Windows (cross-compile from any OS)
bun run package:linux  # Linux (cross-compile from any OS)
# macOS builds must run on a macOS machine
```

## License

MIT © 2026 Amir Ansarpour
