# FluxV2X Deployment Guide

This guide details deployment options for FluxV2X: local development, containerized Docker Compose, and self-hosted production setups.

---

## 1. Local Development Deployment

Local development utilizes SQLite and decoupled development servers for rapid iteration.

### Prerequisites:
- Python 3.11+ with `uv`
- Node.js 18+ with `npm`

```bash
# 1. Initialize Backend
cd backend
uv sync --extra dev
uv run python -c "from app.db.init_db import init_database; init_database()"
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# 2. In a separate terminal, launch Frontend
cd ../frontend
npm install
npm run dev
```
Navigate your browser to `http://127.0.0.1:5173`.

---

## 2. Docker Compose Deployment (Recommended)

Docker Compose provides a fully containerized stack with PostgreSQL, Redis, FastAPI, and Nginx-served frontend bundle.

### 2.1 Configuration
Create a production `.env` file in the repository root:
```bash
# Generate strong 32+ character secrets
POSTGRES_USER=fluxv2x_user
POSTGRES_PASSWORD=$(openssl rand -hex 24)
POSTGRES_DB=fluxv2x_db
SECRET_KEY=$(openssl rand -hex 32)
ENVIRONMENT=production
DEBUG=false
ALLOWED_ORIGINS=http://localhost,http://localhost:80,https://fluxv2x.yourdomain.com
ENABLE_DEV_BOOTSTRAP=false
AUTO_LOAD_DEMO_DATASET=false
```

### 2.2 Startup Command
```bash
# Validate compose syntax
docker compose config

# Build and start services in the background
docker compose up -d --build

# Inspect service health
docker compose ps
docker compose logs -f backend
```

### 2.3 Network Isolation Architecture
By default in `docker-compose.yml`:
- The `postgres` and `redis` services are placed exclusively on the private bridge network `fluxv2x-network`.
- Database port `5432` is **not published to the host**.
- Only the frontend web server (port `80`) and backend API (port `8000`) are accessible on the host.
- For local debugging, port 5432 can be published using `docker-compose.override.yml.example`.

---

## 3. Reverse Proxy & TLS Configuration (Nginx)

For public production deployments, place an Nginx or Caddy reverse proxy in front of the services:

```nginx
server {
    listen 443 ssl http2;
    server_name fluxv2x.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/fluxv2x.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fluxv2x.yourdomain.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend Single Page App
    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API & Uploads
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 100M;
        proxy_read_timeout 300s;
    }
}
```

---

## 4. Production Go-Live Checklist

Before declaring a deployment live in production:
- [ ] `ENVIRONMENT=production` and `DEBUG=false` are verified.
- [ ] `SECRET_KEY` is at least 32 cryptographically random characters and distinct from git templates.
- [ ] `ENABLE_DEV_BOOTSTRAP=false` and `AUTO_LOAD_DEMO_DATASET=false` are confirmed.
- [ ] PostgreSQL is configured on an internal network with least-privilege credentials.
- [ ] TLS certificates are installed with valid renewal automation (e.g., Certbot).
- [ ] CORS origins in `ALLOWED_ORIGINS` strictly match production domain names.
- [ ] Backup cron jobs are verified and scheduled (see `BACKUP_AND_RECOVERY.md`).
- [ ] Health check endpoint `GET /api/v1/health` returns status `healthy`.
