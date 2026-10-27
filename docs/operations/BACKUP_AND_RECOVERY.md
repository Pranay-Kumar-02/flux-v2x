# FluxV2X Backup & Disaster Recovery Procedures

This guide provides operational runbooks for backing up, verifying, and restoring the FluxV2X relational database and physical artifact stores.

---

## 1. Critical Data Assets

A complete FluxV2X backup requires two distinct storage targets:

1. **Relational Database**: PostgreSQL database containing users, workspaces, dataset metadata, schema mappings, experiment results, and audit logs.
2. **Columnar & Artifact File Storage**: Directory `data/` containing raw Parquet files (`data/datasets/*.parquet`) and serialized model weights (`data/models/*.joblib`).

---

## 2. PostgreSQL Backup & Restore

### 2.1 Automated Database Dump (`pg_dump`)
```bash
# Execute within container or via cron
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker compose exec -T postgres pg_dump -U fluxv2x_user -F c fluxv2x_db > /backups/fluxv2x_db_${TIMESTAMP}.dump

# Verify backup size and integrity
ls -lh /backups/fluxv2x_db_${TIMESTAMP}.dump
```

### 2.2 Database Restoration (`pg_restore`)
```bash
# 1. Stop backend services to avoid concurrent writes
docker compose stop backend

# 2. Restore database from custom-format dump
docker compose exec -T postgres pg_restore -U fluxv2x_user -d fluxv2x_db --clean --if-exists /backups/fluxv2x_db_TARGET.dump

# 3. Restart backend service
docker compose start backend
```

---

## 3. SQLite Local Database Backup
For local development environments using SQLite:
```bash
# Safe online backup using SQLite CLI
sqlite3 backend/fluxv2x.db ".backup 'backend/fluxv2x_backup.db'"
```

---

## 4. File Storage & Artifact Backup

The `data/` directory contains immutable files indexed by SHA-256 hashes. These should be backed up using `rsync` or tar archives:
```bash
# Create compressed archive of all parquet datasets and model artifacts
tar -czvf /backups/fluxv2x_storage_${TIMESTAMP}.tar.gz -C data/ datasets models

# Restore files
tar -xzvf /backups/fluxv2x_storage_TARGET.tar.gz -C data/
```

---

## 5. Disaster Recovery Testing Runbook

To verify backup validity, conduct a dry-run restoration at least quarterly:

1. Deploy an isolated test environment:
   ```bash
   docker compose -f docker-compose.yml -p fluxv2x_dr up -d postgres
   ```
2. Restore the database dump onto the test container:
   ```bash
   docker compose -p fluxv2x_dr exec -T postgres pg_restore -U fluxv2x_user -d fluxv2x_db < latest_backup.dump
   ```
3. Verify row count consistency:
   ```bash
   docker compose -p fluxv2x_dr exec -T postgres psql -U fluxv2x_user -d fluxv2x_db -c "SELECT COUNT(*) FROM datasets; SELECT COUNT(*) FROM experiments;"
   ```
4. Extract artifact storage and verify SHA-256 digests match `datasets.sha256_hash`:
   ```bash
   sha256sum data/datasets/*.parquet
   ```
5. Tear down the test environment:
   ```bash
   docker compose -p fluxv2x_dr down -v
   ```
