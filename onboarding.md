# Pulse — Onboarding Guide for New Customers

Welcome to Pulse. This guide walks you through connecting your Power BI environment so Pulse can start monitoring your datasets.

---

## Prerequisites

Before you begin, make sure you have:

- A **Power BI Pro or Premium** licence (or Premium Per User)
- Access to your organisation's **Azure Active Directory** (to register an app)
- **Power BI Admin** rights (to enable the service principal API setting)

---

## Step 1 — Create an Azure App Registration

Pulse reads your Power BI workspaces using a service principal. No data leaves your Microsoft tenant.

1. Go to [portal.azure.com](https://portal.azure.com) → **Azure Active Directory** → **App registrations** → **New registration**
2. Give it a name (e.g. `Pulse Monitoring`) and click **Register**
3. On the overview page, copy:
   - **Directory (tenant) ID**
   - **Application (client) ID**
4. Go to **Certificates & secrets** → **New client secret**
   - Set an expiry (12 or 24 months recommended)
   - Copy the **Value** immediately — it won't be shown again

---

## Step 2 — Grant Power BI API permissions

Still in the App Registration:

1. Go to **API permissions** → **Add a permission** → **Power BI Service**
2. Select **Application permissions** and add:
   - `Dataset.Read.All`
   - `Workspace.Read.All`
3. Click **Grant admin consent** (requires Global Admin or Power BI Admin)

---

## Step 3 — Enable service principal access in Power BI

1. Go to [app.powerbi.com](https://app.powerbi.com) → **Settings (⚙)** → **Admin portal**
2. Under **Tenant settings** → find **Developer settings**
3. Enable **Allow service principals to use Power BI APIs**
   - You can restrict this to a security group if preferred

> **Note:** It can take up to 15 minutes for this setting to take effect.

---

## Step 4 — Connect Pulse

1. Sign in to your Pulse account
2. On the onboarding screen, enter your **organisation name**
3. Enter the three values from Step 1:
   - Azure Tenant ID
   - Application (client) ID
   - Client secret
4. Click **Test connection** — Pulse will list all workspaces your service principal can see
5. Select the workspaces you want to monitor
6. Click **Start monitoring**

Pulse will immediately begin syncing your datasets. The first sync completes within a minute.

---

## What happens after setup

- **First sync:** Pulse fetches all datasets, refresh history, and schema from your selected workspaces
- **Test alert:** A test notification is sent to your email address so you can confirm alerts are working
- **Ongoing monitoring:** Pulse checks for refresh failures, delayed refreshes, and schema changes every 5 minutes
- **Auto-resolve:** When a failed dataset refreshes successfully, Pulse automatically closes the incident — no manual action needed

---

## Alert channels

Pulse can notify you through multiple channels. Configure these in your account settings:

| Channel | What you need |
|---------|--------------|
| **Email** | Your account email is used by default |
| **Telegram** | A Telegram Bot Token and your Chat ID |
| **Webhook** | Any HTTP endpoint (Teams, Slack, PagerDuty, etc.) |

Alerts are sent once per incident — not repeated every cycle. Suppressed incidents do not trigger alerts.

---

## Inviting team members

> This feature is coming in a future release. For now, share your login credentials with colleagues who need access.

---

## Workspace access

Pulse only sees workspaces where your service principal has been granted **Member** or **Admin** access at the workspace level. If a workspace is missing:

1. In Power BI, go to the workspace → **Access**
2. Add your service principal (search by the app registration name) with **Member** or higher role

---

## Frequently asked questions

**Does Pulse store my data?**
Pulse stores metadata only: dataset names, refresh timestamps, error codes, and schema column names. Report data and model content never leave your tenant.

**How is my client secret stored?**
Your Power BI client secret is encrypted at rest using AES-256 (Fernet) before being written to the database. It is never logged or exposed in the UI.

**Can I monitor multiple workspaces?**
Yes. During onboarding, select as many workspaces as you like. You can add or remove workspaces later in settings.

**What if my client secret expires?**
You will need to generate a new secret in Azure and update it in Pulse settings. Pulse will surface a connectivity error if the secret has expired.

**How do I disconnect Pulse?**
Delete the App Registration in Azure. Pulse will no longer be able to sync and will surface connection errors. Contact support to close your account.

---

## Support

Questions or issues? Reach out via [wkruithof@gmail.com](mailto:wkruithof@gmail.com) or open a ticket via the Pulse dashboard.
