# FluxV2X Environment Configuration & Invariant Rules

FluxV2X utilizes Pydantic v2 `BaseSettings` (`backend/app/core/config.py`) to manage environment configuration with strict, fail-closed security invariant validation.

---

## 1. Supported Environment Variables

| Variable Name | Default (Development) | Production Requirement | Purpose |
| :--- | :--- | :--- | :--- |
| **`PROJECT_NAME`** | `FluxV2X` | `FluxV2X` | Application identity string. |
| **`VERSION`** | `0.2.0` | `0.2.0` | SemVer application release version. |
| **`ENVIRONMENT`** | `development` | `production` | Active deployment environment mode. |
| **`DEBUG`** | `False` | **Must be `False`** | FastAPI debug mode and OpenAPI exposure. |
| **`SECRET_KEY`** | `fluxv2x-dev-local...` | **Must be $\ge 32$ chars random string** | Cryptographic secret for signing JWT tokens. |
| **`ACCESS_TOKEN_EXPIRE_MINUTES`** | `1440` (24 hours) | Configurable (e.g., `60`–`480`) | JWT token lifetime before re-authentication. |
| **`JWT_ALGORITHM`** | `HS256` | `HS256` | Permitted signature algorithm. |
| **`DATABASE_URL`** | `sqlite:///./fluxv2x.db` | `postgresql://user:pass@host:5432/db` | Relational database connection string. |
| **`ALLOWED_ORIGINS`** | `http://localhost:5173,...` | Explicit domain list (comma-separated) | CORS allowed origin domains. |
| **`ENABLE_DEV_BOOTSTRAP`** | `False` | **Must be `False`** | Prohibited in production. Gated seed helper. |
| **`AUTO_LOAD_DEMO_DATASET`** | `False` | **Must be `False`** | Prohibited in production. Auto-seed flag. |

---

## 2. Production Security Invariant Rules

When `ENVIRONMENT="production"`, the application executes `validate_security_invariants()` at startup. The process **immediately halts and terminates with a `ValueError`** if any of the following conditions are detected:

1. **Weak or Default Secret Key**:
   - `SECRET_KEY` is shorter than 32 characters.
   - `SECRET_KEY` matches known development patterns: `fluxv2x-dev-local-secret-key...`, `change_this_in_production...`, `secret`, `password`.
2. **Debug Mode Active**:
   - `DEBUG=True` is detected in production.
3. **Development Bootstrapping Enabled**:
   - `ENABLE_DEV_BOOTSTRAP=True` is detected in production.
4. **Demo Data Auto-Loading Enabled**:
   - `AUTO_LOAD_DEMO_DATASET=True` is detected in production.
5. **Weak Database Credentials**:
   - `DATABASE_URL` contains default passwords (`password`, `postgres`, `admin`).

---

## 3. Example Environment Files

### Development (`.env`):
```ini
ENVIRONMENT=development
DEBUG=True
SECRET_KEY=fluxv2x-dev-local-secret-key-not-for-production-min-32-chars
DATABASE_URL=sqlite:///./fluxv2x.db
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ENABLE_DEV_BOOTSTRAP=False
AUTO_LOAD_DEMO_DATASET=False
```

### Production (`.env`):
```ini
ENVIRONMENT=production
DEBUG=False
SECRET_KEY=c4f8d93e1a7b520c4e9f3b8d107a6e5f839201bc64d2719a84e3f21059b8c7e1
DATABASE_URL=postgresql://fluxv2x_user:k9Xm2$PqL9vWz7@postgres:5432/fluxv2x_prod
ALLOWED_ORIGINS=https://fluxv2x.yourdomain.com
ENABLE_DEV_BOOTSTRAP=False
AUTO_LOAD_DEMO_DATASET=False
```
*(Never commit actual production `.env` files into source control.)*
