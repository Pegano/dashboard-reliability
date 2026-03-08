#!/bin/bash
set -e

echo "==> Build frontend..."
cd /home/dev/projects/Apps/dashboard-reliability/frontend
npm run build

echo "==> Herstart frontend..."
pm2 restart pulse-frontend

echo "==> Commit en push naar GitHub..."
cd /home/dev/projects/Apps/dashboard-reliability
git add -A
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M')" || echo "Niets te committen."
git push

echo "==> Done. Pulse is live op https://pulse.wnkdata.nl"
