# Roadmap

## Fase 0 — Setup (1–2 weken)

**Doel:** Fundament leggen zodat development snel kan starten.

### Deliverables
- [x] Projectstructuur en development omgeving opgezet
- [x] Database / storage keuze gemaakt en geconfigureerd (PostgreSQL + TimescaleDB via Docker)
- [x] Power BI test account en API toegang geregeld (PPU licentie, WNKDataConsultancy tenant)
- [x] Architectuur beslissingen gedocumenteerd
- [x] Tech stack bevestigd: Python/FastAPI, Next.js, PostgreSQL, APScheduler

---

## Fase 1 — Core MVP (6–10 weken)

**Doel:** Werkend product dat Power BI dataset health monitort en alerts verstuurt.

### Deliverables
- [x] Power BI connector: workspaces, datasets, reports en refresh history ophalen via API
- [x] Service principal authenticatie (OAuth client credentials via MSAL)
- [x] Detectie engine: refresh_failed, refresh_delayed, schema_change checks
- [x] Incident model: aanmaken, status bijhouden, deduplicatie
- [x] FastAPI backend: endpoints voor workspaces, datasets, health status, incidents
- [x] Frontend: pipeline-centric overzicht met health status (groen/geel/rood)
- [x] Frontend: pipeline detail met Runs en Incident tabs
- [x] Frontend: incidents overzicht pagina
- [x] Simulatie script voor lokaal testen van detectie scenarios
- [x] Deployed op pulse.wnkdata.nl met SSL en PM2
- [ ] Alert systeem: Slack en e-mail notificaties
- [ ] Root cause hints uitgebreid op detailpagina

### Succes criteria
- Detectie van gefaalde datasets binnen 5 minuten — gehaald (poll elke 5 minuten)
- Pipeline health overzicht laadt binnen 2 seconden — gehaald
- Werkend op productie URL — gehaald (pulse.wnkdata.nl)

---

## Fase 2 — Early feedback en verbeteringen (2–4 weken)

**Doel:** Product valideren bij early adopters en verfijnen op basis van feedback.

### Deliverables
- [ ] Alert systeem: Slack notificaties
- [ ] Alert systeem: e-mail via Resend
- [ ] Analysis tab: historische trends per pipeline
- [ ] Suggested Fix tab: concrete acties per incident type
- [ ] Incident resolven vanuit de UI
- [ ] Auto-refresh van de health status (polling zonder page reload)
- [ ] Gebruiker feedback verwerkt

---

## Fase 3 — Multi-tool en pipeline integratie (6–12 maanden)

**Doel:** Platform uitbreiden naar een volledig observability platform voor analytics.

### Deliverables
- [ ] Tableau connector
- [ ] Looker connector
- [ ] Pipeline observability: dbt integratie (model health, test results)
- [ ] Pipeline observability: Airflow integratie (DAG status)
- [ ] Pipeline observability: Snowflake/Postgres connector (schema changes aan brondatabase)
- [ ] Causale keten: bron → transformatie → BI → dashboard → business metric
- [ ] End-to-end impact visualisatie
- [ ] ML-gebaseerde anomaly detection voor metric waarden

---

## Toekomst (post fase 3)

- Self-healing suggesties (automatische fix proposals)
- Integratie met incident management tools (PagerDuty, Opsgenie)
- SLA monitoring per dashboard of business metric
- Multi-tenant SaaS aanbod
- Authenticatie en gebruikersbeheer
