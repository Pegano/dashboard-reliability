# Pijnpunten

## Overzicht

BI dashboards en datapipelines zijn kritieke bedrijfsinfrastructuur. Wanneer ze falen, heeft dat directe impact op besluitvorming, vertrouwen in data en engineering productiviteit.

---

## Pijnpunt 1: Dashboard fouten

**Context:**
BI dashboards (Power BI, Tableau, Looker) bevatten soms incorrecte metrics door mislukte queries, schema changes of dataset issues.

**Impact:**
- Business decisions worden genomen op basis van onjuiste of verouderde data
- Verlies van vertrouwen in dashboards en data teams
- Uren besteed aan handmatige verificatie van cijfers

---

## Pijnpunt 2: Ontbreken van root cause informatie

**Context:**
Bij een incident is het vaak onduidelijk waar het probleem vandaan komt. Engineers moeten zelf logs, queries en lineage onderzoeken.

**Impact:**
- Mean Time To Resolution (MTTR) is hoog
- Kennis is verspreid over meerdere systemen en personen
- Junior engineers kunnen niet zelfstandig debuggen

---

## Pijnpunt 3: Pipeline impact onbekend

**Context:**
Pipeline issues hebben downstream impact op meerdere dashboards. Teams missen zicht op welke dashboards beinvloed worden.

**Impact:**
- Incidenten worden onderschat in scope
- Stakeholders worden te laat of niet geinformeerd
- Geen prioritering mogelijk: welk dashboard is het meest kritiek?

---

## Pijnpunt 4: Tijdverlies en hoge kosten

**Context:**
Teams besteden uren aan firefighting en handmatig debuggen, waardoor de ROI van data- en BI-tools vermindert.

**Impact:**
- Engineers doen reactief werk in plaats van proactief bouwen
- Hoge opportunity cost: wat had er gebouwd kunnen worden?
- Moeilijk te rechtvaardigen investeringen in data infrastructure
