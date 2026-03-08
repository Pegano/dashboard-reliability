"""
Technical spike — Power BI API verbinding valideren.

Wat dit script test:
1. OAuth token ophalen via service principal
2. Workspaces ophalen
3. Datasets ophalen per workspace
4. Refresh history ophalen per dataset
5. Reports ophalen per workspace
"""

import json
from powerbi_client import get_workspaces, get_datasets, get_refresh_history, get_reports


def print_section(title: str):
    print(f"\n{'=' * 50}")
    print(f"  {title}")
    print(f"{'=' * 50}")


def run():
    print_section("Spike 1 — Workspaces ophalen")
    workspaces = get_workspaces()
    print(f"Gevonden: {len(workspaces)} workspace(s)")
    for ws in workspaces:
        print(f"  - {ws['name']} (id: {ws['id']})")

    if not workspaces:
        print("Geen workspaces gevonden. Controleer API permissions en admin consent.")
        return

    for workspace in workspaces:
        ws_id = workspace["id"]
        ws_name = workspace["name"]

        print_section(f"Spike 2 — Datasets in '{ws_name}'")
        datasets = get_datasets(ws_id)
        print(f"Gevonden: {len(datasets)} dataset(s)")
        for ds in datasets:
            print(f"  - {ds['name']} (id: {ds['id']})")

            print_section(f"Spike 3 — Refresh history voor '{ds['name']}'")
            try:
                history = get_refresh_history(ws_id, ds["id"])
                if not history:
                    print("  Geen refresh history beschikbaar.")
                for entry in history[:3]:
                    status = entry.get("status", "unknown")
                    start = entry.get("startTime", "?")
                    print(f"  - Status: {status} | Start: {start}")
            except Exception as e:
                print(f"  Refresh history niet beschikbaar: {e}")

        print_section(f"Spike 4 — Reports in '{ws_name}'")
        reports = get_reports(ws_id)
        print(f"Gevonden: {len(reports)} report(s)")
        for report in reports:
            print(f"  - {report['name']} (id: {report['id']})")


if __name__ == "__main__":
    run()
