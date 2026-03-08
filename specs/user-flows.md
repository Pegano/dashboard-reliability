# User Flows — MVP Spec

Twee gebruikerstypen: **Data engineer / BI developer** en **Business user / manager**.
Platform: Power BI monitoring MVP.

---

## 1. Setup flow (eerste keer gebruiken)

### Stap 1 — Account aanmaken
Gebruiker maakt een account en workspace aan.

```
Create workspace
Workspace name: Marketing Analytics
Users: 3
```

### Stap 2 — Power BI koppelen
Koppeling via OAuth. De tool haalt automatisch op:
- Dashboards
- Datasets
- Queries
- Refresh schedules

```
Connect Power BI Workspace
Select workspace:
- Marketing Reports
- Sales Dashboards
- Finance BI
```

### Stap 3 — Monitoring instellen
Gebruiker kiest wat gemonitord wordt en waar alerts naartoe gaan.

```
Enable monitoring for:
✓ Query failures
✓ Dataset refresh failures
✓ Metric anomalies
✓ Schema changes

Send alerts to:
Slack #data-alerts
Email data-team@company.com
```

---

## 2. Dagelijks gebruik — Dashboard health overzicht

Hoofdscherm na inloggen. In één oogopslag de status van alle dashboards.

```
Workspace: Marketing Analytics

Dashboard Health
🟢 Sales Overview
🟢 Customer Funnel
🟡 Campaign Performance
🔴 Revenue Summary
```

| Status | Betekenis |
|---|---|
| Groen | OK |
| Geel | Warning |
| Rood | Incident detected |

Klik op een dashboard → detailpagina.

---

## 3. Incident scenario

**Situatie:** Revenue dashboard toont 0 omzet. Systeem detecteert sterke afwijking van historisch gedrag.

### Alert (Slack)

```
DATA ALERT

Dashboard: Revenue Summary
Metric: Daily Revenue

Expected range: €45k – €60k
Actual value: €0

Possible cause:
Dataset refresh failed

View incident →
```

---

## 4. Incident detailpagina

Engineer klikt op de alert en ziet de volledige context.

```
Incident #2841

Dashboard: Revenue Summary
Status: Critical
Detected: 07:52

Metric anomaly: Daily Revenue
Expected: €45k – €60k
Actual: €0
Deviation: -100%
```

---

## 5. Root cause hints

Systeem analyseert dataset refresh, query errors en schema changes.

```
Possible root causes

1. Dataset refresh failed
   Table: orders
   Last successful refresh: yesterday

2. Upstream table row count = 0
   orders table empty
```

---

## 6. Suggested actions

Concrete, uitvoerbare oplossingen — geen vaag advies.

```
Suggested actions

✓ Retry dataset refresh
✓ Check orders ingestion pipeline
✓ Validate orders table row count
```

---

## 7. Impact view

Direct inzicht in de breedte van het probleem.

```
Affected dashboards

Revenue Summary
Executive KPI Board
Marketing ROI
```

Engineer ziet in één oogopslag hoe groot het incident is voordat hij begint met debuggen.

---

## 8. Engineer workflow

Typische acties vanuit de incident pagina:
- Open dataset
- View query
- Retry refresh

Na fix:

```
Incident resolved
Revenue metrics back to normal
```

---

## 9. Business user experience

Vereenvoudigde interface — geen technische details, wel duidelijkheid.

```
Dashboard Reliability

Sales Overview: OK
Marketing Dashboard: OK
Revenue Dashboard: Incident
```

Klik op incident:

```
Issue detected
Revenue metric incorrect

Data team has been notified
Estimated resolution: in progress
```

Voorkomt dat managers beslissingen nemen op basis van incorrecte data.

---

## 10. Historische inzichten

Waarde voor management: betrouwbaarheid over tijd.

```
Last 30 days

Incidents: 5
Average resolution time: 18 min
Affected dashboards: 7
```

---

## MVP scope

### Must-have
- Power BI connector (OAuth, dashboards / datasets / queries / refresh schedules)
- Dashboard health overzicht (groen / geel / rood)
- Metric anomaly detection
- Query en dataset health checks
- Alerts via Slack en e-mail
- Incident detailpagina

### Nice-to-have
- Root cause hints
- Impact view (welke dashboards geraakt)

### Buiten scope (MVP)
- Lineage graphs
- AI root cause engine
- Multi BI tool support (Tableau, Looker)
- Pipeline monitoring (dbt, Airflow)
