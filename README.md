# 🏥 AuraHealth — Offline-First Rural Women's Health Platform

A **privacy-first, offline-capable** menstrual wellness and health risk assessment platform designed for rural women and ASHA (Accredited Social Health Activist) workers in India.

Built for the **CodeSangram Hackathon**.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
  - [Mobile App](#1-mobile-app-react-native--expo)
  - [Backend](#2-backend-nodejs--express--mongodb)
  - [NGO Dashboard](#3-ngo-dashboard-react--chartjs)
- [Features](#features)
- [System Flow](#system-flow)
- [Privacy & Security](#privacy--security)
- [Deployment](#deployment)

---

## Overview

AuraHealth addresses critical gaps in rural women's healthcare by providing:

- **Offline risk assessment** using rule-based scoring (NO AI/ML)
- **Emergency SMS + GPS alerts** that work without internet
- **Bilingual support** (English + Hindi) for rural accessibility
- **ASHA Worker mode** for field visit management
- **Anonymized data sync** to a central backend for NGO analytics
- **NGO Dashboard** with charts for program monitoring

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    MOBILE APP (Expo)                     │
│                                                          │
│  ┌──────────┐   ┌────────────┐   ┌────────────┐          │
│  │ Symptom  │ → │ Risk       │ → │ Emergency  │          │
│  │ Form     │   │ Engine     │   │ Layer      │          │
│  └──────────┘   └────────────┘   └──────┬─────┘          │
│                                           │              │
│                                   ┌───────▼───────┐      │
│                                   │ Local Storage │      │
│                                   └───────────────┘      │
│                                                          │
│        100% Offline ✅        SMS + GPS ✅               │
└──────────────────────────────────────────────────────────┘
                             │
                             │ Sync
                             ▼
┌──────────────────────────────────────────────────────────┐
│              BACKEND (Express + MongoDB)                 │
│                                                          │
│  ┌────────────┐   ┌──────────────┐   ┌───────────────┐   │
│  │ POST       │ ← │ Anonymized   │ ← │ Health Records│   │
│  │ /api/sync  │   │ Data Only    │   │ (No PII)      │   │
│  └────────────┘   └──────────────┘   └───────────────┘   │
└──────────────────────────────────────────────────────────┘
                             │
                             │ API
                             ▼
┌──────────────────────────────────────────────────────────┐
│            NGO DASHBOARD (React + Chart.js)              │
│                                                          │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐              │
│  │ Pie      │   │ Bar      │   │ Line     │              │
│  │ Chart    │   │ Chart    │   │ Chart    │              │
│  └──────────┘   └──────────┘   └──────────┘              │
└──────────────────────────────────────────────────────────┘

```

---

## Tech Stack

| Component | Technology | Cost |
|-----------|-----------|------|
| Mobile App | React Native (Expo) | Free |
| Navigation | Expo Router | Free |
| Risk Engine | Pure JavaScript (Rule-based) | Free |
| Local Storage | expo-secure-store + AsyncStorage | Free |
| Emergency | expo-sms + expo-location | Free |
| Backend | Node.js + Express | Free |
| Database | MongoDB Atlas (M0 Free Tier) | Free |
| Dashboard | React + Chart.js | Free |
| Hosting | Render.com Free Tier | Free |

---

## Project Structure

```
healthier-ai/
├── app/                          # Expo Router routes
│   ├── _layout.js                # Root layout (auto-sync)
│   ├── role-select.js            # Role selection route
│   ├── symptoms.js               # Symptom form route  
│   ├── result.js                 # Assessment result route
│   ├── asha.js                   # ASHA dashboard route
│   └── (tabs)/                   # Tab navigation
│       ├── _layout.js
│       ├── index.js              # Home screen
│       ├── calendar.js           # Cycle calendar
│       ├── risk.js               # Health risk
│       ├── chat.js               # AI chat
│       └── settings.js           # Settings
│
├── src/
│   ├── screens/                  # Screen components
│   │   ├── RoleSelectionScreen.js
│   │   ├── SymptomScreen.js
│   │   ├── ResultScreen.js
│   │   └── ASHAScreen.js
│   ├── components/
│   │   ├── SymptomToggle.js      # Toggle button
│   │   ├── RiskBadge.js          # Color-coded badge
│   │   ├── Calendar.js
│   │   ├── CyclePrediction.js
│   │   ├── MoodHeatmap.js
│   │   ├── LanguageSwitch.js
│   │   └── VoiceAlert.js
│   ├── services/
│   │   ├── riskEngine.js         # Rule-based scoring
│   │   ├── storageService.js     # Encrypted local storage
│   │   ├── syncService.js        # Background sync  
│   │   ├── emergencyService.js   # SMS + GPS emergency
│   │   ├── HealthDataLogger.js
│   │   └── SyncManager.js
│   ├── utils/
│   │   ├── constants.js          # App constants + config
│   │   └── storage.js            # Core storage utils
│   ├── context/
│   │   └── LanguageContext.js
│   ├── constants/
│   │   └── translations.js
│   ├── engine/
│   │   └── RandomForestRiskEngine.js
│   ├── hooks/
│   │   └── useCycleTracker.js
│   └── api/
│       └── gemini.js
│
├── backend/                      # Express + MongoDB backend
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── models/
│   │   └── HealthRecord.js
│   └── routes/
│       └── healthRoutes.js
│
├── dashboard/                    # React NGO dashboard
│   ├── package.json
│   ├── .env.example
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── index.js
│       ├── App.js
│       └── components/
│           ├── LoginScreen.js
│           └── Dashboard.js
│
├── package.json
├── app.json
├── babel.config.js
└── README.md
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (for mobile testing)
- MongoDB Atlas account (free)

### 1. Mobile App (React Native + Expo)

```bash
# Clone the repo
git clone <repo-url>
cd healthier-ai

# Install dependencies
npm install --legacy-peer-deps

# Start the Expo dev server
npx expo start

# Scan the QR code with Expo Go app
```

### 2. Backend (Node.js + Express + MongoDB)

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB Atlas URI:
#   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/aurahealth

# Start the server
npm run dev
# Server runs on http://localhost:3000
```

#### MongoDB Atlas Setup (Free)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free account
3. Create a cluster (M0 Free Tier)
4. Create a database user
5. Whitelist your IP (or 0.0.0.0/0 for development)
6. Get the connection string
7. Paste it in `backend/.env` as `MONGODB_URI`

### 3. NGO Dashboard (React + Chart.js)

```bash
# Navigate to dashboard folder
cd dashboard

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your backend URL:
#   REACT_APP_API_URL=http://localhost:3000/api

# Start the dashboard
npm start
# Dashboard runs on http://localhost:3001
```

**Default login password:** `aurahealth2024`

---

## Features

### Mobile App

| Feature | Description | Offline? |
|---------|-------------|----------|
| Role Selection | Woman mode / ASHA worker mode | ✅ |
| Symptom Form | Toggle-based symptom entry with Hb field | ✅ |
| Risk Engine | Weighted rule-based scoring (0-3 LOW, 4-6 MOD, 7+ HIGH) | ✅ |
| Emergency SMS | Auto-send GPS location via SMS on HIGH risk | ✅ |
| Emergency Call | Prompt to call 112 for emergencies | ✅ |
| Cycle Tracking | Calendar-based period logging | ✅ |
| Data Storage | Encrypted local storage (no PII) | ✅ |
| Background Sync | Auto-sync when internet available | ☁️ |
| Bilingual | English + Hindi | ✅ |
| ASHA Dashboard | Field visit management + patient counts | ✅ |

### Backend API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ping` | GET | Connectivity check |
| `/api/sync` | POST | Receive health records |
| `/api/analytics/village/:code` | GET | Village statistics |
| `/api/analytics/trends/:code` | GET | Monthly trends |
| `/api/analytics/villages` | GET | List all villages |

### NGO Dashboard

- Password-protected login
- Village selector dropdown
- Pie chart — Risk level distribution
- Bar chart — Symptom prevalence rates
- Line chart — Monthly trend analysis
- Summary stat cards

---

## System Flow

```
User/ASHA enters symptoms
        ↓
riskEngine calculates locally (100% offline)
        ↓
Emergency layer checks intensity
        ↓
Action triggered (advice / SMS / call prompt)
        ↓
Data stored encrypted locally (no PII)
        ↓
When online → synced to backend
        ↓
Backend aggregates anonymized data
        ↓
NGO Dashboard shows trends & charts
```

---

## Privacy & Security

- **NO names** stored or synced
- **NO phone numbers** stored in records
- **NO Aadhaar / ID numbers** anywhere
- **NO exact addresses** — only village codes
- Only anonymized, aggregated data reaches the server
- Local data encrypted via `expo-secure-store`
- HTTPS enforced on backend (via deployment platform)
- Rate limiting (100 req/15min per IP)
- Environment variables for all secrets
- Helmet.js for security headers

---

## Deployment

### Backend → Render.com (Free)

1. Push `backend/` to a GitHub repo
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Set root directory: `backend`
5. Build command: `npm install`
6. Start command: `node server.js`
7. Add environment variables:
   - `MONGODB_URI` = your Atlas connection string
   - `DASHBOARD_PASSWORD` = your chosen password

### Dashboard → Netlify (Free)

1. Push `dashboard/` to a GitHub repo
2. Go to [netlify.com](https://netlify.com) → New Site
3. Connect your GitHub repo
4. Set base directory: `dashboard`
5. Build command: `npm run build`
6. Publish directory: `dashboard/build`
7. Add environment variables:
   - `REACT_APP_API_URL` = your Render backend URL
   - `REACT_APP_DASHBOARD_PASSWORD` = your chosen password

### Mobile App → Update URLs

After deploying the backend, update `src/utils/constants.js`:

```js
export const SYNC_CONFIG = {
  API_BASE_URL: 'https://your-backend.onrender.com/api',
  PING_URL: 'https://your-backend.onrender.com/api/ping',
  ...
};
```

---

## Risk Engine Logic

**Symptom Weights:**
| Symptom | Weight |
|---------|--------|
| Heavy Bleeding | 4 |
| Low Hemoglobin | 4 |
| Pregnancy Issue | 5 |
| Dizziness | 3 |
| Fatigue | 2 |
| Irregular Cycles | 2 |
| Pain/Cramps | 2 |

**Emergency Modifiers:**
| Sign | Modifier |
|------|----------|
| Fainted | +2 |
| Severe Pain | +2 |
| Vomiting | +2 |

**Risk Levels:**
| Score | Level | Action |
|-------|-------|--------|
| 0–3 | LOW ✅ | Maintain healthy lifestyle |
| 4–6 | MODERATE ⚠️ | Visit health center in 2-3 days |
| 7+ | HIGH 🚨 | Immediate medical attention + SMS alert |

---

## License

MIT — Built with ❤️ for rural women's health.

## ⚠️ Disclaimer

This app provides general wellness information and is not a substitute for professional medical advice. Always consult a healthcare provider for medical concerns.
