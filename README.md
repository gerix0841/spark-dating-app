# Spark — Real-Time Dating Platform

A full-stack dating application built with FastAPI, React, and WebSockets. Users discover nearby people, swipe, match, and chat in real time. The project is fully containerised and ships with a production-grade observability stack.

---

## Features

- **Location-based discovery** — Haversine-distance ranking with Redis caching
- **Swipe & match** — mutual-like detection with instant WebSocket notification
- **Real-time chat** — persistent messages with read receipts and unread indicators
- **Profile & photos** — Cloudinary image storage, up to 6 photos per profile
- **AI support bot** — Claude Haiku answers in-app questions (switches language automatically)
- **Contact support** — users submit categorised messages; admins receive email via Mailpit
- **Report system** — flag users with reason + description; email dispatched to admin list
- **Observability** — Prometheus metrics, Loki log aggregation, Grafana dashboards, cAdvisor

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy, Pydantic |
| Frontend | React 19, Vite, Tailwind CSS v4, Framer Motion |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| AI | Anthropic Claude Haiku |
| Email (local) | Mailpit |
| Media | Cloudinary |
| Observability | Prometheus, Loki, Grafana, cAdvisor |
| Infrastructure | Docker, Docker Compose |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- Git
- A free [Cloudinary](https://cloudinary.com) account (for image uploads)
- An [Anthropic API key](https://console.anthropic.com) (for the support bot)

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/gerix0841/spark.git
cd spark
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:

| Variable | Where to get it |
|---|---|
| `SECRET_KEY` | Run `openssl rand -hex 32` in your terminal |
| `CLOUDINARY_CLOUD_NAME` | [Cloudinary Console](https://cloudinary.com/console) |
| `CLOUDINARY_API_KEY` | [Cloudinary Console](https://cloudinary.com/console) |
| `CLOUDINARY_API_SECRET` | [Cloudinary Console](https://cloudinary.com/console) |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com) |

The `MAIL_*` variables are pre-configured for Mailpit and do not need to be changed.

### 3. Configure admin email recipients

```bash
cp spark-backend/admin_emails.example.json spark-backend/admin_emails.json
```

Edit `spark-backend/admin_emails.json` and add the email addresses that should receive contact support requests and user reports:

```json
[
  { "name": "Your Name", "email": "you@example.com" }
]
```

### 4. Start the stack

```bash
docker compose up --build
```

The first build takes a few minutes. Once running, all services are available at the URLs below.

---

## Services

| Service | URL | Notes |
|---|---|---|
| Frontend | http://localhost:5173 | Main application |
| Backend API | http://localhost:8080 | REST + WebSocket |
| Swagger docs | http://localhost:8080/docs | Interactive API reference |
| Mailpit | http://localhost:8025 | View contact/report emails |
| Grafana | http://localhost:3000 | Dashboards (login: `admin` / `admin`) |
| Redis Insight | http://localhost:5540 | Cache browser |
| Prometheus | http://localhost:9090 | Raw metrics |
| cAdvisor | http://localhost:8081 | Container resource usage |

---

## Project Structure

```
spark/
├── spark-backend/
│   ├── app/
│   │   ├── api/v1/          # Route handlers (auth, users, chat, support, contact)
│   │   ├── core/            # Config, security, Redis, mail, logger
│   │   ├── crud/            # Database operations
│   │   ├── models/          # SQLAlchemy ORM models
│   │   └── schemas/         # Pydantic request/response schemas
│   ├── tests/               # pytest test suite
│   ├── admin_emails.json    # Admin recipient list (git-ignored, copy from .example)
│   ├── requirements.txt
│   └── Dockerfile
├── spark-frontend/
│   ├── src/
│   │   ├── api/             # Axios instance
│   │   ├── components/      # React components
│   │   ├── constants/       # Interest options and icons
│   │   ├── context/         # Auth context
│   │   └── utils/           # Geolocation helper
│   └── Dockerfile
├── grafana/                 # Grafana provisioning
├── prometheus.yml
├── loki-config.yaml
├── docker-compose.yml
├── .env.example             # Copy to .env and fill in values
└── .gitignore
```

---

## API Reference

Full interactive documentation is available at **http://localhost:8080/docs** when the stack is running.

Key endpoint groups:

| Prefix | Description |
|---|---|
| `POST /auth/register` | Create account |
| `POST /auth/login` | Obtain JWT token |
| `GET /users/discovery` | Fetch nearby users (cached) |
| `POST /users/swipe` | Like or skip a user |
| `GET /users/matches` | List mutual matches |
| `WS /chat/ws/{user_id}` | Real-time WebSocket chat |
| `POST /support/chat` | AI support bot |
| `POST /contact/send` | Contact support email |
| `POST /contact/report` | Report a user |

---

## Running Tests

```bash
docker compose exec backend pytest
```

---

## How it works

**Discovery** — On login the frontend syncs the user's GPS position. The backend queries all compatible users within 200 km, ranks them by proximity and shared interests, and caches the result in Redis for 10 minutes.

**Matching** — A match row is created when two users both swipe right. Both receive a WebSocket `new_match` event instantly.

**Chat** — Messages are sent over a persistent WebSocket connection, saved to PostgreSQL, and forwarded to the recipient if they are online. Unread counts are tracked in `localStorage` and cleared on conversation open.

**Support bot** — Powered by Claude Haiku. The system prompt restricts it to Spark-related topics only. It responds in English by default and mirrors the user's language if they write in another one.

**Email (Mailpit)** — Contact and report submissions are emailed to every address in `admin_emails.json`. In local development Mailpit intercepts all outgoing SMTP traffic so no real email account is needed. Open http://localhost:8025 to read the messages.

---

## License

MIT
