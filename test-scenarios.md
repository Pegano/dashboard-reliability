# Pulse — Testscenario's

## Setup
- **Dataset:** Orderoverzicht
- **Workspace:** acc (`e09fc036-fbee-4810-9546-f40e6cf84763`)
- **Dataset ID:** `42962c98-0100-403a-8b99-5d00451d82c6`
- **Databron:** `db.wnkdata.nl:5432 / pulse_test` (PostgreSQL)
- **Tabellen:** orders (na herverbinding — customers/orders/products verwijderd, nieuwe structuur)

Handmatige refresh triggeren:
```bash
cd /home/dev/projects/Apps/dashboard-reliability
python3 backend/scripts/trigger_refresh.py
```

---

## Testscenario's

| # | Scenario | Wat we doen in de DB | Verwacht incident in Pulse | Verwacht auto-resolve | Status | Datum |
|---|----------|----------------------|----------------------------|-----------------------|--------|-------|
| 1 | Baseline — succesvolle refresh | Niets, gewone data | Geen incident | n.v.t. | ✅ geslaagd | 2026-03-10 |
| 2 | Refresh failure — credential error | Wachtwoord `powerbi_reader` tijdelijk wijzigen | `refresh_failed` (critical) | Ja, na herstel | ✅ geslaagd | 2026-03-10 |
| 3 | Refresh failure — verbinding verbroken | SSL uitzetten in postgres | `refresh_failed` (critical) | Ja, na herstel | ✅ geslaagd | 2026-03-10 |
| 4 | Schema change — kolom verwijderen | `ALTER TABLE orders DROP COLUMN amount` | `refresh_failed` met kolomnaam in hint (critical) | Ja, na herstel | ✅ geslaagd | 2026-03-10 |
| 5 | Schema change — kolom toevoegen | `ALTER TABLE customers ADD COLUMN loyalty_points INT` | Geen (nieuwe kolom is geen incident) | n.v.t. | ✅ geslaagd | 2026-03-10 |
| 6 | Schema change — kolom hernoemen | `ALTER TABLE products RENAME COLUMN stock_quantity TO qty_in_stock` | `refresh_failed` met kolomnaam in hint (critical) | Ja, na herstel | ✅ geslaagd | 2026-03-10 |
| 7 | Data type wijziging | `ALTER TABLE orders ALTER COLUMN order_id TYPE TEXT` | `schema_change` (warning of critical) | Ja, na herstel | ❌ niet gedetecteerd | 2026-03-10 |
| 8 | Lege tabel | `TRUNCATE orders` + refresh | Geen (volume-incident nog niet geïmplementeerd) | n.v.t. | ✅ geslaagd | 2026-03-10 |
| 9 | Meerdere schema changes tegelijk | Verwijder 3 kolommen in één keer | `refresh_failed` met eerste ontbrekende kolom in hint | Ja, na herstel | ⚠️ gedeeltelijk | 2026-03-10 |
| 10 | Suppress werkt correct | Incident suppreseren, daarna opnieuw refreshen | Geen nieuw incident tijdens suppressie | Vervalt na 24h | ✅ geslaagd | 2026-03-10 |

## Legenda
- ⬜ gepland
- 🔄 bezig
- ✅ geslaagd
- ❌ gefaald / onverwacht gedrag
- ⚠️ gedeeltelijk — gedrag klopt maar niet volledig

---

## Observaties
_(vrij notitieveld voor bevindingen per test)_

**Scenario 1 (2026-03-10):** Refresh succesvol getriggerd via API (202 Accepted). Scheduler was vastgelopen (max running instances) — na `pm2 restart pulse-scheduler` opgepikt binnen 20 seconden. Run verschijnt als `completed` in DB.

**Neveneffect bij scenario 1:** Bij herverbinding van de databron waren de tabellen customers/orders/products verwijderd. Pulse detecteerde dit terecht als `schema_change` (critical) — `ffcf5a39`. Detectie werkt correct voor massale kolomverwijdering.

**Scenario 4 (2026-03-10, verbeterd):** `amount` kolom verwijderd → Power BI refresh faalt → Pulse maakt `refresh_failed` (critical) aan. Na error-parsing verbetering: hint toont nu exact **"Column 'amount' not found in datasource — likely removed or renamed."** — kolomnaam geëxtraheerd uit `<oii>amount</oii>` in de Power BI error description. Auto-resolve werkt na herstel + succesvolle refresh.

**Scenario 6 (2026-03-10, verbeterd):** Zelfde mechanisme als scenario 4 — hint toont exact de hernoemde kolom. Auto-resolve werkt.

**Scenario 2 (2026-03-10):** Wachtwoord gewijzigd naar `wrongpassword` → Power BI gaf `ModelRefresh_ShortMessage_ProcessingError` → Pulse maakte `refresh_failed` (critical) aan. Na herstel wachtwoord (`PulseBI2026!`) en succesvolle refresh auto-resolved Pulse het incident automatisch. Complicatie: `scram-sha-256` authenticatie werkte niet extern voor Power BI — opgelost door `pg_hba.conf` op `md5` te zetten en wachtwoord als pre-computed md5 hash op te slaan.

**Scenario 10 (2026-03-10):** `refresh_failed` incident aangemaakt (amount kolom weg) → gesuppresst via POST `/api/incidents/{id}/suppress` → opnieuw refresh gefaald → Pulse maakt **geen** nieuw incident aan. Bestaand incident blijft `suppressed`. Suppress verloopt automatisch na 24h (tot 2026-03-11 20:51 UTC). Kolom hersteld.

**Scenario 9 (2026-03-10):** 3 kolommen tegelijk verwijderd (`amount`, `status`, `product_category`) → Power BI refresh faalt → Pulse maakt `refresh_failed` aan met hint **"Column 'amount' not found"**. Beperking: Power BI rapporteert maar **één** ontbrekende kolom per refresh-poging — de eerste die het tegenkomt. De andere 2 zijn pas zichtbaar na herstel van `amount` en een nieuwe gefaalde refresh. Dit is een Power BI-beperking, niet van Pulse. Kolommen hersteld.

**Scenario 8 (2026-03-10):** `TRUNCATE orders` → Power BI refresh slaagde (`completed`) → geen incident aangemaakt. Pulse detecteert lege tabellen bewust niet — volume-monitoring is niet geïmplementeerd. COLUMNSTATISTICS toont cardinality = 0, maar er is geen drempel ingesteld. Tabel hersteld met data voor volgende scenarios.

**Scenario 3 (2026-03-10):** SSL uitgeschakeld via `ALTER SYSTEM SET ssl = off` + `pg_reload_conf()` in de litellm_db container. Power BI refresh faalde met `"The PostgreSQL source doesn't support encrypted connections. (Source at db.wnkdata.nl;pulse_test.)"`. Pulse maakte `refresh_failed` (critical) aan. SSL hersteld (`ssl = on`), incident auto-resolved na herstelrefresh. Complicatie: `ALTER SYSTEM` kon niet binnen een transaction block — opgelost door buiten psql-transactie uit te voeren via `docker exec bash -c`. Tweede complicatie: twee uvicorn-processen actief (oude van Mar09 + nieuwe) — oude gekild zodat nieuwe code actief werd.

**Scenario 7 (2026-03-10):** `order_id TYPE TEXT` — Power BI refresh slaagde (`completed`). Pulse maakte **geen** incident aan. Twee redenen: (1) detectie keek alleen naar verdwenen kolommen — **opgelost** door `previous_data_type` tracking toe te voegen; (2) Power BI's type-inferentie via COLUMNSTATISTICS `[Min]` ziet `TEXT` nog steeds als `int` (waarde is numeriek) → type-wijziging niet zichtbaar via deze API. Fundamentele beperking: COLUMNSTATISTICS geeft geen expliciete data types terug, alleen min/max waarden. Detectie van type-wijzigingen die PBI transparant absorbeert is niet mogelijk zonder XMLA. Kolom hersteld naar `INTEGER`.

