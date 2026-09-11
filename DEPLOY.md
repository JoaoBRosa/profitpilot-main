# ProfitPilot — Deployment & Integration Guide

This walks through getting ProfitPilot live on the web and connected to your
Shopify stores and Google Ads accounts. It's written specifically from your
codebase (Next.js 16 + MongoDB, `vercel.json` cron jobs for `/api/cron/sync`
and `/api/cron/ads-sync`) — not a generic Next.js guide.

**Accounts you'll need before starting:** GitHub, Vercel, MongoDB Atlas,
Google Cloud Console + a Google Ads account, and access to your Shopify
Partner/Dev Dashboard for the stores you want to connect.

Nobody but you can complete the steps marked 🔑 — they require logging into
your own Google/Shopify/Vercel accounts and clicking "Allow"/"Install", which
isn't something that can be done from outside a live, authenticated browser
session.

---

## 1. Push the code to GitHub
Vercel deploys straight from a GitHub repo.
```
cd profitpilot-main
git init
git add .
git commit -m "Initial commit"
```
🔑 Create an empty repo on github.com (private, recommended — this code
references live business logic), then:
```
git remote add origin https://github.com/<you>/profitpilot.git
git push -u origin main
```

## 2. Create the database (MongoDB Atlas)
🔑 At mongodb.com/atlas: create a free/shared cluster → Database Access →
add a user with a password → Network Access → allow `0.0.0.0/0` (Vercel's
IPs aren't fixed) → Connect → "Drivers" → copy the connection string. That's
your `MONGODB_URI`.

## 3. Deploy on Vercel
🔑 vercel.com → New Project → import the GitHub repo. Vercel auto-detects
Next.js. **Before the first deploy finishes setting up**, add the environment
variables below (Project → Settings → Environment Variables) — the app
needs them to boot cleanly.

## 4. Set the core environment variables
A ready-to-fill `.env.example` is included alongside this file — copy its
values into Vercel. Two secrets are already generated for you in it:

- `ENCRYPTION_KEY` — encrypts every Shopify/ad-account credential stored in
  MongoDB (AES-256-GCM). Don't rotate it later; that would make existing
  stored credentials unreadable.
- `CRON_SECRET` — authenticates Vercel's own calls to `/api/cron/sync` and
  `/api/cron/ads-sync`.

Also set `MONGODB_URI` (step 2) and `APP_URL` / `NEXT_PUBLIC_APP_URL` to
your Vercel domain (e.g. `https://profitpilot.vercel.app`, or a custom
domain if you attach one). Redeploy after saving — Next.js bakes some env
vars in at build time.

## 5. Set up Google Ads API access (once, for the whole workspace)
🔑 This is a one-time setup that then works for every store:
1. console.cloud.google.com → new project → APIs & Services → Credentials →
   create an **OAuth 2.0 Client ID** (type: Web application). Add
   `https://<your-domain>/api/oauth/google/callback` as an authorized
   redirect URI. Copy the Client ID + Secret into `GOOGLE_ADS_CLIENT_ID` /
   `GOOGLE_ADS_CLIENT_SECRET`.
2. ads.google.com/aw/apicenter (any regular Google Ads account works, no
   MCC required to start) → generate a **developer token** →
   `GOOGLE_ADS_DEVELOPER_TOKEN`. A test-level token is enough to begin
   syncing your own accounts.
3. Redeploy on Vercel after adding these three variables. You can sanity-check
   the setup once logged into the live app at `/api/oauth/google/config`.

*(Optional, same idea: `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` +
`PROFIT_SHEET_TEMPLATE_ID` if you want ProfitPilot exporting straight into
the Google Sheets P&L template you're already using. Meta/TikTok follow the
same one-time pattern — see `app.md` → "Conexão de Contas de Ads".)*

## 6. Connect each Shopify store
🔑 Per your `app.md`, Shopify moved to Client Credentials Grant (no
end-user OAuth click-through needed since it's your own org's stores):
1. dev.shopify.com/dashboard → create one app, set the Admin API scopes you
   need (orders, products, etc.).
2. Install that app on each store (still your org) → Settings → Credentials
   → copy that store's **Client ID + Client secret**.
3. In the live ProfitPilot app → "Adicionar Loja" → paste the store's
   domain + Client ID + Client secret. Repeat for each of your stores —
   steps 2–3 only, once the app itself exists.

Webhooks (`orders/create`, `orders/updated`, `refunds/create`) register
themselves automatically per store as soon as `APP_URL` is set correctly.

## 7. Connect ad accounts per store
Once logged into the live app: `/anuncios?store=<store>` → tab **Contas
API** → "Ligar Google Ads" (or Meta/TikTok) → authorize → pick which ad
account to attach to that store. Repeat per store; each store's ad-account
tokens are independent.

---

### After this
- Manual full sync: `/lojas` → "Sincronizar agora" per store.
- Check sync health any time in Settings → each store shows last sync time
  and errors.
- Nothing above needs Redis/BullMQ/ClickHouse/Docker despite `app.md`'s
  architecture section — the shipped code runs sync entirely through Vercel
  Cron + MongoDB, so Atlas + Vercel is all the infra you need today.
