# Doelgroep & Persona's

## Rollen in de markt

Binnen organisaties die met dataproducten werken bestaan veel verschillende rollen. Afhankelijk van de grootte van de organisatie zijn deze gecombineerd of gescheiden:

- Data Engineer
- Data Scientist
- Data Analist
- Data Beheerder
- Data Steward
- Data Verantwoordelijke
- IT Specialist
- Systeembeheer (bronsystemen)
- Dashboard Developer
- Consument van het dashboard (business)

---

## Waar de pijn wordt gevoeld

De pijn rondom datafailures wordt op meerdere plekken gevoeld, niet alleen bij de engineer:

| Rol | Hoe zij de pijn voelen |
|-----|------------------------|
| Dashboard Developer | Rapport toont geen data of verouderde cijfers |
| Data Beheerder | Schema veranderd, koppeling verbroken |
| Data Analist | Analyses kloppen niet, vertrouwen in data neemt af |
| Business consument | Rapport werkt niet, besluitvorming stagneert |
| Data Engineer | Refresh gefaald, foutmelding in pipeline |

---

## Primaire gebruiker van Pulse

**De operationele beheerder** — dit kan een Data Engineer, Data Beheerder of Dashboard Developer zijn afhankelijk van de organisatie. Dit is de persoon die:

- Verantwoordelijk is voor de beschikbaarheid van data en rapportages
- Het issue moet opsporen én oplossen
- Gebaat is bij snelle detectie, duidelijke oorzaak en directe actie

Pulse is voor hen een bewakingstool die hen ontlast: ze hoeven niet zelf te pollen of op klachten te wachten.

---

## Secundaire gebruiker

**De Data Verantwoordelijke of BI Manager** — verantwoordelijk voor de betrouwbaarheid richting de business. Gebruikt Pulse niet dagelijks operationeel, maar wil:

- Kunnen aantonen dat issues snel worden opgemerkt en opgelost
- Inzicht in terugkerende problemen per model of rapport
- Overzicht zonder technische diepgang

---

## Koper (beslisser)

**IT Manager / Head of Data** — keurt het budget goed. Wil:

- Risicobeheersing: minder afhankelijkheid van handmatig toezicht
- Aantoonbare SLA-verbetering
- Lage beheerlast na implementatie

---

## Navigatie-ingang per rol

Een belangrijk inzicht: **de eerste ingang verschilt per rol.**

| Rol | Denkt in | Verwachte eerste ingang |
|-----|----------|------------------------|
| Data Engineer | Datasets, refreshes, pipelines | Modellen-overzicht |
| Dashboard Developer | Rapporten, pagina's, visuals | Dashboards-overzicht |
| Data Beheerder | Schema's, koppelingen, bronnen | Modellen of Issues |
| Business consument | "Mijn rapport doet het niet" | Dashboards-overzicht |

---

## Drie ingangen, één databron

Pulse biedt drie tabs die elk een andere lens zijn op dezelfde onderliggende data:

1. **Modellen** — voor wie denkt in datasets en refreshes
2. **Issues** — voor wie direct naar actieve problemen wil
3. **Dashboards** *(gepland)* — voor wie denkt in rapporten en business-impact

Ontwerpprincipe: een incident in "Issues" is altijd terug te traceren naar een model in "Modellen" én een rapport in "Dashboards". De tabs zijn views, geen eilanden.

---

## Ontwerpkeuze: tabs vs. views binnen één tab

Gekozen voor **drie aparte tabs** (niet een view-switcher binnen één tab), omdat:

- Verschillende rollen hebben waarschijnlijk één dominante ingang — tabs maken dat zichtbaar in gebruik
- Pas na echte gebruiksdata is te bepalen welke ingang het meest wordt gebruikt
- Tabs houden de navigatiestructuur helder; een view-switcher werkt beter als de twee perspectieven voor dezelfde gebruiker gelijkwaardig zijn
