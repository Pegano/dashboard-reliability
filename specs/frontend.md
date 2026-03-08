# Frontend Spec

## Design richting: Signal

- Dark theme (primary), light theme toggle (later)
- Brand kleur: teal `#00B4D8`
- Health kleuren: groen `#73BF69` / geel `#FADE2A` / rood `#F2495C` / grijs `#6E7180`
- Achtergrond: `#111217`, panels: `#181B1F`, borders: `#22262E`
- Font: Inter

## UX principes

- Direct zichtbaar na openen: health status van alle pipelines
- Progressive disclosure: elke laag onthult meer detail
- Niet te veel tegelijk: tabs scheiden informatie lagen
- Interactief: klikbaar door naar detail

## Navigatie structuur

```
Sidebar:
  Pipelines    ← hoofdpagina
  Incidents    ← alle actieve en historische incidents
  Settings     ← later
```

## Pipeline detail — tab structuur

```
/pipelines/{id}
  Runs         ← MVP: refresh history, success/fail per run
  Incident     ← MVP: actief incident met root cause hint
  Analysis     ← later: patronen, trends
  Suggested Fix ← later: concrete acties
```

## MVP pagina's (nu bouwen)

### 1. Pipelines overzicht (`/`)
- Lijst van alle pipelines (datasets)
- Per rij: naam, workspace, health status dot, laatste run tijd, actieve incidents
- Klikbaar naar detail

### 2. Pipeline detail (`/pipelines/[id]`)
- Header: naam, workspace, health status badge
- Tab: Runs — tabel van refresh history (tijd, duur, status)
- Tab: Incident — actief incident kaart met type, severity, root cause hint, detail
- Tabs Analysis en Suggested Fix: "Coming soon" placeholder

### 3. Incidents overzicht (`/incidents`)
- Lijst van alle actieve incidents
- Per rij: dashboard naam, type, severity, gedetecteerd om, root cause hint
- Klikbaar naar pipeline detail

## Buiten scope MVP frontend

- Authenticatie / login
- Settings pagina
- Notificatie configuratie UI
- Grafieken en sparklines
- Light mode
