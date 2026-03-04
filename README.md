# ⚡ Spark - Real-Time Dating & Social Platform

Spark is a modern, real-time dating application designed to connect people through shared interests and location-based discovery.  
Built with a focus on **speed, reliability, and professional observability**.

---

## ✨ Core Features

### 📍 Discovery
Find users nearby using precise **Haversine distance calculations**.

### ⚡ High Performance
Multi-level caching via **Redis** for:
- Discovery results
- Matches
- User profiles

### 💬 Instant Messaging
Robust **WebSocket-based** real-time chat system.

### 📸 Media Management
Cloudinary-powered image handling for scalable media storage.

### 📊 Professional Observability
Full metrics and logging stack:
- Prometheus
- Loki
- Grafana

### 🛡️ Secure Authentication
- JWT-based authentication
- bcrypt password hashing

---

# 🏗️ Technical Stack & Infrastructure

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.11, FastAPI, SQLAlchemy, Pydantic |
| **Frontend** | React 19, Vite, Tailwind CSS, Lucide Icons |
| **Database** | PostgreSQL 15 |
| **Cache & NoSQL** | Redis 7 |
| **Observability** | Prometheus (Metrics), Loki (Logs), Grafana (Dashboard) |
| **Container Stats** | Google cAdvisor |
| **Infrastructure** | Docker, Docker Compose |

---

# 🚀 Quick Start (Docker)

The entire ecosystem is containerized for a **"one-command" setup**.

## 1️⃣ Clone & Configure

```bash
git clone https://github.com/gerix0841/spark-dating-app.git
cd spark-dating-app
cp .env.example .env   # Fill in your Cloudinary credentials
```

## 2️⃣ Launch the Ecosystem

```bash
docker-compose up --build -d
```

---

## 🔗 Access Portal (Localhost)

| Service | URL | Description |
|----------|------|------------|
| **Frontend** | http://localhost:5173 | User Interface |
| **Backend Docs** | http://localhost:8080/docs | Interactive Swagger API |
| **Grafana** | http://localhost:3000 | Monitoring Dashboard (Admin: admin/admin) |
| **Redis Insight** | http://localhost:5540 | Visual Cache Management |
| **Prometheus** | http://localhost:9090 | Time-series metrics |

---

## 📈 Monitoring & Performance

Spark uses a professional-grade observability stack to ensure system health:

### 🔥 Redis Caching
Dramatically reduces database load by caching:
- Expensive Discovery queries
- Match lists
- User profiles

### 📊 Prometheus Metrics
Tracks API performance in real-time:
- API response latency
- Request counts per endpoint
- HTTP error rates  

Integrated via `prometheus-fastapi-instrumentator`.

### 🧾 Grafana Loki
Centralized log aggregation. All container logs flow into Grafana for unified debugging and error tracking.

### 📦 cAdvisor
Provides real-time resource usage monitoring for every container in the stack:
- CPU core usage
- Memory (RAM) footprint
- Network I/O

---

## 📁 Project Structure

```plaintext
Spark/
├── spark-backend/         # FastAPI Application & CRUD logic
├── spark-frontend/        # React + Vite (Tailwind CSS)
├── grafana/               # Provisioning & Dashboard configs
├── prometheus.yml         # Metrics scraping configuration
├── loki-config.yaml       # Log aggregation settings
├── docker-compose.yml     # Full-stack orchestration
└── .env                   # Environment secrets
```

---

## 📝 License

Distributed under the MIT License.

---

## ⭐ Support

If you find this project helpful, please give it a ⭐ on GitHub!