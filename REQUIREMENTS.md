# Quickchex HRMS - Consolidated Requirements & Dependency Guide

This document provides a consolidated specification of all software prerequisites, dependencies, and environment configurations across the **Quickchex** platform (Backend API, Web Frontend, and Mobile App).

---

## 📁 Repository Overview

```
Quickchex/
├── requirements.txt                   <-- Consolidated Backend Python requirements (Root)
├── package.json                       <-- Consolidated Root NPM Workspace scripts
├── REQUIREMENTS.md                    <-- Complete Stack & Dependency documentation
├── render.yaml                        <-- Production Deployment blueprint (Render / Neon)
│
├── Attendance-portal/
│   └── backend/                       <-- FastAPI Python Backend
│       ├── requirements.txt           <-- Service Python requirements
│       ├── app/                       <-- FastAPI Application codebase
│       ├── .env.example               <-- Backend environment configuration template
│       └── ...
│
├── Frontend/
│   └── hrms-frontend/                 <-- React 18 + Vite Web Application
│       ├── package.json               <-- Web frontend npm dependencies
│       ├── .env.example               <-- Frontend environment configuration template
│       └── ...
│
└── mobile-app/                        <-- Expo & React Native Mobile Application
    ├── package.json                   <-- Mobile app npm dependencies
    ├── app.json                       <-- Expo application manifest
    └── ...
```

---

## 1. 🐍 Backend Requirements (FastAPI)

- **Directory**: `Attendance-portal/backend` & Root `requirements.txt`
- **Runtime**: Python `3.10` to `3.12.8` (Render deployment uses `3.12.8`)
- **Database**: PostgreSQL (Neon Serverless recommended for cloud) or SQLite (local development fallback)

### Dependency Breakdown

| Category | Package | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **API & Server** | `fastapi` | `0.141.1` | Asynchronous web API framework |
| | `uvicorn` | `0.52.1` | ASGI server |
| | `starlette` | `1.6.0` | ASGI toolkit underpinning FastAPI |
| | `pydantic` | `2.13.4` | Data validation and schema parsing |
| | `pydantic-settings`| `2.15.0` | Environment settings management |
| | `python-multipart`| `0.0.32` | Form data & file upload handling |
| | `websockets` | `17.0.1` | Real-time bi-directional messaging |
| **Database & ORM**| `SQLAlchemy` | `2.0.51` | Object Relational Mapper |
| | `psycopg2-binary` | `2.9.10` | PostgreSQL database driver |
| **Auth & Security** | `passlib` | `1.7.4` | Password hashing algorithms |
| | `bcrypt` | `4.0.1` | Bcrypt password encryption engine |
| | `python-jose` | `3.5.0` | JWT token generation and decoding |
| | `cryptography` | `50.0.0` | Cryptographic primitives |
| **Scheduling** | `APScheduler` | `3.11.3` | Cron jobs (auto-punchout, reports) |
| **Data & Docs** | `pandas` | `3.0.5` | Data analysis and payroll computation |
| | `openpyxl` | `3.1.5` | Excel (.xlsx) report generation & import |
| | `PyMuPDF` | `>=1.24.0` | PDF parsing and document manipulation |
| | `Pillow` | `>=10.0.0` | Image processing (punch-in selfie handling) |
| **Utilities** | `requests` | `2.34.2` | External HTTP client |
| | `python-dotenv` | `1.2.2` | `.env` file loader |
| | `python-dateutil`| `2.9.0.post0` | Date/time calculations |

### Quick Installation
```bash
# In Attendance-portal/backend (or from root)
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
```

---

## 2. ⚛️ Web Frontend Requirements (React + Vite)

- **Directory**: `Frontend/hrms-frontend`
- **Runtime**: Node.js `>= 18.x` (LTS recommended: Node 20.x or 22.x), NPM `>= 9.x`
- **Bundler**: Vite 8

### Dependency Breakdown

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `react` | `^18.3.1` | Core UI library |
| `react-dom` | `^18.3.1` | React DOM renderer |
| `react-router-dom` | `^6.30.3` | Client-side routing & navigation |
| `axios` | `^1.15.0` | HTTP requests to backend API |
| `recharts` | `^3.8.1` | Analytics and dashboard charts |
| `three` | `^0.186.1` | 3D visual graphics / hero elements |
| `xlsx` | `^0.18.5` | Client-side Excel export and parsing |
| `lucide-react` | `^1.34.0` | Iconography |
| `react-icons` | `^5.6.0` | Supplemental icon pack |
| `react-datepicker` | `^9.1.0` | Date picking components |
| `react-hot-toast` | `^2.6.0` | User notification toasts |
| `tailwindcss` | `^4.3.3` | Utility-first CSS styling |
| `vite` | `^8.0.1` | Next-generation frontend build tool |

### Quick Installation & Build
```bash
cd Frontend/hrms-frontend
npm install
npm run build   # Production bundle in /dist
npm run dev     # Starts local development server on http://localhost:5173
```

---

## 3. 📱 Mobile Application Requirements (Expo / React Native)

- **Directory**: `mobile-app`
- **Runtime**: Node.js `>= 18.x`, Expo CLI / EAS CLI

### Dependency Breakdown

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `expo` | `~57.0.30` | Expo application platform |
| `react` | `19.2.3` | React library |
| `react-native` | `0.86.3` | React Native framework |
| `@react-navigation/native` | `^7.4.1` | Screen routing |
| `@react-navigation/native-stack` | `^7.19.2` | Native stack navigation |
| `expo-location` | `~57.0.21` | Geofencing & GPS location for punch-in |
| `expo-secure-store`| `^57.0.4` | Encrypted mobile token storage |
| `expo-updates` | `~57.0.26` | Over-the-air (OTA) application updates |
| `lucide-react-native` | `^1.48.0` | Mobile icons |
| `react-native-svg` | `15.15.4` | Vector SVG rendering |
| `react-native-webview` | `13.16.1` | Webview integration |

### Quick Installation
```bash
cd mobile-app
npm install
npm run start   # Launches Expo development server
```

---

## 4. ⚙️ Root Monorepo Commands

With the root `package.json` in place, you can execute project tasks directly from the repository root:

```bash
# Install dependencies for both frontend and mobile:
npm run install:all

# Run Web Frontend in development mode:
npm run dev:frontend

# Build Web Frontend for production:
npm run build:frontend

# Start Mobile App (Expo):
npm run dev:mobile

# Start Backend API server:
npm run start:backend

# Auto-setup PostgreSQL on server and migrate all Neon data:
npm run migrate:postgres
```

---

## 5. 🗄️ Automated PostgreSQL Server Setup & Data Migration

To set up a new PostgreSQL database on any server and replicate all existing data from Neon:

```bash
# Option 1: Double-click or run the Windows batch launcher
.\migrate_postgres.bat

# Option 2: Run via npm
npm run migrate:postgres

# Option 3: Run directly with Python
python setup_and_migrate_postgres.py
```

### What this script does automatically:
1. Prompts for target PostgreSQL credentials (Host, Port, User, Password, Database Name).
2. Connects to the server and creates the target database automatically if it does not exist (`CREATE DATABASE <dbname>`).
3. Recreates all 44 table schemas (including dynamic monthly attendance and leave tables).
4. Bulk transfers all rows from your Neon database safely (with triggers/foreign-key handling).
5. Synchronizes all SERIAL primary key sequences.
6. Prints a row-count audit verification table comparing Source vs Target.
7. Prompts to automatically update `Attendance-portal/backend/.env` with the new database URL (creating a backup of your old `.env`).

