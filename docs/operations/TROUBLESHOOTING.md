# FluxV2X Troubleshooting Guide

This guide details common diagnostic procedures, error symptoms, and resolutions for FluxV2X.

---

## 1. Quick Diagnostics Cheat Sheet

```bash
# Check backend server logs
docker compose logs -f backend

# Verify database connection status
docker compose exec backend uv run python -c "from app.db.session import engine; engine.connect(); print('Database connection OK')"

# Verify backend health check endpoint
curl -s http://localhost:8000/api/v1/health | jq .

# Verify frontend build integrity locally
cd frontend && npm run build
```

---

## 2. Common Issues & Solutions

### Issue 1: Production Startup Fails with Invariant Violation
- **Symptom**: `ValueError: Security invariant violation in production: SECRET_KEY must be at least 32 characters long...`
- **Root Cause**: `ENVIRONMENT="production"` is set in `.env`, but `SECRET_KEY` is using the development default or is too short.
- **Remediation**:
  Generate a secure 32+ character random secret and update `.env`:
  ```bash
  openssl rand -hex 32
  ```

### Issue 2: HTTP 401 Unauthorized on Protected Routes
- **Symptom**: Client receives `{"detail": "Could not validate authentication credentials"}`.
- **Root Cause**: The JWT token is missing, expired, signed with a different `SECRET_KEY`, or belongs to a deactivated user.
- **Remediation**:
  1. Authenticate via `POST /api/v1/auth/login` and obtain a fresh token.
  2. Verify that the client sends `Authorization: Bearer <token>`.
  3. Ensure server system clocks are synchronized via NTP to avoid premature token expiration.

### Issue 3: HTTP 403 Forbidden: "User lacks access to requested workspace"
- **Symptom**: User receives HTTP 403 when creating or viewing datasets.
- **Root Cause**: The client provided an `X-Workspace-Id` header for a workspace where the user is not a registered member.
- **Remediation**:
  Check authorized workspaces via `GET /api/v1/auth/workspaces` and use an authorized workspace ID.

### Issue 4: HTTP 413 Payload Too Large on Upload
- **Symptom**: Dataset upload fails immediately with `{"detail": "File size exceeds the 100MB limit..."}`.
- **Root Cause**: The uploaded dataset exceeds `MAX_UPLOAD_SIZE_BYTES=104857600`.
- **Remediation**:
  Pre-filter or compress the dataset into Parquet format before upload, or split the trace into smaller chronological batches.

### Issue 5: HTTP 422: "Target column cannot be included in features list"
- **Symptom**: Model training fails with validation error.
- **Root Cause**: The selected feature set includes the ground truth label column (`label`), which would cause target leakage.
- **Remediation**:
  Remove the target label column from the `features` array in the experiment configuration.

### Issue 6: SQLite Database Locked in Local Development
- **Symptom**: `sqlite3.OperationalError: database is locked`.
- **Root Cause**: Multiple concurrent processes or unclosed background workers accessing SQLite simultaneously.
- **Remediation**:
  Stop duplicate uvicorn processes or migrate to PostgreSQL for multi-worker concurrency:
  ```bash
  pkill -f uvicorn
  ```
