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
