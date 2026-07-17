# Florist Studio v3.4

Florist Studio is a responsive, installable florist workspace created by Eternal Blooms. It combines day-to-day business tools with private Supabase account sync while remaining usable locally when offline.

## Included

- Dashboard, pricing, orders, inventory, expenses and calendar
- Wedding and event planning workspace
- Customers, invoices, suppliers and ideas
- Bloom Club digital loyalty cards
- Customer inspiration and inventory images
- GDPR-oriented Privacy Centre with export and erasure tools
- Email/password authentication and per-user workspace sync with Supabase
- Installable PWA for desktop, iPad and phone

## Quick start

1. Upload the complete folder to a static host such as GitHub Pages, Netlify or Cloudflare Pages.
2. In Supabase, open **SQL Editor → New query**.
3. Paste and run `supabase-setup.sql` once.
4. Open **Authentication → Sign In / Providers** and keep email sign-ups enabled.
5. Open Florist Studio → **Privacy Centre**, create an account or sign in.
6. Select **Upload this device** to create the first cloud workspace.

## Supabase security

The browser contains only the project URL and public anon key. Access to `workspace_snapshots` is restricted through authentication and Row Level Security. Never add a service-role key, database password or JWT secret to this repository.

## Local development

Serve the folder over HTTP rather than opening `index.html` directly. For example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Release notes

See `CHANGELOG.md`. The invoice generator and established invoice template remain unchanged from the reliable v2.7 core.
