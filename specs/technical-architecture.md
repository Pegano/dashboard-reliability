# Technische Architectuur — MVP

## Wat we uit de Power BI API kunnen halen

### Layer 1 — Dataset metadata (geen premium vereist)
Via standaard REST API:

```
GET /workspaces
GET /datasets
GET /reports
GET /dashboards
GET /datasets/{datasetId}/refreshes
GET /datasets/{datasetId}/tables
```

Detecteert:
- Refresh failures en delays
- Schema changes (kolommen toegevoegd/verwijderd)
- Dataset staleness

### Layer 2 — Query monitoring (via activity logs)
Via Microsoft 365 audit logs:
- Query errors
- Query timeouts
- Report views

**Let op:** Vereist admin consent op tenant niveau — IT-afdeling moet toestemming geven.
Voor MVP: nice-to-have, niet must-have.

### Layer 3 — Metric waarden (premium of workaround vereist)
Via XMLA endpoint (DAX queries):

```dax
EVALUATE
SUMMARIZECOLUMNS(
    'Date'[Date],
    "Revenue", [Total Revenue]
)
```

**Kritische beperking:** XMLA vereist Power BI Premium (~€4.995/maand per capacity).
Veel mkb-bedrijven en kleinere teams hebben dit niet.

**Alternatief zonder premium:**
- Push metrics vanuit de bron (bijv. Snowflake, SQL) rechtstreeks naar onze tool
- Gebruiker configureert zelf welke waarden gemonitord worden
- Minder automagisch, maar werkt voor iedereen

---

## Architectuurcomponenten

### Component 1 — Connector Service
Haalt Power BI metadata op via REST API.

- Sync: workspaces, dashboards, datasets, refresh history, schema
- Interval: elke 5 minuten
- Tech: Python, httpx, OAuth 2.0

### Component 2 — Metric Collector
Haalt metric waarden op voor anomaly detection.

- Via XMLA/DAX als beschikbaar (Premium)
- Via push API als fallback (gebruiker stuurt zelf data)
- Slaat op: timestamp, metric naam, waarde, dashboard referentie

### Component 3 — Monitoring Engine
Voert drie typen checks uit:

**Dataset checks:**
- Refresh failed
- Refresh delayed (ouder dan verwacht interval)
- Schema change (kolom verdwenen of gewijzigd)

**Query checks:**
- Query error rate
- Query timeout

**Metric checks:**
- Anomaly detection op metric waarden

### Component 4 — Anomaly Detection
MVP: statistisch, geen ML.

```
Afwijking = waarde buiten (7-daags gemiddelde ± 3σ)
Harde drop = waarde > 50% lager dan gisteren
Zero check = waarde = 0 terwijl historisch > 0
```

Tuning is iteratief — false positive rate is de belangrijkste KPI hier.

### Component 5 — Alert System
Bij incident:
1. Incident aanmaken in database
2. Slack notificatie versturen
3. E-mail versturen

Deduplicatie: zelfde incident triggert geen tweede alert binnen 1 uur.

### Component 6 — Frontend
- Dashboard health overzicht (groen/geel/rood)
- Incident detailpagina met root cause hints
- Impact view (welke dashboards geraakt)
- Business user view (vereenvoudigd)

---

## Root cause hints — regel-gebaseerd (geen AI)

Combinaties van signalen leiden tot een hint:

| Signaal 1 | Signaal 2 | Hint |
|---|---|---|
| Metric anomaly | Dataset refresh failed | "Dataset niet geüpdatet — mogelijk oorzaak" |
| Metric anomaly | Table rowcount = 0 | "Upstream tabel leeg — ingestion pipeline controleren" |
| Metric anomaly | Schema change detected | "Kolom gewijzigd of verwijderd in dataset" |
| Refresh failed | Service exception in logs | "Power BI service fout — exception details beschikbaar" |

---

## Data model (vereenvoudigd)

```
workspaces        { id, name, synced_at }
dashboards        { id, workspace_id, name, dataset_id }
datasets          { id, name, last_refresh_at, refresh_status }
dataset_schema    { id, dataset_id, table_name, column_name, data_type, seen_at }
metrics           { id, dashboard_id, metric_name, timestamp, value }
incidents         { id, dashboard_id, metric_id, detected_at, status, root_cause_hint }
alerts_sent       { id, incident_id, channel, sent_at }
```

---

## Tech stack

| Component | Keuze | Reden |
|---|---|---|
| Backend API | Python + FastAPI | Snel, async, goed voor data integraties |
| Scheduled jobs | APScheduler (ingebouwd) | Geen extra broker nodig voor MVP — Celery is over-engineered |
| Database | PostgreSQL | Relationeel, betrouwbaar, goed genoeg voor MVP |
| Metric opslag | PostgreSQL (timeseries tabel) | Voldoende voor MVP, later migreerbaar naar TimescaleDB |
| Frontend | Next.js + Tailwind | Snel te bouwen, goed te hosten |
| Hosting | VPS (bijv. Hetzner) | Goedkoop, volledig in beheer |
| Alerts | Slack SDK + Resend (e-mail) | Eenvoudig te integreren |

---

## Technical spike — Week 0 (validatie voor productie-code)

Bewijs dat de drie lagen werken voordat je iets bouwt.

**Doel:** binnen 1 weekend aantonen dat het product technisch haalbaar is.

### Spike 1 — Power BI REST API verbinding
- [ ] OAuth 2.0 token ophalen (client credentials of authorization code flow)
- [ ] Workspaces en datasets ophalen
- [ ] Refresh history ophalen van een dataset

### Spike 2 — Schema monitoring
- [ ] Tabellen en kolommen ophalen via API
- [ ] Schema snapshot opslaan
- [ ] Verschil detecteren bij tweede run

### Spike 3 — Metric waarden (bepaal haalbaarheid)
- [ ] Testen of XMLA beschikbaar is in test workspace
- [ ] DAX query uitvoeren en resultaat opslaan
- [ ] Als XMLA niet beschikbaar: alternatieve aanpak uitwerken

### Spike 4 — Eerste anomaly check
- [ ] Metric opslaan over meerdere runs
- [ ] Eenvoudige afwijkingscheck uitvoeren
- [ ] Resultaat loggen

**Succes criteria spike:** alle vier stappen werken → door naar productie-code.

---

## Openstaande risico's

| Risico | Impact | Aanpak |
|---|---|---|
| XMLA niet beschikbaar zonder Premium | Hoog — raakt metric monitoring | Push API als fallback, of scope MVP tot layer 1+2 |
| Activity logs vereisen tenant admin | Middel — raakt query monitoring | Buiten MVP scope plaatsen |
| Anomaly detection te veel false positives | Hoog — alert fatigue | Drempelwaarden configureerbaar maken, iteratief tunen |
| OAuth scope onderhandeling bij enterprise | Middel — raakt sales cycle | Minimale scopes documenteren, principe of least privilege |
