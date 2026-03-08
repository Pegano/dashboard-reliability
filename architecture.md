# Architectuur

> Bijgewerkt na fase 1 MVP oplevering (8 maart 2026). Stack bevestigd en live.

---

## Systeemoverzicht (MVP)

```
[Power BI API]
      |
      v
[Scheduler Process]   <-- APScheduler, pollt elke 5 minuten
      |
      v
[Connector Service]   <-- haalt workspaces, datasets, refresh history, reports op
      |
      v
[Detectie Engine]     <-- analyseert health, detecteert anomalies
      |
   +--+--+
   |     |
   v     v
[Alert  [PostgreSQL + TimescaleDB]  <-- health history, incidents, events, configuratie
Service]
   |
   v
[Slack / E-mail]      <-- fase 2

[FastAPI]             <-- REST API voor frontend en externe integraties
   |
   v
[Next.js frontend]    <-- pipeline health overzicht, incidents, root cause hints
```

---

## Procesmodel

Drie losstaande processen — bewust gescheiden:

| Process | Verantwoordelijkheid | Status |
|---|---|---|
| **API server** (FastAPI) | Serveert data naar frontend | Live op pulse-api.wnkdata.nl |
| **Scheduler** (APScheduler) | Pollt Power BI API, draait detectie | Live, elke 5 minuten |
| **Frontend** (Next.js) | UI voor engineers en business users | Live op pulse.wnkdata.nl |

Beheerd via PM2. Deploy via ./deploy.sh.

---

## Componenten

### Connector Service
- Haalt data op via Power BI REST API als service principal (OAuth client credentials flow)
- Modulair: elke externe tool (Power BI, later Tableau, dbt) heeft een eigen connector module
- Polling interval: elke 5 minuten (configureerbaar via POLL_INTERVAL_MINUTES)
- Bewezen in spike: workspaces, datasets, reports, refresh history werken
- Tabellen endpoint (schema): werkt alleen voor Push datasets, niet voor geüploade Excel/CSV

### Detectie Engine
- Verwerkt ruwe connector data naar health signals
- Drie lagen:
  - Layer 1 — dataset checks: refresh failures, refresh delays, schema changes — geimplementeerd
  - Layer 2 — query checks: error rate, timeouts (via activity logs) — fase 2
  - Layer 3 — metric checks: anomaly detection op waarden (vereist XMLA/DAX) — fase 3
- Deduplicatie: zelfde incident type triggert geen nieuw incident als er al een actief is

### Alert Service
- Verstuurt notificaties via Slack en e-mail — fase 2
- Deduplicatie: zelfde incident triggert geen tweede alert binnen 1 uur

### Data Store
- PostgreSQL als primaire database (draait in Docker op poort 5433)
- TimescaleDB extensie beschikbaar voor toekomstige tijdreeksqueries
- Tabellen: workspaces, datasets, reports, dataset_columns, incidents, alerts

### FastAPI (backend API)
- Endpoints: /api/workspaces/, /api/datasets/, /api/datasets/{id}/health, /api/incidents/
- Incident resolven: POST /api/incidents/{id}/resolve

### Next.js frontend
- Pipeline-centric navigatie: Pipelines overzicht > Pipeline detail > Incidents
- Pipeline detail tabs: Runs, Incident (actief), Analysis (fase 2), Suggested Fix (fase 2)
- Design: Signal — dark theme, teal accent, groen/geel/rood health kleuren
- Productie build via next start, beheerd via PM2

---

## Deployment (productie)

| Component | URL | Poort | Process |
|---|---|---|---|
| Frontend | pulse.wnkdata.nl | 4173 | PM2: pulse-frontend |
| API | pulse-api.wnkdata.nl | 8000 | PM2: pulse-api |
| Scheduler | — | — | PM2: pulse-scheduler |
| Database | localhost | 5433 | Docker: docker-db-1 |

Nginx: reverse proxy met SSL (Let's Encrypt) voor beide subdomeinen.
Deploy: ./deploy.sh — build, restart, git push in één stap.

---

## Tech stack (bevestigd)

| Component | Keuze | Reden |
|---|---|---|
| Backend API | Python + FastAPI | Sterk ecosysteem voor data integraties, msal/pandas/scipy beschikbaar |
| Scheduler | APScheduler (los process) | Lichtgewicht, geen externe broker nodig voor MVP |
| Database | PostgreSQL + TimescaleDB | Relationeel + efficiënte tijdreeksqueries, één stack |
| Frontend | Next.js + Tailwind | SSR voor snelle initiële load, productie build via next start |
| Auth naar Power BI | MSAL (service principal) | Bewezen in spike, werkt zonder gebruikersinteractie |
| Alerts | Slack SDK + Resend | Eenvoudig te integreren — fase 2 |
| Hosting | VPS + Nginx + PM2 | Goedkoop, volledig in beheer, eenvoudig te beheren |

---

## Spike resultaten (8 maart 2026)

Uitgevoerd tegen workspace dev in tenant WNKDataConsultancy.onmicrosoft.com.

| Test | Resultaat |
|---|---|
| OAuth token ophalen via service principal | Geslaagd |
| Workspaces ophalen | Geslaagd — 1 workspace gevonden |
| Datasets ophalen | Geslaagd — Sales dataset gevonden |
| Reports ophalen | Geslaagd — Sales report gevonden |
| Refresh history ophalen | Leeg — workspace heeft nog geen scheduled refresh gehad |
| Schema tabellen ophalen | 404 — werkt alleen voor Push datasets |
| DAX/XMLA metric waarden | Niet getest — geparkeerd voor fase 3 |
| Detectie scenarios (simulate.py) | Alle drie geslaagd: refresh_failed, refresh_delayed, schema_change |

---

## Connector roadmap — fase 1 naar fase 3

Elke connector schrijft naar dezelfde genormaliseerde database. De detectie engine en frontend weten niet welke connector de data heeft geproduceerd.

### Fase 1 — BI laag (nu)

[Power BI API] > [powerbi connector] > [database]

Detecteert: refresh failures, schema changes, dataset staleness.

### Fase 3 — Volledige keten

[Postgres/Snowflake] > [db connector]
[dbt]                > [dbt connector]      > [database] > [detectie] > [causale keten]
[Airflow]            > [airflow connector]
[Power BI]           > [powerbi connector]

Causale keten voorbeeld:
Postgres kolom hernoemd (14:32)
  > dbt model gefaald (15:00)
    > Power BI refresh gefaald (15:05)
      > 3 dashboards geraakt
        > business metric incorrect

---

## Architectuurprincipes

- Modulair: elke connector en elk detectie-algoritme is onafhankelijk uitbreidbaar
- Event-driven: health changes worden als events opgeslagen, niet overschreven
- API-first: frontend en externe systemen communiceren via de FastAPI laag
- Config as data: drempelwaarden, kanalen en regels zijn instelbaar zonder code changes
- Drie processen: API server, scheduler en frontend zijn gescheiden — onafhankelijk te beheren
- Connector-agnostisch: detectie engine en frontend weten niet welke bron de data levert
- Progressive disclosure: UI toont minimale info, meer detail op aanvraag per tab
