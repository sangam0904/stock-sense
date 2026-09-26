# 📦 StockSense IMS — Modern Modular Inventory Management System

StockSense is an enterprise-ready, modular Inventory Management System (IMS) engineered to digitize and streamline stock-related operations across warehouses and businesses. It replaces manual paper registers, static Excel sheets, and scattered tracking methods with a centralized, real-time, high-performance web platform.

---

## ✨ Features

- **Live Operational Dashboard**: Real-time KPI metrics (Total Products, Low Stock, Out of Stock, Pending Receipts, Pending Deliveries, Scheduled Transfers).
- **Dynamic 4-Way Filtering**: Filter operations by Document Type (*Receipts / Deliveries / Internal Transfers / Adjustments*), Status (*Draft / Waiting / Ready / Done / Canceled*), Warehouse Location, and Product Category.
- **Product & Inventory Catalog**: Multi-location stock breakdown, SKU codes, custom categories, unit of measures, reorder thresholds, and instant low-stock alerts.
- **Inbound Receipts**: Create vendor orders, receive quantities, and automatically increment warehouse stock upon validation.
- **3-Step Outbound Deliveries**: Follows standard warehouse fulfillment: `1. Pick Items` ➔ `2. Pack Items` ➔ `3. Validate & Dispatch` with stock availability guards.
- **Internal Transfers**: Relocate inventory across storage facilities with atomic stock decrement at source and increment at destination.
- **Physical Count Adjustments**: Reconcile recorded stock against physical counts with real-time discrepancy calculation.
- **Stock Ledger / Move History**: Comprehensive chronological audit trail recording every movement, document reference, quantity delta (`+` / `-`), and post-movement balance.
- **Export Reports (CSV / Excel)**: One-click export for the Stock Ledger, Product Catalog, and Operations streams with UTF-8 BOM encoding for seamless Microsoft Excel compatibility.
- **Email OTP Authentication**: Passwordless OTP login & password reset powered by the **Resend API**.
- **Personalized User Profiles**: Custom photo upload (Base64 file upload + preset avatars), warehouse assignments, and role badges.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, Lucide Icons, React Router 6, React Hot Toast.
- **Backend**: Node.js, Express, `sql.js` (WebAssembly SQLite), JSON Web Tokens (JWT), bcryptjs.
- **Email & Communications**: Resend Email API SDK.

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Fill in your JWT_SECRET and RESEND_API_KEY in backend/.env
npm start
```
*Backend runs on `http://localhost:3001`.*

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 🌐 Hosting & Deployment Guide

### Deploying the Backend (Render.com)
1. Push this repository to GitHub.
2. Sign in to [Render.com](https://render.com) and click **New +** ➔ **Web Service**.
3. Connect your GitHub repository `stock-sense`.
4. Configure service settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. In **Environment Variables**, add:
   - `JWT_SECRET`: your secret key
   - `RESEND_API_KEY`: your Resend API key
   - `RESEND_FROM`: `StockSense <onboarding@resend.dev>`
6. Deploy! Render will provide your public backend URL (e.g. `https://stocksense-api.onrender.com`).

### Deploying the Frontend (Vercel)
1. Sign in to [Vercel](https://vercel.com) and click **Add New** ➔ **Project**.
2. Import your GitHub repository `stock-sense`.
3. Set the **Root Directory** to `frontend`.
4. Framework Preset: **Vite**.
5. Add the **Environment Variable**:
   - `VITE_API_URL`: `https://your-backend.onrender.com/api` *(or your deployed backend URL)*
6. Click **Deploy**. Vercel will build and host your frontend globally with automatic SSL.

---

## 📄 License
MIT License.
