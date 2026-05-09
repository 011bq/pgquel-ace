<div align="center">
  <h1>PgQuel</h1>
  <p>A fast, open-source PostgreSQL desktop client built for developers.</p>
  <p>
    <a href="https://github.com/011bq/pgquel/releases"><img alt="Release" src="https://img.shields.io/github/v/release/011bq/pgquel?style=flat-square&color=6366f1" /></a>
    <img alt="License" src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
    <img alt="Platform" src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue?style=flat-square" />
    <img alt="Rust" src="https://img.shields.io/badge/backend-Rust-orange?style=flat-square" />
  </p>
</div>

---

PgQuel is a lightweight alternative to TablePlus and Postico. Native desktop app — no Electron, no Node.js server, no subscription fee.

## Features

- **SQL editor** — Monaco editor with syntax highlighting, auto-complete, multi-tab support
- **Schema explorer** — browse schemas, tables, columns, indexes, and foreign keys
- **Fast results** — virtualized table renders millions of rows without lag
- **Connection groups** — organize connections by environment, star favorites
- **Secure credentials** — passwords stored in OS keychain (macOS Keychain / Windows Credential Manager / Linux Secret Service), never in SQLite
- **Query history** — last 1000 queries automatically saved
- **CSV export** — export any result set to CSV
- **Command palette** — `Cmd+K` for instant navigation
- **Cross-platform** — macOS, Windows, Linux

## Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Editor | Monaco Editor |
| State | Zustand |
| Results table | TanStack Table + TanStack Virtual |
| Desktop shell | Tauri 2 |
| PostgreSQL | Rust `sqlx` |
| Local storage | Rust `rusqlite` (SQLite) |
| Credentials | Rust `keyring` (OS keychain) |

## Getting Started

### Prerequisites

**1. Rust**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

**2. System dependencies**

macOS:
```bash
xcode-select --install
```

Linux (Ubuntu / Debian):
```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

Windows: Install [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

**3. Node.js 18+**

**4. Clone and install**
```bash
git clone https://github.com/011bq/pgquel.git
cd pgquel
npm install
```

**5. App icons** (required before first build)
```bash
npx @tauri-apps/cli icon path/to/icon-1024x1024.png
```

### Development

```bash
npm run dev
```

Opens the native window with hot reload. Frontend-only (no Tauri window):
```bash
npm run dev:vite
```

### Build

```bash
npm run build
```

Installer output: `src-tauri/target/release/bundle/`

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+Enter` | Run query (or selected text) |
| `Cmd/Ctrl+K` | Command palette |
| `Cmd/Ctrl+T` | New query tab |
| `Cmd/Ctrl+S` | Save query |

## Architecture

```
pgquel/
├── src/                       # React + TypeScript frontend
│   ├── components/
│   │   ├── layout/            # AppLayout, Sidebar, BottomPanel
│   │   └── ui/                # Button, Input, CommandPalette
│   ├── features/
│   │   ├── connections/       # Connection form + list
│   │   ├── editor/            # Monaco SQL editor + tabs
│   │   ├── results/           # Virtualized results table
│   │   └── schema/            # Schema explorer tree
│   ├── hooks/                 # useConnection, useQuery
│   ├── store/                 # Zustand stores
│   ├── tauri/commands.ts      # Type-safe IPC wrappers
│   └── types/index.ts         # Shared TypeScript types
│
└── src-tauri/                 # Rust backend
    └── src/
        ├── commands/
        │   ├── connection.rs  # PG connect / test / credentials
        │   ├── query.rs       # Execute SQL, CSV export
        │   ├── schema.rs      # Schema / table / column introspection
        │   └── storage.rs     # SQLite: connections, history, prefs
        └── lib.rs             # Tauri builder + app state
```

## Contributing

Pull requests welcome. For large changes, open an issue first to discuss.

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Commit: `git commit -m 'feat: add your feature'`
4. Push: `git push origin feat/your-feature`
5. Open a Pull Request

## License

MIT — see [LICENSE](LICENSE).
