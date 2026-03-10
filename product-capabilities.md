# Pulse — Productcapabiliteiten

*Wat er staat, gebouwd en getest. Basis voor de propositie.*

---

## Wat Pulse doet

Pulse monitort Power BI-omgevingen continu en geeft bij problemen direct antwoord op drie vragen:

1. **Wat is er mis?** — gedetecteerd incident met ernst en tijdstip
2. **Wat heeft het impact?** — welke rapporten worden geraakt
3. **Hoe los ik het op?** — databronnen, foutcode uitleg, directe link naar Power BI

---

## Functionaliteiten

### Monitoring & detectie
- **Refresh mislukt** — melding zodra een dataset-refresh faalt, inclusief de Power BI-foutcode (bijv. `CredentialsExpired`, `GatewayTimeout`, `DataSourceError`)
- **Kolomnaam in foutmelding** — bij een refresh-fout die veroorzaakt wordt door een ontbrekende of hernoemde kolom, toont Pulse direct de naam van die kolom in de hint (geëxtraheerd uit de Power BI error description)
- **Refresh vertraagd** — melding als een dataset langer dan 24 uur niet is ververst
- **Schema-wijziging** — melding als kolommen verdwijnen uit een dataset (via COLUMNSTATISTICS DAX — werkt zonder XMLA/Premium)
- Detectie draait na elke sync-cyclus, volledig automatisch

### Incidentbeheer
- Incidenten worden automatisch aangemaakt én automatisch gesloten zodra de oorzaak is opgelost
- Status: actief / onderdrukt / opgelost — altijd zichtbaar, ook historisch
- **Suppress 24h** — incident tijdelijk dempen (bijv. geplande downtime), alerts pauzeren automatisch mee
- Ernst-indeling: kritiek (rood) / waarschuwing (geel)

### Impact-inzicht
- Per incident: welke rapporten zijn geraakt (met directe links naar Power BI)
- Aantal getroffen rapporten zichtbaar in het incidentenoverzicht

### Fix-tab: oorzaak én oplossing op één plek
- **Data chain** — volledige keten van bronnen naar model, inclusief gateway-informatie
- **Foutcode-uitleg** — vertaling van technische Power BI-foutcodes naar begrijpelijke tekst
- **Schedule-waarschuwing** — melding als het refresh-schema uitgeschakeld staat
- **Directe deeplinks** naar dataset-instellingen in Power BI (werkt ook in Fabric-workspaces)
- **Gateway-instellingen link** als het model via een on-premises gateway loopt

### Navigatie & workflow
- Klik op een incident → ga direct naar de bijbehorende fix
- Wissel van tabblad → filter wordt automatisch gewist
- Incidentenlijst toont actieve, onderdrukte én opgeloste incidenten

### Analyse
- Overzicht per model: totaal runs, slagingspercentage, gemiddelde duur, aantal fouten
- Run-historiek als visuele tijdlijn (kleur = status, hoogte = duur)
- Weekelijks faalpercentage (laatste 4 weken)
- Duurtrend per dag (laatste 14 dagen)

### Alerts
- **E-mail** via Resend (DNS geverifieerd op pulse.wnkdata.nl)
- **Telegram** — directe melding op telefoon
- Eén alert per nieuw incident, niet bij onderdrukte incidenten

### Multi-workspace
- Meerdere Power BI-workspaces naast elkaar gemonitord
- Workspace-filter in het modeloverzicht (verschijnt automatisch bij 2+ workspaces)

### Auto-refresh
- Dashboard ververst automatisch elke 60 seconden — geen handmatige actie nodig

---

## Technische reikwijdte

- Werkt met alle standaard Power BI-datasets (geen Premium of XMLA vereist)
- Schema-sync via DAX executeQueries (COLUMNSTATISTICS) — breed ondersteund
- Datasource-informatie en refresh-schema worden per sync-cyclus opgehaald
- Deeplinks via Power BI API `webUrl` — compatibel met zowel klassieke als Fabric-workspaces

---

## Detectie-architectuur & beperkingen

### Hoe schema-detectie werkt

Pulse gebruikt twee lagen:

1. **Na een succesvolle refresh** — COLUMNSTATISTICS() geeft de actuele kolomstructuur van het Power BI-model terug. Pulse vergelijkt dit met de vorige sync en detecteert verdwenen kolommen.
2. **Bij een gefaalde refresh** — de Power BI error description bevat vaak de kolomnaam die het probleem veroorzaakt (formaat: `<oii>kolomnaam</oii>`). Pulse parseert dit en toont de kolomnaam direct in het incident.

### Huidige beperking: data type wijzigingen

Pulse detecteert **niet** wanneer alleen het data type van een kolom wijzigt (bijv. `INTEGER → TEXT`), tenzij die wijziging de refresh doet falen:

- **Incompatibele type change** (bijv. tekst in een numerieke kolom): refresh faalt → Pulse meldt `refresh_failed` met de kolomnaam in de hint ✅
- **Compatibele type change** (bijv. `INTEGER → TEXT` met numerieke waarden): Power BI absorbeert dit transparant, refresh slaagt → Pulse detecteert niets ❌

De reden: COLUMNSTATISTICS() geeft geen expliciete data types terug — alleen min/max waarden waaruit het type wordt afgeleid. Bij numerieke tekst ziet Pulse het type nog steeds als `int`.

### Architectuurroute: proactieve bronmetadata-vergelijking

De fundamentele oplossing is **niet wachten tot de refresh faalt**, maar de bronmetadata direct uitlezen en vergelijken met het Power BI-model:

| Stap | Wat | Hoe |
|---|---|---|
| 1 | Bronschema ophalen | Direct verbinding met de datasource (PostgreSQL `information_schema`, SQL Server `sys.columns`, etc.) |
| 2 | Model verwacht schema | COLUMNSTATISTICS() na succesvolle refresh — kolommen + afgeleid type |
| 3 | Vergelijken | Kolom aanwezig in bron maar niet in model → nieuwe kolom. Kolom in model maar niet in bron → verwijderd. Type afwijkend → type-wijziging |
| 4 | Proactief melden | Incident *voor* de volgende refresh — niet pas als die faalt |

**Vereisten:**
- Verbinding met de datasource vanuit de Pulse-omgeving (directe DB-toegang of via gateway-connector)
- Per datasource-type een connector implementeren (PostgreSQL, SQL Server, Snowflake, etc.)
- Credentials voor de bron (apart van de Power BI credentials)

**Waarde:**
- Type-wijzigingen detecteerbaar vóór de refresh
- Proactieve waarschuwing: "Kolom `amount` bestaat niet meer in de bron — volgende refresh zal falen"
- Niet afhankelijk van het al-dan-niet falen van Power BI

Dit is een bewuste keuze voor een volgende fase. De huidige error-parsing dekt de meeste praktijkgevallen al af zonder extra datasource-verbindingen.

---

## Tiers (concept)

| | **Pulse Standard** | **Pulse Enterprise** |
|---|---|---|
| Hosting | Centraal (pulse.wnkdata.nl) | Lokale agent in klant-tenant |
| Power BI credentials | Beheerd door WNK, encrypted opgeslagen | Blijven altijd in de klantomgeving |
| Data-isolatie | Aparte database per klant | Maximaal — centrale server ziet alleen events |
| Compliance | Goed (ISO 27001 acceptabel) | Uitstekend (overheid, zorg, finance) |
| Updates | Automatisch | Via agent-update mechanisme |
| Prijs | Standaard | Hoger — gerechtvaardigd door isolatie-garantie |

---

## Nog niet gebouwd (korte termijn roadmap)

- Onboarding — zelf workspace toevoegen zonder servertoegang
- Multi-tenant infrastructuur (Scenario C: aparte DB per klant)
- Alert bij auto-resolve
- Meer foutcode-vertalingen (bijv. `ModelRefreshDisabled_CredentialNotSpecified`)
- Tableau / andere BI-tools
