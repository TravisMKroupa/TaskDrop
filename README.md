# TaskDrop Platform

Multi-tenant SaaS task management: desktop sidebar + web portal + cloud API.

## Components

| Folder | Description |
|--------|-------------|
| `/` (root) | Electron desktop app |
| `api/` | ASP.NET Core 8 Web API |
| `portal/` | React web portal (signup, billing, team, download) |
| `deploy/` | IIS config and deployment guide |

## Quick start (local)

```powershell
# Install all dependencies
npm install
npm install --prefix portal

# Configure environment
copy .env.example .env

# Run full stack (API + portal + desktop)
npm run dev:all
```

Or run individually:

```powershell
npm run dev:api      # API on :5000
npm run dev:portal   # Portal on :5174
npm run dev          # Desktop Electron app
```

## Production deploy

See [deploy/DEPLOY.md](deploy/DEPLOY.md) for IIS setup on **taskdrop.live**.

## Features

- Organization signup with Stripe subscription billing
- Team management with roles (Owner, Admin, Manager, Member)
- Manager task delegation — members see and update manager's tasks
- Desktop app with cloud sync (SQLite offline cache + SignalR)
- OAuth2 PKCE login via browser (`taskdrop://` protocol)
- Windows installer pipeline

## Architecture

```
Desktop (Electron) ──► API (ASP.NET Core) ──► SQL Server
Portal (React)     ──►       ▲
                              │
                         Stripe Billing
```

Hosted behind IIS on taskdrop.live with ARR reverse proxy.
