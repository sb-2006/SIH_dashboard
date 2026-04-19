# deployed-site: https://sih-kmrl-dashboard-mz19.vercel.app/
# https://docs.mapbox.com/mapbox-gl-js/example/simple-map/


# 🚇 Neural Railways
### AI-Driven Metro Train Induction & Optimization Platform

**Smart India Hackathon 2025** · Problem Statement ID: `25081` · Team ID: `86098`  
*Kochi Metro Rail Limited (KMRL) · Government of Kerala · Theme: Smart Automation*

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)
![OR-Tools](https://img.shields.io/badge/Google_OR--Tools-SCIP_Solver-4285F4?style=flat&logo=google&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

</div>

---

## 📌 Problem Overview

Every night between **21:00–23:00 IST**, KMRL supervisors must decide which of its **25 four-car trainsets** enter revenue service at dawn. This decision hinges on **6 interdependent variables**:

| # | Variable | Source |
|---|----------|--------|
| 1 | Fitness Certificates | Rolling-Stock, Signalling & Telecom depts |
| 2 | Job-Card Status | IBM Maximo (open vs. closed work orders) |
| 3 | Branding Priorities | Advertiser SLA contractual commitments |
| 4 | Mileage Balancing | Bogie, brake-pad & HVAC wear equalisation |
| 5 | Cleaning & Detailing Slots | Manpower availability & bay occupancy |
| 6 | Stabling Geometry | Physical bay positions to minimize shunting |

**The pain point:** All these data points lived in siloed spreadsheets, logbooks, and WhatsApp messages — reconciled manually using experience-based heuristics inside a 2-hour window. One missed telecom clearance could erode KMRL's **99.5% punctuality KPI**.

**Our mission:** Replace this opaque, non-repeatable process with an algorithm-driven decision-support platform.

---

## ✨ Key Features

- **🔢 Ranked Induction List** — AI-scored daily schedule of trains ready for service
- **⚠️ Conflict Alerts** — Auto-detection of certificate expiry, incomplete fitness checks, and cleaning clashes
- **🔮 What-If Simulations** — Scenario modeling (e.g., "delay deep clean", "brand train early")
- **🧠 Explainable AI Rankings** — Transparent scoring rationale for every decision
- **📊 Predictive Maintenance Insights** — Forecast maintenance needs before they cause withdrawals
- **🗺️ Spatial Stabling Visualization** — Mapbox GL-powered depot bay layout
- **⚡ Real-Time Data Ingestion** — IoT/UNS streams + Maximo exports in near-real-time

---

## 🏗️ Architecture Overview
          
```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA SOURCES                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  ┌────────────┐  │
│  │ IoT/UNS      │  │ IBM Maximo   │  │ Fitness  │  │  Manual    │  │
│  │ Sensor Feeds │  │ Job-Card     │  │ Cert DB  │  │  Overrides │  │
│  │ (Real-time)  │  │ Exports      │  │          │  │  (Web UI)  │  │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘  └─────┬──────┘  │
└─────────┼─────────────────┼───────────────┼───────────────┼─────────┘
          └─────────────────┴───────────────┴───────────────┘
                                    │
                    ┌───────────────▼────────────────┐
                    │      DATA CLEANING &            │
                    │      VALIDATION LAYER           │
                    │  (Missing values, type checks,  │
                    │   fitness cert validation)       │
                    └───────────────┬────────────────┘
                                    │
                    ┌───────────────▼────────────────┐
                    │      FEATURE ENGINEERING        │
                    │  (MinMaxScaler normalization,   │
                    │   interaction term computation) │
                    └───────────────┬────────────────┘
                                    │
               ┌────────────────────┼───────────────────┐
               │                    │                   │
    ┌──────────▼──────┐   ┌─────────▼──────┐  ┌────────▼────────┐
    │  Neural Network  │   │  Weighted       │  │  Google OR-     │
    │  Readiness       │   │  Scoring        │  │  Tools SCIP     │
    │  Predictor       │   │  Engine         │  │  Solver         │
    │  (service prob.) │   │  (0–1 score)    │  │  (constraints)  │
    └──────────┬───────┘   └─────────┬───────┘  └────────┬────────┘
               └────────────────────┼───────────────────┘
                                    │
                    ┌───────────────▼────────────────┐
                    │         DECISION ENGINE         │
                    │   (Ranked Induction List,       │
                    │    Conflict Alerts, Audit Log)  │
                    └───────────────┬────────────────┘
                                    │
               ┌────────────────────┼───────────────────┐
               │                                        │
    ┌──────────▼──────────┐              ┌──────────────▼──────────┐
    │   REACT DASHBOARD   │              │    REST API (Flask /     │
    │   - Ranked list      │              │    FastAPI)              │
    │   - Mapbox stabling  │              │    - /ingest             │
    │   - Conflict alerts  │              │    - /optimize           │
    │   - What-if panel    │              │    - /simulate           │
    │   - KPI metrics      │              │    - /alerts             │
    └─────────────────────┘              └─────────────────────────┘
```


---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Mapbox GL JS, Tailwind CSS |
| **Backend** | Python, Flask / FastAPI |
| **Optimization** | Google OR-Tools (SCIP Solver) |
| **ML Model** | Neural Networks (service readiness prediction) |
| **Data Validation** | Pandas, MinMaxScaler (scikit-learn) |
| **External Integrations** | IBM Maximo API, IoT/UNS streams, GTFS feeds |
| **Serialization** | JSON, REST APIs |

---

## ⚙️ Solution: Weighted Scoring & Optimization

### Scoring Engine

Each trainset receives a composite readiness score:

$$\text{Score} = \sum(\text{weights} \times \text{inputs}) + \text{interactions} + \text{bonuses} - \text{penalties}$$

**Weight Matrix:**

| Factor | Weight |
|--------|--------|
| Service Ready | +0.8 |
| Clean status | +0.6 |
| Low overall mileage | +0.4 |
| Out of service | −1.0 |
| Overdue maintenance | −1.2 |
| High mileage | −0.4 |

**Interaction Terms:**
- Ready × Clean: `+0.2`
- High Mileage × Overdue: `−0.3`

The final score (0–1 scale) determines **train deployment priority**.

### Multi-Objective Optimization (OR-Tools SCIP)

Beyond individual scoring, OR-Tools enforces system-level constraints simultaneously:
- **Fitness limits** — no rake inducted without valid certificates
- **Mileage balancing** — equalize km allocation to prevent component fatigue
- **Branding SLAs** — guarantee advertiser exposure-hour commitments
- **Cleaning conflicts** — respect bay occupancy and manpower caps
- **Stabling geometry** — minimize shunting moves for faster morning turnout

---

## 🖥️ Dashboard Walkthrough

### Frontend
- **Ranked Induction List** — Interactive table with slider-tunable weights; click any row for full explainability breakdown
- **Stabling Map** — Mapbox GL visualization of depot bay positions and rake locations
- **Constraint Health Panel** — Live status of fitness certs, job cards, branding SLA risk, and cleaning bay load
- **What-If Simulator** — Adjust scenarios (delay a clean, advance branding) and watch rankings recompute instantly
- **Alert Feed** — Prioritized conflict list (e.g., "KMRL-TS-11: Deep clean due", "Telecom fitness expiring soon")

### Backend
- Ingests heterogeneous inputs (Maximo CSV exports, IoT feeds, manual overrides) into a unified pipeline
- Runs constraint validation and flags conflicts before the optimizer fires
- Serves ranked induction list and simulation results via REST API
- Stores historical outcomes for ML feedback loop retraining

---

## 📈 Impact

| Metric | Before | After |
|--------|--------|-------|
| Decision window | 2 hrs manual | ~Minutes automated |
| Data sources | Siloed (WhatsApp + spreadsheets) | Unified real-time pipeline |
| Unscheduled withdrawals | Ad-hoc, reactive | Proactively flagged |
| Punctuality KPI target | At risk (99.5%) | Continuously monitored |
| Scalability | Breaks at 25 rakes | Designed for 40+ rakes |

---

## 🔭 Future Enhancements

- **Dual-depot support** — Architecture ready to scale to KMRL's planned second depot by 2027
- **40+ trainset fleet** — Modular pipeline expands without structural changes
- **Live Maximo API integration** — Replace CSV exports with real-time job-card streaming
- **Demand-aligned scheduling** — GTFS + ridership data for passenger-load-aware induction
- **Continuous ML retraining** — Automated feedback loops from daily operational outcomes

---

## 🏆 Recognition

> Ranked **12th out of 45** campus-shortlisted teams · Smart India Hackathon 2025 Pre-Finals Qualifier  
> Problem Statement #25081 · KMRL, Government of Kerala

---


