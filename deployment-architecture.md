# Pulse — Deployment & Multi-Tenant Architectuur

## Kernprobleem

Pulse heeft een bijzondere eigenschap ten opzichte van een standaard SaaS-app: elke klant heeft een eigen Azure AD tenant met eigen Power BI credentials. De scheduler pollt actief de Power BI REST API — dat is geen passieve webhook maar een proces dat draait met die credentials. Dit maakt architectuurkeuzes complexer dan bij een standaard web-app.

---

## Datahoeveelheid per klant

De data per klant is extreem klein:

| Tabel | Rijen/jaar (10 datasets) | Geschat |
|---|---|---|
| refresh_runs | ~14.600 | ~3 MB |
| incidents | ~50–200 | < 0.1 MB |
| schema_columns | ~1.000–2.000 (statisch) | < 0.5 MB |
| datasets / workspaces / reports | < 100 | < 0.1 MB |
| **Totaal** | | **< 5 MB/jaar** |

Dit heeft directe implicaties: er is geen technische reden om af te wijken van een eenvoudige PostgreSQL setup. SQLite is voor self-hosted een reële optie.

---

## Scenario's

### A — Centrale SaaS, row-level isolatie
Alle klanten in dezelfde DB, `tenant_id` kolom op elke tabel.

- **Isolatie:** Logisch. Één bug in een query-filter = data van andere klant zichtbaar.
- **Credentials:** In centrale DB, encrypted. Breach = alles gecompromitteerd.
- **Compliance:** Zwak. Niet verkoopbaar aan klanten met ISO 27001 / AVG-eisen.
- **Operationeel:** Simpelst. Één DB, één deployment.
- **Oordeel:** Te risicovol voor een product dat toegang heeft tot klantdata in Power BI.

---

### B — Centrale SaaS, PostgreSQL schema's per klant
Één DB, aparte schema's (`tenant_acme.datasets`, `tenant_xyz.datasets`).

- **Isolatie:** Beter te presenteren, maar in PostgreSQL geen echte security boundary.
- **Migrations:** Complex — Alembic vereist custom scripts per schema.
- **Oordeel:** Meer overhead dan A, niet proportioneel meer isolatie. Niet aanbevolen.

---

### C — Centrale SaaS, aparte database per klant ✅ aanbevolen korte termijn
Één server, elke klant een eigen PostgreSQL database. Een centrale `pulse_meta` DB registreert tenants en credentials.

- **Isolatie:** Fysiek op DB-niveau. Aantoonbaar bij audits.
- **Credentials:** In `pulse_meta` tabel, encrypted (bijv. Fernet). Breach van meta-DB is het kritieke risico — maar dit is beter beheersbaar dan alle data in één DB.
- **Compliance:** Goed. "Uw data staat in een aparte database" is een sterk verkoopargument.
- **Updates:** Triviaal — één deployment, alle klanten gelijktijdig.
- **Operationeel:** Elke nieuwe klant = nieuwe DB aanmaken + migration draaien. Automatable in een paar regels.
- **Schaalbaarheid:** PostgreSQL ondersteunt honderden databases per instantie. Bottleneck is de sequentiële scheduler bij >20 klanten (zie Fase 2 aanpak).
- **Aanpassingen in code:** Minimaal. Tenant-DB's zijn identiek aan de huidige structuur. Nieuw: `pulse_meta` DB, scheduler itereert over tenants, MSAL-factory per tenant i.p.v. globale singleton.
- **Kosten:** Één VPS (bestaande server), geen extra infra.

---

### D — Self-hosted per klant
Klant installeert Pulse zelf via Docker Compose.

- **Isolatie:** Maximaal. Credentials verlaten de klantomgeving nooit.
- **SQLite:** Reëel als embedded optie — data per klant is klein, geen concurrent writes tussen processen.
- **Compliance:** Uitstekend. Enige optie voor overheid, zorg, finance met strenge eisen.
- **Nadeel:** Versie-drift, geen telemetrie, support op oude versies, update-uitrol complex.
- **Oordeel:** Geschikt als aparte SKU ("Pulse On-Premises"), niet als primair model.

---

### E — Hybride: centrale frontend + lokale agent ✅ aanbevolen lange termijn / enterprise
Pulse-dashboard draait centraal. Een lichtgewicht agent draait bij de klant (of in hun Azure-tenant) en stuurt alleen events naar de centrale server — credentials verlaten de klantomgeving nooit.

```
[Klant Azure Tenant]
  Agent (Python, klein)
  ├── Heeft eigen client_id/secret lokaal
  ├── Pollt Power BI REST API
  └── Stuurt naar Pulse centraal:
        POST /api/ingest/runs
        POST /api/ingest/incidents
        (nooit raw credentials of ruwe data)

[Pulse Centrale Server]
  ├── Ontvangt en slaat events op
  ├── Genereert incidents
  └── Serveert dashboard aan gebruikers
```

- **Isolatie:** Sterk. Centrale server heeft alleen afgeleide events, geen Power BI credentials.
- **Compliance:** Uitstekend. "Uw Power BI credentials verlaten uw tenant nooit" — het sterkste verkoopargument voor enterprise.
- **Ontwikkeling:** Twee codebases (centrale server + agent), plus agent-distributie en update-mechanisme. Dit is de "zwaarste ontwikkeling" — niet technisch complex, maar operationeel (hoe rolt een klant de agent uit? hoe update je hem bij 50+ installaties?).
- **Schaalbaarheid:** Goed — centrale server ontvangt push events, hoeft niet zelf te pollen per klant.
- **Oordeel:** Ideale eindstaat voor enterprise tier. Te vroeg voor de eerste fase.

---

### F — Serverless (Vercel, Cloudflare Workers)
Niet geschikt. APScheduler is fundamenteel incompatibel met serverless — functions zijn stateless en kortlevend, een blocking scheduler die elke 5 minuten draait past daar niet in.

---

## Vergelijking

| Criterium | A | B | C | D | E |
|---|---|---|---|---|---|
| Data-isolatie | Logisch | Logisch+ | Fysiek (DB) | Maximaal | Centraal: events only |
| Compliance | Zwak | Matig | Goed | Uitstekend | Uitstekend |
| Credential risico | Hoog | Hoog | Matig | Laag (bij klant) | Minimaal |
| Operationele complexiteit | Laag | Matig | Matig | Hoog voor klant | Hoog (agent) |
| Update-uitrol | Triviaal | Triviaal | Triviaal | Complex | Matig |
| Time-to-market | Snel | Matig | Snel | Snel (al klaar) | Langzaam |
| Kosten | Laagst | Laag | Laag | Laagst voor WNK | Laag centraal |

---

## Aanbeveling

### Korte termijn — eerste 10–20 klanten: Scenario C

Concrete implementatie:
- `pulse_meta` database met tabel `tenants` (id, name, db_url, powerbi_tenant_id, powerbi_client_id, powerbi_client_secret_encrypted)
- Scheduler itereert over tenants, opent per tenant een gecachede SQLAlchemy engine
- `auth.py`: MSAL-factory per tenant i.p.v. globale singleton
- Eenvoudig intern admin-script om tenants toe te voegen

Geschatte ontwikkeltijd: 1–2 dagen.

### Fase 2 — 20–50 klanten: paralleliseer de scheduler

APScheduler is sequentieel — bij >20 klanten met elk meerdere workspaces wordt polling een bottleneck. Oplossing: `concurrent.futures.ThreadPoolExecutor` per tenant-cyclus, of vervang APScheduler door Celery + Redis.

### Lange termijn — 50+ klanten / enterprise deals: Scenario E als aparte tier

Introduceer de agent als "Pulse Enterprise" of "Pulse On-Premises Agent" SKU. De centrale DB-structuur van C is herbruikbaar — alleen de collector verandert van actieve polling naar passieve event-ontvangst.

**De keuze voor C nu sluit geen enkel later pad af.**
