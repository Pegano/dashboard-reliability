# Strategie

## Positionering

Een Datadog / Sentry-achtig platform voor analytics en BI: observability voor de data stack, met de nadruk op **actiegericht inzicht** in plaats van alleen monitoring.

### Onderscheidend vermogen
- Niet alleen detecteren, maar ook **oorzaak en oplossing** aangeven
- Focus op de **business impact**: welke dashboards en beslissingen worden geraakt?
- Lage instapdrempel: begin met Power BI, geen zware integraties nodig

---

## Aanpak

### Begin klein en tastbaar
- Power BI MVP: te testen met eigen rapportages, geen klantdata nodig om te starten
- Snel feedback loop: binnen weken een werkend product
- Aantoonbare waarde: minder firefighting, snellere MTTR

### Valideer vroeg
- MVP bij early adopters (data engineers, BI leads) neerzetten
- Leren: welke alerts zijn het meest waardevol? Welke root cause hints helpen echt?
- Verkoopbaarheid testen: wat is de bereidheid om te betalen?

### Bouw modulair
- Elke tool (Power BI, Tableau, dbt) is een losse module
- Detectie-regels en ML-modellen zijn uitbreidbaar zonder herarchitectuur
- Multi-tenant SaaS is een latere stap, maar de architectuur moet het toelaten

---

## Focus op AI-resistente features

Generatieve AI maakt simpele dashboards en rapporten gemakkelijker te bouwen, maar maakt **observability en root cause analyse complexer** — er zijn meer systemen, meer dynamiek, meer interacties.

Daarmee worden de volgende features juist waardevoller:
- Root cause analyse over meerdere systemen heen
- Impact mapping: wat gaat er kapot als X faalt?
- Historische trending en patroonherkenning
- Geautomatiseerde fix suggesties

---

## Doelgroepen

| Segment | Pijn | Waarde |
|---|---|---|
| Data engineers | Uren kwijt aan debuggen pipeline issues | Snelle root cause, minder firefighting |
| BI developers | Niet weten of dashboards correct zijn | Health overzicht, proactieve alerts |
| Data managers / leads | Geen zicht op team reliability | SLA's, historische trends, rapportage |
| CDO / VP Data | ROI van data stack onduidelijk | Incident impact, kosten van downtime |

---

## Risico's en mitigatie

| Risico | Mitigatie |
|---|---|
| Power BI API beperkingen | Vroeg valideren in Fase 0, alternatieve data-extractie methoden onderzoeken |
| Alert fatigue bij gebruikers | Slimme deduplicatie, drempelwaarden configureerbaar maken |
| Concurrentie van grote vendors | Focus op snelheid, eenvoud en root cause kwaliteit |
| Te brede scope | Strict MVP-scope bewaken: feature requests parkeren voor Fase 2+ |
