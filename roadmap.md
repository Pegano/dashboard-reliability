# Roadmap

## Product tiers

Pulse works across all Power BI licence types. Features are divided into three tiers that align with the customer's Power BI setup — and form a natural upsell path.

| Tier | Requires | What it unlocks |
|---|---|---|
| **Level 1 — Monitoring** | Any Power BI licence (Pro, PPU, Premium) | Refresh failures, delays, alerts, run history |
| **Level 2 — Smart monitoring** | Any Power BI licence | Anomaly detection, gateway patterns, dataset size growth, schedule changes |
| **Level 3 — Model intelligence** | Premium capacity or Fabric | Measure dependencies, column lineage, impact analysis, schema change noise reduction |

This is the upsell model: Level 1+2 solve a real problem for every Power BI customer. Level 3 is the upgrade for teams on Premium who want to understand *why* something broke, not just *that* it broke.

---

## Phase 0 — Setup ✅

**Goal:** Lay the foundation so development can start quickly.

- [x] Project structure and development environment set up
- [x] Database configured (PostgreSQL + TimescaleDB via Docker)
- [x] Power BI test account and API access arranged (PPU licence, WNKDataConsultancy tenant)
- [x] Architecture decisions documented
- [x] Tech stack confirmed: Python/FastAPI, Next.js, PostgreSQL, APScheduler

---

## Phase 1 — Core MVP ✅

**Goal:** Working Level 1 product that monitors Power BI model health and sends alerts.

- [x] Power BI connector: workspaces, datasets, reports and refresh history via API
- [x] Service principal authentication (OAuth client credentials via MSAL)
- [x] Detection engine: refresh_failed, refresh_delayed, schema_change checks
- [x] Incident model: create, track status, deduplication
- [x] FastAPI backend: endpoints for workspaces, datasets, reports, health status, incidents
- [x] Frontend: models overview with health status (green/yellow/red)
- [x] Frontend: model detail with Runs, Issues, Analysis, Fix tabs
- [x] Frontend: issues overview page
- [x] Simulation script for local testing of detection scenarios
- [x] Seed script for realistic demo data
- [x] Deployed on pulse.wnkdata.nl with SSL and PM2
- [x] Alert system: email via Resend
- [x] Alert system: Telegram
- [x] Alert system: generic webhook (Teams, Slack, etc.)
- [x] Affected reports shown per issue
- [x] UI fully in English

---

## Phase 2 — Depth and usability ✅

**Goal:** Make issues actionable. Understand impact, not just presence.

- [x] **Run history** — store full refresh history per model (not just last run)
- [x] **Auto-resolve** — automatically close issues when the check passes again
- [x] **Suppress** — silence a known issue for 24h; no alerts sent while suppressed; auto-resolve still works
- [x] **Impact score** — affected_reports count per incident via reports table
- [x] **Analysis tab** — summary cards (total runs, success rate, avg duration) + run dots per model
- [x] **Fix tab** — rule-based suggestions per active incident type
- [x] **Multiple workspaces** — workspace filter in models overview
- [x] **Auto-refresh** — router.refresh() every 60s; "Synced X min ago" indicator (no manual button — see Phase 5 for proper sync control)
- [x] **Fix tab** — data chain, error code hints, schedule warning, Power BI deeplinks (Fabric-compatible via webUrl)
- [x] **Incident → Fix navigation** — click incident card goes directly to its fix; tab switch clears focus
- [x] **Datasource + schedule sync** — gateway info, connection details, refresh schedule per dataset
- [x] **Schema sync via DAX** — COLUMNSTATISTICS() via executeQueries; no XMLA/Premium required
- [x] **Environment page** — totals, 24h refresh heatmap, volume over time, dataset→report mapping
- [x] **Anomaly detection foundation** — refresh_slow + dataset_growth checks; cardinality snapshots per sync cycle

---

## Phase 3 — Level 2: Smart monitoring

**Goal:** Detect degradation before it becomes a failure. Works with any Power BI licence.

- [ ] **Refresh duration anomaly** — alert when a refresh takes significantly longer than its historical average
- [ ] **Gateway failure detection** — distinguish gateway errors from dataset errors
- [ ] **Dataset size tracking** — store row counts / size over time, alert on unexpected growth or shrinkage
- [ ] **Schedule change detection** — alert when a refresh schedule is modified or disabled
- [ ] **Capacity throttling detection** — detect patterns consistent with capacity limits
- [ ] **Improved Analysis tab** — trend charts, failure frequency, duration over time (replaces current placeholder)
- [ ] **Improved Fix tab** — context-aware suggestions using Claude API (replaces rule-based placeholder)
- [ ] **On-demand refresh trigger** — trigger a Power BI dataset refresh directly from Pulse via the REST API (`POST /datasets/{id}/refreshes`); useful when a fix has been applied and you want to verify immediately without waiting for the next scheduled refresh
- [ ] **Duration scatter chart in Runs page** — per-model scatterplot (x = time, y = duration in seconds); dots colored by statistical distance from mean/median: blue = within 1–1.5σ, yellow = 1.5–2.5σ, red = outlier (>2.5σ); requires min ~10 runs per model for meaningful baseline. Render only when sufficient data available.
- [ ] **Performance per datasource** — aggregate run duration and failure rate per datasource type (PostgreSQL, File, etc.) and per server/connection; shows which data sources are slowest or most error-prone; data already available (datasources JSONB + run history); candidate for Admin or Environment page.

---

## Phase 4 — Level 3: Model intelligence

**Goal:** Understand *why* something broke. Requires Premium capacity or Microsoft Fabric.

*Prerequisites: start a Microsoft Fabric trial and assign the workspace to Premium capacity to enable XMLA endpoint access.*

- [ ] **XMLA connector** — connect via XMLA endpoint, read tabular model metadata (tables, columns, measures, relationships)
- [ ] **Column-to-report mapping** — which report uses which column (requires XMLA)
- [ ] **Schema change noise reduction** — only alert on columns actually used in reports
- [ ] **Measure dependency graph** — show what breaks when a column disappears
- [ ] **Model complexity score** — surface models that are hard to maintain
- [ ] **Root cause hints from model structure** — use model metadata to generate better fix suggestions

---

## Phase 5 — Product and go-to-market

**Goal:** Make Pulse a product others can adopt without friction.

### Authentication and access control
- [ ] **Login / identity** — user accounts with email + password or SSO (Azure AD / Google); no anonymous access in production
- [ ] **Roles** — at minimum: Admin (full access + settings) and Viewer (read-only); extendable per organisation
- [ ] **Session management** — JWT or server-side sessions, secure cookies

### Workspace and alert preferences
- [ ] **Workspace labels** — mark workspaces as dev / acc / prod (or custom label); visible throughout the UI
- [ ] **Alert preferences per user** — per user: which workspaces trigger alerts, which channels (email, Telegram, webhook); dev workspaces off by default
- [ ] **Alert preferences per workspace** — org-level setting: alerts on/off per workspace regardless of user preference
- [ ] **Configurable refresh rate** — admin can set poll interval (default 5 min) per organisation or workspace

### Filtering and navigation
Filters need to be consistent, predictable, and positioned at the right level — not bolted on per page.

Design principle: global filters (workspace, environment label) live in the **left sidebar**, below the navigation tabs — not in a top bar. This follows the pattern of tools like Linear and Notion: the sidebar is the persistent context layer. Local filters (status, severity) stay inline with the content they filter.

The sidebar filter section is context-aware:
- Workspace filter only shown when 2+ workspaces exist
- Environment label filter only shown when workspaces have been labelled (dev/acc/prod)
- At 10+ workspaces: searchable dropdown instead of radio list
- After login is implemented: filter state persisted per user, not just per session

- [ ] **Sidebar workspace filter** — radio list or dropdown in sidebar; replaces current button row in ModelsTable
- [ ] **Sidebar environment label filter** — filter by dev/acc/prod label across all pages
- [ ] **Filter state in URL** — workspace filter reflected in URL params so links are shareable and bookmarkable
- [ ] **Scalable workspace selector** — searchable dropdown for 10+ workspaces; shows label (dev/acc/prod) if set

### Onboarding and setup

Target flow: Signup → Connect Power BI → Select workspaces → Live → Dashboard (under 10 minutes, fully self-serve).

Implementation plan (10–14 days, revised based on architecture review):

**Step 1 — Auth (2 days)**
- [ ] `users` + `tenants` + `tenant_users` + `auth_tokens` DB models
- [ ] Magic link login (`/login`, `/auth/verify`) — no password for MVP
- [ ] JWT session cookie, 24h expiry for security
- [ ] Next.js middleware — protect all routes, redirect to `/login`
- [ ] `tenant.slug` for clean URLs (`pulse.wnkdata.nl/acme/...`)

**Step 2 — Power BI connection wizard (3 days)**
- [ ] **Delegated login first** (Microsoft OAuth) — lowest friction, no Azure app setup required
- [ ] **Service principal as second option** — for organisations; step-by-step instructions inline
- [ ] Connection test endpoint — verify credentials, return workspace list
- [ ] Workspace selection UI — checkboxes, dev/test first recommendation
- [ ] Credentials stored encrypted (Fernet/AES), encryption key in environment variable

**Step 3 — Tenant-aware monitoring (3 days)**
- [ ] `tenant_id` added to all existing tables (datasets, workspaces, incidents, runs)
- [ ] **Global scheduler** — one scheduler iterates `for tenant in tenants`, no per-tenant scheduler
- [ ] Per-tenant Power BI credentials loaded at sync time from encrypted store

**Step 4 — Post-onboarding experience (2 days)**
- [ ] "You're live" screen — "Pulse is monitoring X models" + last sync time
- [ ] **Test alert sent after onboarding** — email/webhook to confirm monitoring is working
- [ ] Invite flow — admin invites colleagues via email, role-based (admin/viewer)
- [ ] Role-based redirect: viewer → Dashboards tab, admin → Models tab

**Step 5 — Later**
- [ ] Microsoft OAuth as login option (replaces magic link for Microsoft-heavy orgs)
- [ ] Multi-tenant database isolation — separate DB per organisation (Scenario C)
- [ ] Pricing and billing — Level 1/2 base, Level 3 upsell

### Operational monitoring

Required before onboarding the first paying customer. Details in deployment-architecture.md.

- [x] **`/api/health` endpoint** — returns DB status + scheduler last run + scheduler_late flag
- [ ] **Uptime monitoring** — external ping on `/api/health` every 5 minutes (UptimeRobot or similar)
- [ ] **Scheduler heartbeat** — dead-man's-switch ping after each sync cycle (Healthchecks.io); alert if silent >10 min
- [ ] **Error tracking** — Sentry Python SDK in backend and scheduler; catches unhandled exceptions
- [ ] **Process monitoring** — PM2 auto-restart confirmed; PM2 Plus or equivalent for external alerting
- [ ] **Resource alerts** — disk, memory, CPU thresholds (add when server load warrants it)

### Deployment model: secure / on-premise

Some customers operate in environments where data cannot leave their network (government, finance, healthcare):

- [ ] **Self-hosted option** — Docker Compose or Helm chart, runs inside customer infrastructure
- [ ] **No external dependencies at runtime** — Power BI API calls stay within the tenant
- [ ] **Local data storage** — PostgreSQL on-premise, no telemetry sent to Pulse
- [ ] **Air-gapped support** — image-based install with offline license validation
- [ ] **SSO / Azure AD authentication** — login via customer's own identity provider
- [ ] **Audit log** — all actions logged locally for compliance

---

## Future

- dbt connector — same detection engine for dbt models
- Microsoft Fabric connector — pipelines, lakehouses, semantic models
- Tableau and Looker connectors
- Task list mode — prioritise and assign issues like a work queue
- SLA monitoring per report or business metric
- Integrations with incident management tools (PagerDuty, Opsgenie)
- End-to-end lineage: source → transformation → BI → business metric
