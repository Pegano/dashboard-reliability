#!/usr/bin/env python3
"""
Trigger een handmatige refresh van Orderoverzicht in de acc workspace.
Gebruik: python3 backend/scripts/trigger_refresh.py
"""
import os, sys, requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "../../backend/.env"))

TENANT_ID  = os.environ["POWERBI_TENANT_ID"]
CLIENT_ID  = os.environ["POWERBI_CLIENT_ID"]
CLIENT_SECRET = os.environ["POWERBI_CLIENT_SECRET"]

WORKSPACE_ID = "e09fc036-fbee-4810-9546-f40e6cf84763"  # acc
DATASET_ID   = "42962c98-0100-403a-8b99-5d00451d82c6"  # Orderoverzicht

def get_token():
    r = requests.post(
        f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token",
        data={
            "grant_type": "client_credentials",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "scope": "https://analysis.windows.net/powerbi/api/.default",
        },
    )
    r.raise_for_status()
    return r.json()["access_token"]

def trigger_refresh(token):
    r = requests.post(
        f"https://api.powerbi.com/v1.0/myorg/groups/{WORKSPACE_ID}/datasets/{DATASET_ID}/refreshes",
        headers={"Authorization": f"Bearer {token}"},
    )
    if r.status_code == 202:
        print("✓ Refresh gestart (202 Accepted)")
    else:
        print(f"✗ Fout: {r.status_code} — {r.text}")
        sys.exit(1)

if __name__ == "__main__":
    print(f"Refreshing Orderoverzicht ({DATASET_ID}) in acc workspace...")
    token = get_token()
    trigger_refresh(token)
    print("Pulse pikt de run op bij de volgende sync cyclus (~1 min).")
