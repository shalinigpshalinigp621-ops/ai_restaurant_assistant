# 🍽️ Intelligent Restaurant Analytics and Knowledge Assistant

An end-to-end, production-ready AI-powered Restaurant Analytics and Knowledge Assistant designed to enable restaurant owners, managers, and staff to monitor operations, analyze business performance, optimize inventory, reduce food waste, detect operational trends, forecast dish demand, generate reports, and interact with a Retrieval-Augmented Generation (RAG) AI assistant.

---

## 🌟 Key Features

### 1. 🤖 AI Knowledge Assistant & RAG Pipeline
- **Vector Knowledge Database**: Powered by **ChromaDB** storing indexed menu items, operational policies, ingredient specifications, and FAQs.
- **Generative AI Integration**: Powered by **Google Gemini 2.5 Flash** with domain context retrieval.
- **Interactive Chat UI**: ChatGPT-style interface with real-time vector source badges, quick prompt pills, and conversation history.
- **Knowledge Base Manager**: Web interface to index new custom operational documents into the vector store.

### 2. 🧠 Machine Learning Engine
- **7-Day Demand Forecasting**: Statistical trend regression modeling (`scikit-learn` Linear Regression) predicting item order demand.
- **Customer RFM Segmentation**: **K-Means Clustering** categorizing customers into *VIP High Value*, *Regular Loyalists*, and *Occasional/At-Risk* segments based on Recency, Frequency, and Monetary spend.
- **Anomaly Detection**: Statistical outlier detection flagging unusual food waste costs and critical inventory reorder thresholds.

### 3. 📊 Restaurant Operations & Analytics
- **Executive Dashboard**: Real-time KPI summaries (Revenue, Orders, Low Stock Alerts, Waste Loss) and sales charts.
- **Menu & Order Management**: Complete dish catalog management and live order state transitions (Pending ➔ Preparing ➔ Ready ➔ Completed).
- **Inventory & Food Waste**: Raw material stock tracking, reorder point alerts, and waste reason logging (spoilage, prep errors).
- **Employee & Supplier Roster**: Staff roles (Admin, Manager, Staff), shift tracking, and supplier contact mapping.
- **Customer Reviews & Reports**: Sentiment tracking, star ratings breakdown, and exportable PDF/Excel business reports.

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React.js 18 + Vite
- **Styling**: Vanilla CSS with modern Design Tokens & Glassmorphism Aesthetics
- **Icons & UI**: Bootstrap Icons, Chart.js, React Router v6, Axios, React Hot Toast

### Backend
- **Framework**: Python 3.11 + FastAPI
- **Database ORM**: SQLAlchemy (Async Engine with Asyncpg / Psycopg2)
- **Authentication**: JWT Tokens (PyJWT / Python-Jose) with Bcrypt password hashing
- **Machine Learning**: Scikit-learn, Pandas, NumPy

### Vector Database & AI
- **Vector DB**: ChromaDB 0.5.23
- **Generative AI**: Google Gemini API (`google-generativeai` - `gemini-2.5-flash`)

### Containerization & Deployment
- **Docker**: `docker-compose` for PostgreSQL 15, ChromaDB, FastAPI, and Nginx React frontend.

---

## 📁 Repository Structure

```
restaurant/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI REST API routes (/api/v1)
│   │   ├── core/         # DB, Security, Config, VectorDB manager
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── repositories/ # Repository pattern data access
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── services/     # Business logic, AI RAG engine, ML models
│   │   └── main.py       # FastAPI application entrypoint
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # Layout, Header, Sidebar, ProtectedRoute, Auth
│   │   ├── context/      # AuthContext provider
│   │   ├── pages/        # Dashboard, Menu, Orders, AIAssistant, Analytics, etc.
│   │   ├── services/     # Axios API client methods
│   │   └── App.jsx       # Route definitions
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start & Installation

### Option 1: Running with Docker Compose (Recommended)

1. Clone the repository and navigate into the root directory:
   ```bash
   cd restaurant
   ```

2. Start the complete application stack (PostgreSQL, ChromaDB, FastAPI Backend, React Frontend):
   ```bash
   docker-compose up --build -d
   ```

3. Open your browser:
   - **Frontend UI**: `http://localhost:3000`
   - **Backend OpenAPI Docs**: `http://localhost:8000/docs`
   - **ChromaDB Service**: `http://localhost:8001`

---

### Option 2: Running Locally

#### 1. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Run FastAPI server with Uvicorn
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server
npm run dev
```

---

## 🔐 Environment Variables (`.env`)

```env
# Application
SECRET_KEY=your-super-secret-key-change-in-production-minimum-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Database
DATABASE_URL=postgresql+asyncpg://username:password@localhost:5432/restaurant_db

# Google Gemini Generative AI
GOOGLE_API_KEY=your-google-gemini-api-key-here
GEMINI_MODEL=gemini-2.5-flash

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8001
CHROMA_PERSIST_DIR=./chroma_data
```

---

## 📑 API Documentation

Once the backend is running, access the interactive Swagger UI at `http://localhost:8000/docs`.

Key API Route Prefixes:
- `/api/v1/auth` — Registration, Login, Token Refresh
- `/api/v1/dashboard` — Operational KPIs & Summary Metrics
- `/api/v1/orders` — Order Creation & State Tracking
- `/api/v1/menu` — Menu Categories & Dish Items
- `/api/v1/inventory` — Stock Levels & Reorder Triggers
- `/api/v1/waste` — Food Waste Logging
- `/api/v1/ai` — RAG Chat Assistant & Vector Knowledge Store
- `/api/v1/analytics` — Demand Forecasting, RFM Customer Clustering, Anomaly Detection
