# Sharp Plus Trading & Inventory Management System

A full-stack inventory management system for Sharp Plus Trading PLC built with React, Express.js, and MongoDB.

---

## 🚀 Deploying to Aletcloud (Docker)

### Step 1: Push your code to GitHub
```bash
git add .
git commit -m "Deploy to Aletcloud"
git push origin main
```

### Step 2: Create App on Aletcloud
1. Log into [Aletcloud](https://aletcloud.com) → **New App** → **From GitHub**
2. Select your repository
3. Aletcloud auto-detects the `Dockerfile` and builds the image

### Step 3: Set Environment Variables in Aletcloud Dashboard
Go to your app → **Environment** tab and add these variables:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `MONGO_URI` | `mongodb+srv://sharpplus:SharpPlus2026!@cluster0.dihvcpk.mongodb.net/sharp_plus_db?retryWrites=true&w=majority` |
| `JWT_SECRET` | `hotel_stock_jwt_secret_key_super_secure_2026` |
| `JWT_EXPIRES_IN` | `7d` |
| `PUBLIC_URL` | `https://YOUR-APP-NAME.aletcloud.com` |
| `CLIENT_URL` | `https://YOUR-APP-NAME.aletcloud.com` |

> **⚠️ Important:** Replace `YOUR-APP-NAME` with your actual Aletcloud app subdomain.

### Step 4: Deploy
Click **Deploy** — Aletcloud will:
1. Clone your repository
2. Build the Docker image (React app compiles to static files with `/api` as API URL)
3. Start the container — Express serves both the React frontend AND the `/api` backend

### Step 5: Access Your App
- **Frontend:** `https://YOUR-APP-NAME.aletcloud.com`
- **API Health:** `https://YOUR-APP-NAME.aletcloud.com/api/health`
- **Login:** `admin@company.com` / `admin123`

---

## 💻 Running Locally

### Prerequisites
- Node.js 18+
- npm 8+
- Internet access (uses MongoDB Atlas cloud database)

### Start Backend
```bash
cd server
npm install
npm run dev
# Server runs on http://localhost:5000
```

### Start Frontend (new terminal)
```bash
cd client
npm install
npm run dev
# App runs on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🔑 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@company.com` | `admin123` |
| Manager | `manager@company.com` | `admin123` |
| Storekeeper | `storekeeper@company.com` | `admin123` |

---

## 🏗️ Architecture

```
Aletcloud Container (port 5000)
├── /api/*          → Express.js API routes (MongoDB Atlas)
├── /api/health     → Health check endpoint
└── /*              → React.js frontend (compiled static files)
```

The frontend and backend run together in a **single Docker container**. All API calls use relative `/api` paths — no CORS issues, no separate frontend hosting needed.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS (via custom CSS), Lucide Icons
- **Backend:** Express.js, Node.js 20
- **Database:** MongoDB Atlas (cloud)
- **Authentication:** JWT tokens
- **Deployment:** Docker → Aletcloud

---

## 📁 Project Structure

```
/
├── Dockerfile           # Multi-stage Docker build for Aletcloud
├── aletcloud.yaml       # Aletcloud deployment configuration
├── client/              # React frontend (Vite)
│   ├── src/
│   │   ├── api/axios.js # Smart API URL detection
│   │   ├── pages/       # Page components
│   │   ├── components/  # UI components
│   │   └── context/     # Auth context
│   └── .env             # Local dev settings (not deployed)
└── server/              # Express backend
    ├── server.js        # Main server + CORS + static file serving
    ├── routes/          # API route handlers
    ├── controllers/     # Business logic
    ├── models/          # Mongoose schemas
    └── .env.example     # Environment variable reference
```
