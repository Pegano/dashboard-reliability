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
- [x] **Auto-refresh** — router.refresh() every 60s + manual ↻ button

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

- [ ] **One-click Power BI connect** — OAuth delegated flow, no manual app registration
- [ ] **Setup wizard** — guided UI for the service principal flow (interim)
- [ ] **Multi-tenant** — organisations, users, roles and access control
- [ ] **Admin controls** — per-organisation settings for suppress, alerts, thresholds
- [ ] **Self-serve onboarding** — sign up, connect, monitor in under 10 minutes
- [ ] **Pricing and billing** — Level 1/2 base, Level 3 upsell

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
