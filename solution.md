# Oplossing

## Kernprincipe

De echte waarde zit niet alleen in detectie, maar in **oplossing aandragen**: duidelijk aangeven wat er mis is en hoe het te verhelpen.

---

## Core MVP — Fase 1: Power BI

### Detectie van problemen
- Mislukte queries signaleren
- Ontbrekende of verouderde data detecteren
- Metric anomalies opsporen (afwijkingen t.o.v. historische baseline)

### Alerts en notificaties
- Slack notificaties bij afwijkingen
- E-mail alerts voor kritieke issues
- Configureerbare drempelwaarden per dashboard of metric

### Dashboard health overzicht
- Overzicht van alle dashboards met health status: groen / geel / rood
- Historische trend van health per dashboard
- Filterbaar op team, domein of prioriteit

### Suggested fixes / root cause hints
- Korte indicatie van oorzaak, bijv.:
  - "Dataset niet geupdate sinds 48 uur"
  - "Schema veranderd: kolom `revenue_net` ontbreekt"
  - "Query time-out: gemiddelde duur 3x hoger dan normaal"
- Directe link naar het betrokken dataset, rapport of pipeline stap

---

## Uitbreiding — Fase 2+

### Andere BI tools
- Tableau connector
- Looker connector
- Generieke REST/metadata API integratie

### Dashboard impact mapping
- Welk pipeline incident beinvloedt welke dashboards?
- Visuele impact tree: pipeline → dataset → rapport → business metric

### Diepere root cause analyse
- Schema change detection via lineage integratie
- Column-level impact tracing
- Historische vergelijking van query plans

### Pipeline observability
- Integratie met dbt (model health, test failures)
- Integratie met Airflow (DAG status, task failures)
- Integratie met Snowflake (query performance, warehouse credits)
- ML-gebaseerde anomaly detection voor metrics
