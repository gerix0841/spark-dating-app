# ⚡ Spark - Real-Time Dating & Social Platform

![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)
![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql)
![Docker](https://img.shields.io/badge/Infrastructure-Docker-2496ED?logo=docker)

**Spark** is a modern, real-time dating application designed to connect people through shared interests and location-based discovery. Built with a focus on speed, reliability, and a seamless user experience.

---

## ✨ Core Features

- **📍 Discovery**: Find users nearby using precise Haversine distance calculations  
- **🔥 Real-time Matching**: Smooth swipe mechanism with instant match notifications  
- **💬 Instant Messaging**: Robust WebSocket-based chat system with delivery and read receipts  
- **📸 Media Management**: Fully integrated image uploading and cloud storage powered by Cloudinary  
- **🛡️ Secure Auth**: JWT-based authentication with secure password hashing via `bcrypt`  
- **🎨 Responsive Design**: A sleek, dark-themed UI built with Tailwind CSS, optimized for all devices  

---

## 🏗️ Technical Stack

| Layer | Technology |
|------|------------|
| **Backend** | Python 3.11, FastAPI, SQLAlchemy, Pydantic |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons |
| **Database** | PostgreSQL 15 |
| **Storage** | Cloudinary API |
| **Infrastructure** | Docker, Docker Compose |

---

## 🚀 Quick Start (with Docker)

The easiest way to get Spark running is by using Docker. Ensure you have Docker Desktop installed.

### 1. Clone the Repository

```bash
git clone https://github.com/gerix0841/spark-dating-app.git
cd spark-dating-app
```

---

### 2. Configure Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Open the `.env` file and provide your Cloudinary keys and a custom `SECRET_KEY`.

---

### 3. Launch the Application

```bash
docker-compose up --build
```

The application will be available at:

- **Frontend**: http://localhost:5173  
- **Backend API**: http://localhost:8080  
- **Interactive API Docs**: http://localhost:8080/docs  

---

## 📁 Project Structure

```
Spark/
├── spark-backend/          # FastAPI Application
├── spark-frontend/         # React + Vite Application
├── docker-compose.yml      # Multi-container orchestration
├── .env.example            # Template for environment variables
└── .gitignore              # Root-level git exclusion rules
```

---

## 🛠️ Local Development (Manual Setup)

### Backend

```bash
cd spark-backend
python -m venv venv
source venv/bin/activate        # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

---

### Frontend

```bash
cd spark-frontend
npm install
npm run dev
```

---

## 🤝 Contributing

1. Fork the Project  
2. Create your Feature Branch  
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Commit your Changes  
   ```bash
   git commit -m "Add some AmazingFeature"
   ```
4. Push to the Branch  
   ```bash
   git push origin feature/AmazingFeature
   ```
5. Open a Pull Request  

---

## 📝 License

Distributed under the MIT License.

---

⭐ If you find this project helpful, please give it a star on GitHub!