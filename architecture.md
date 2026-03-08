# Architectuur

> Bijgewerkt na technical spike (8 maart 2026). Stack keuzes zijn bevestigd.

---

## Systeemoverzicht (MVP)

```
[Power BI API]
      |
      v
[Scheduler Process]   <-- losse process, pollt elke 5 minuten
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
[Alert  [PostgreSQL + TimescaleDB]  <-- health history, metrics, events, configuratie
Service]
   |
   v
[Slack / E-mail]

[FastAPI]   <-- REST API voor frontend en externe integraties
   |
   v
[Next.js frontend]  <-- health overzicht, incidents, root cause hints
```

---

## Procesmodel

Twee losstaande processen — bewust gescheiden:

| Process | Verantwoordelijkheid |
|---|---|
| **API server** (FastAPI) | Serveert data naar frontend, verwerkt configuratie wijzigingen |
| **Scheduler** (APScheduler) | Pollt Power BI API, draait detectie, verstuurt alerts |

Waarom gescheiden: de scheduler hoeft niet te weten van de frontend. Debuggen, herstarten en schalen kan per process onafhankelijk. Deployment via Docker Compose met twee services.

---

## Componenten

### Connector Service
- Haalt data op via Power BI REST API als service principal (OAuth client credentials flow)
- Modulair: elke externe tool (Power BI, later Tableau, dbt) heeft een eigen connector module
- Polling interval: elke 5 minuten (configureerbaar)
- Bewezen in spike: workspaces, datasets, reports, refresh history werken

### Detectie Engine
- Verwerkt ruwe connector data naar health signals
- Drie lagen:
  - **Layer 1** — dataset checks: refresh failures, refresh delays, schema changes
  - **Layer 2** — query checks: error rate, timeouts (via activity logs, nice-to-have MVP)
  - **Layer 3** — metric checks: anomaly detection op waarden (vereist XMLA/DAX, post-MVP)
- Statistische anomaly detection: 7-daags gemiddelde ± 3σ, harde drop > 50%, zero check
- Geen ML voor MVP — iteratief tunen op false positive rate

### Alert Service
- Verstuurt notificaties via Slack en e-mail
- Deduplicatie: zelfde incident triggert geen tweede alert binnen 1 uur
- Drempelwaarden configureerbaar per dashboard of workspace

### Data Store
- PostgreSQL als primaire database
- TimescaleDB extensie voor de metrics tabel (tijdreeksqueries)
- Slaat op: health history, incidents, metric waarden, alerts, configuratie

### FastAPI (backend API)
- REST API voor frontend
- Serveert health statussen, incidents, root cause hints
- Beheert configuratie (workspaces, alert kanalen, drempelwaarden)

### Next.js frontend
- Dashboard health overzicht (groen/geel/rood)
- Incident detailpagina met root cause hints en impact view
- Historische trends per dashboard
- Business user view (vereenvoudigd)

---

## Tech stack (bevestigd)

| Component | Keuze | Reden |
|---|---|---|
| Backend API | Python + FastAPI | Sterk ecosysteem voor data integraties, msal/pandas/scipy beschikbaar |
| Scheduler | APScheduler (los process) | Lichtgewicht, geen externe broker nodig voor MVP |
| Database | PostgreSQL + TimescaleDB | Relationeel + efficiënte tijdreeksqueries, één stack |
| Frontend | Next.js + Tailwind | SSR voor snelle initiële load, ingebouwde API routes |
| Auth naar Power BI | MSAL (service principal) | Bewezen in spike, werkt zonder gebruikersinteractie |
| Alerts | Slack SDK + Resend | Eenvoudig te integreren, lage overhead |
| Hosting | Hetzner VPS + Docker Compose | Goedkoop, volledig in beheer, eenvoudig te deployen |

---

## Spike resultaten (8 maart 2026)

Uitgevoerd tegen workspace `dev` in tenant `WNKDataConsultancy.onmicrosoft.com`.

| Test | Resultaat |
|---|---|
| OAuth token ophalen via service principal | Geslaagd |
| Workspaces ophalen | Geslaagd — 1 workspace gevonden |
| Datasets ophalen | Geslaagd — Sales dataset gevonden |
| Reports ophalen | Geslaagd — Sales report gevonden |
| Refresh history ophalen | Leeg — workspace heeft nog geen scheduled refresh gehad |
| DAX/XMLA metric waarden | Niet getest — geparkeerd voor post-MVP |

**Conclusie:** Layer 1 is technisch bewezen. Geen blockers gevonden voor het MVP.

---

## Connector roadmap — fase 1 naar fase 3

Elke connector is onafhankelijk maar schrijft naar dezelfde genormaliseerde database. De detectie engine en frontend weten niet welke connector de data heeft geproduceerd.

### Fase 1 — BI laag (nu)
```
[Power BI API] → [powerbi connector] → [database]
```
Detecteert: refresh failures, schema changes, dataset staleness.

### Fase 3 — Volledige keten
```
[Postgres/Snowflake] → [db connector]      ↘
[dbt]                → [dbt connector]      → [database] → [detectie] → [causale keten]
[Airflow]            → [airflow connector]  ↗
[Power BI]           → [powerbi connector] ↗
```

Detecteert: waar in de keten het mis ging — bron, transformatie, of BI laag.

**Causale keten voorbeeld:**
```
Postgres kolom hernoemd (14:32)
  → dbt model gefaald (15:00)
    → Power BI refresh gefaald (15:05)
      → 3 dashboards geraakt
        → business metric incorrect
```

Elke connector is afzonderlijk waardevol. Teams nemen de connectors af die passen bij hun stack.

---

## Architectuurprincipes

- **Modulair:** elke connector en elk detectie-algoritme is onafhankelijk uitbreidbaar
- **Event-driven:** health changes worden als events opgeslagen, niet overschreven
- **API-first:** frontend en externe systemen communiceren via de FastAPI laag
- **Config as data:** drempelwaarden, kanalen en regels zijn instelbaar zonder code changes
- **Twee processen:** API server en scheduler zijn gescheiden — onafhankelijk te beheren
- **Connector-agnostisch:** detectie engine en frontend weten niet welke bron de data levert
