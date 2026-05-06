# Uganda Digital Surveillance Watch

**A Research Intelligence Dashboard**

This repository contains the source code and data for the "Uganda Digital Surveillance Watch" dashboard. It was developed as a supplementary empirical contribution for Chapter 4 of the master's research dissertation: *"A Framework for Mitigating Spyware-Enabled Surveillance Risks in Uganda"*.

## Academic Context

This dashboard demonstrates the practical application of the proposed socio-technical mitigation framework by:
1. Triangulating data from multiple global OSINT sources (Surveillance Watch API, Citizen Lab, Amnesty International).
2. Documenting the specific targeting of Ugandan civil society by commercial spyware vendors (e.g., Pegasus, FinFisher).
3. Visualizing primary quantitative findings (N=320) regarding privacy concerns and behavioral adaptations in Uganda.

**Author:** Denis Ainedembe  
**Institution:** Uganda Martyrs University  
**Year:** 2026

## Features

- **Pure Static Architecture:** Built with HTML, CSS, and Vanilla JavaScript. No backend required.
- **Live API Integration:** Fetches real-time vendor data from the Surveillance Watch API.
- **Interactive Data Visualization:**
  - `Leaflet.js` for mapping the global spyware supply chain to Uganda.
  - `Chart.js` for rendering Chapter 4 survey statistics.
- **Curated Encyclopedic Data:** Custom JSON database tracking spyware types and historical incidents in Uganda (2011-2025).

## Deployment

This dashboard is designed to be hosted entirely for free on GitHub Pages. 
Because it relies on static JSON files and client-side API fetches, it requires zero maintenance.

To deploy:
1. Fork or clone this repository.
2. Go to repository **Settings** > **Pages**.
3. Select the `main` branch and `/ (root)` folder.
4. Click **Save**. The dashboard will be live at `https://[username].github.io/uganda-surveillance-watch/`.

## Data Sources

- `data/spyware.json` - Curated profiles of spyware documented in the region.
- `data/incidents.json` - Timeline of major surveillance events in Uganda.
- `data/survey.json` - Primary data collected during the research study.
- [SurveillanceWatch.io API](https://www.surveillancewatch.io/docs) - Live feed of the commercial spyware industry.
