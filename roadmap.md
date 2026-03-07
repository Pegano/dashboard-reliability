# Roadmap

## Fase 0 — Setup (1–2 weken)

**Doel:** Fundament leggen zodat development snel kan starten.

### Deliverables
- [ ] Projectstructuur en development omgeving opgezet
- [ ] Database / storage keuze gemaakt en geconfigureerd
- [ ] Power BI test account en API toegang geregeld
- [ ] CI/CD pipeline basis opgezet
- [ ] Architectuur beslissingen gedocumenteerd

---

## Fase 1 — Core MVP (6–10 weken)

**Doel:** Werkend product dat Power BI dashboard health monitort en alerts verstuurt.

### Deliverables
- [ ] Power BI connector: dashboards, queries en datasets ophalen via API
- [ ] Detectie engine: query health checks, metric anomaly detection
- [ ] Alert systeem: Slack en e-mail notificaties
- [ ] Frontend: overzicht van dashboard health (groen/geel/rood)
- [ ] Basic root cause hints bij alerts
- [ ] Deploybaar op eigen infra of cloud

### Succes criteria
- Detectie van gefaalde queries binnen 5 minuten
- Minder dan 5% false positives op alerts
- Dashboard health overzicht laadt binnen 2 seconden

---

## Fase 2 — Early feedback en verbeteringen (2–4 weken)

**Doel:** Product valideren bij early adopters en verfijnen op basis van feedback.

### Deliverables
- [ ] Verbeterde alerts: minder ruis, betere context
- [ ] Metric trends visualiseren (historische grafieken)
- [ ] Root cause hints uitgebreid: schema changes, dataset staleness
- [ ] Gebruiker feedback verwerkt
- [ ] Performance optimalisaties

---

## Fase 3 — Multi-tool en pipeline integratie (6–12 maanden)

**Doel:** Platform uitbreiden naar een volledig observability platform voor analytics.

### Deliverables
- [ ] Tableau connector
- [ ] Looker connector
- [ ] Pipeline observability: dbt integratie (model health, test results)
- [ ] Pipeline observability: Airflow integratie (DAG status)
- [ ] Pipeline observability: Snowflake integratie (query performance)
- [ ] Lineage en schema change detection
- [ ] End-to-end impact visualisatie: pipeline → dataset → dashboard → business metric
- [ ] ML-gebaseerde anomaly detection

---

## Toekomst (post fase 3)

- Self-healing suggesties (automatische fix proposals)
- Integratie met incident management tools (PagerDuty, Opsgenie)
- SLA monitoring per dashboard of business metric
- Multi-tenant SaaS aanbod
