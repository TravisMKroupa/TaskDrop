# TaskDrop — IIS Deployment Guide (taskdrop.live)

## Prerequisites

- Windows Server with IIS
- URL Rewrite Module
- Application Request Routing (ARR) with proxy enabled
- .NET 8 Hosting Bundle
- SQL Server (local or Azure SQL)
- SSL certificate for taskdrop.live

## DNS

Create an A record: `taskdrop.live` → your server public IP

## 1. Publish the API

```powershell
cd C:\Users\TravisKroupa\source\repos\TaskList
dotnet publish api\TaskDrop.Api\TaskDrop.Api.csproj -c Release -o C:\inetpub\taskdrop\api
```

Configure environment variables on the server (or `appsettings.Production.json`):

```
ConnectionStrings__Default=Server=YOUR_SQL;Database=TaskDrop;...
Stripe__SecretKey=sk_live_...
Stripe__WebhookSecret=whsec_...
Jwt__SigningKey=YOUR_32_CHAR_MIN_SIGNING_KEY
App__BaseUrl=https://taskdrop.live
App__PortalUrl=https://taskdrop.live
```

Run the API as a Windows Service or IIS application on port 5000:

```powershell
# Option A: Windows Service (recommended)
sc create TaskDropApi binPath="C:\inetpub\taskdrop\api\TaskDrop.Api.exe"
sc start TaskDropApi

# Option B: IIS in-process — create app pool (.NET CLR: No Managed Code) pointing to api folder
```

## 2. Build and deploy the portal

```powershell
npm run build --prefix portal
xcopy /E /Y portal\dist\* C:\inetpub\taskdrop\wwwroot\
copy deploy\web.config C:\inetpub\taskdrop\wwwroot\web.config
```

## 3. IIS site setup

1. Create site **taskdrop.live** pointing to `C:\inetpub\taskdrop\wwwroot`
2. Bind HTTPS on port 443 with your SSL cert
3. Enable ARR proxy: IIS Manager → Server → Application Request Routing → Server Proxy Settings → Enable proxy
4. Copy [deploy/web.config](web.config) — proxies `/api/*` and `/hubs/*` to `http://localhost:5000`

## 4. Download folder

```powershell
mkdir C:\inetpub\taskdrop\wwwroot\download
# After building desktop installer:
npm run publish:installer
xcopy /E /Y deploy\download\* C:\inetpub\taskdrop\wwwroot\download\
```

Installer URL: `https://taskdrop.live/download/TaskDrop-Setup.exe`

## 5. Stripe webhook

Point Stripe webhook to: `https://taskdrop.live/api/webhooks/stripe`

Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

## 6. Verify

- https://taskdrop.live — portal landing page
- https://taskdrop.live/api/health — API health check
- https://taskdrop.live/api/releases/latest — installer metadata
- Sign up → Stripe Checkout → team management → download desktop app

## Local development (full stack)

```powershell
npm install
npm install --prefix portal
npm run dev:all
```

- Portal: http://localhost:5174
- API: http://localhost:5000/swagger
- Desktop: Electron sidebar on port 5173

Set desktop `.env`:

```
TASKDROP_API_URL=http://localhost:5000/api
TASKDROP_PORTAL_URL=http://localhost:5174
```
