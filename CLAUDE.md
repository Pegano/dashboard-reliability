# Claude — sessiestart instructies

Lees bij het begin van elke sessie de volgende bestanden, in deze volgorde:

1. `README.md` — projectoverzicht en documentatiestructuur
2. `AGENT.md` — mijn rol, perspectief en principes in dit project
3. `roadmap.md` — fase-status en prioriteiten (welke fases zijn af, wat is next)
4. `strategy.md` — go-to-market en strategische aanpak
5. `specs/technical-architecture.md` — architectuurkeuzes en tech stack

Lees daarnaast altijd het geheugenbestand:
- `/home/dev/.claude/projects/-home-dev-projects/memory/MEMORY.md` — persistente projectkennis (wordt automatisch geladen)

Bij frontend-gerelateerde taken, lees ook:
- `specs/frontend.md`
- `specs/user-flows.md`

## Werkwijze

- Na elke frontend code-wijziging: `cd frontend && npm run build` gevolgd door `pm2 restart pulse-frontend` — altijd, zonder te vragen
- Backend venv: `/backend/.venv/bin/python3`
- DB migraties: handmatig uitvoeren via SQLAlchemy `text()`
