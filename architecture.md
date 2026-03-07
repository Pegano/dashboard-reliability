# Architectuur

> Dit document wordt uitgebouwd naarmate technische keuzes worden gemaakt. Startpunt is het MVP (Power BI, Fase 1).

---

## Systeemoverzicht (MVP)

```
[Power BI API]
      |
      v
[Connector Service]   <-- pollt periodiek dashboards, datasets, queries
      |
      v
[Detectie Engine]     <-- analyseert health, detecteert anomalies
      |
   +--+--+
   |     |
   v     v
[Alert  [Data Store]  <-- slaat health history, metrics, events op
Service]
   |
   v
[Slack / E-mail]

[Frontend]  <-- leest uit Data Store, toont health overzicht
```

---

## Componenten

### Connector Service
- Verantwoordelijk voor het ophalen van data via externe APIs (Power BI, later Tableau, dbt, etc.)
- Modulair opgezet: elke tool heeft een eigen connector module
- Scheduled polling of webhook-gebaseerd (afhankelijk van API mogelijkheden)

### Detectie Engine
- Verwerkt ruwe data naar health signals
- Regels: query failures, dataset staleness, metric afwijkingen
- Later uitbreidbaar met ML-modellen

### Alert Service
- Verstuurt notificaties via Slack en e-mail
- Configurable: drempelwaarden, ontvangers, kanalen per dashboard of team
- Deduplicatie: voorkomt alert fatigue

### Data Store
- Slaat op: health history, events, metrics, configuratie
- Keuze: nader te bepalen in Fase 0 (PostgreSQL of tijdreeksdatabase zoals TimescaleDB)

### Frontend
- Dashboard health overzicht (groen/geel/rood)
- Historische trends
- Root cause hints per incident

---

## Tech stack (te bevestigen in Fase 0)

| Laag | Kandidaten |
|---|---|
| Backend | Python (FastAPI) of Node.js (Fastify) |
| Detectie | Python (pandas, scipy voor anomaly detection) |
| Database | PostgreSQL + TimescaleDB, of ClickHouse |
| Frontend | React + Tailwind, of Next.js |
| Alerts | Slack SDK, SendGrid of Resend |
| Hosting | Docker-gebaseerd, deploybaar op eigen infra of cloud |

---

## Architectuurprincipes

- **Modulair:** elke connector en elk detectie-algoritme is onafhankelijk uitbreidbaar
- **Event-driven:** health changes worden als events opgeslagen, niet overschreven
- **API-first:** frontend en externe systemen communiceren via een interne REST of GraphQL API
- **Config as data:** drempelwaarden, kanalen en regels zijn instelbaar zonder code changes
