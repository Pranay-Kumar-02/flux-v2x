import uuid
import datetime
from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import polars as pl

from app.db.session import get_db
from app.models.entities import SchemaMapping, DatasetVersion, Workspace
from app.schemas.api_models import SchemaMappingCreate, SchemaMappingOut
from app.api.deps import get_current_workspace
from app.schema_lab.vcn_adapter import VCNSchemaDefinition

router = APIRouter(prefix="/schemas", tags=["Schema & Feature Lab"])


@router.get("/suggest/{dataset_version_id}")
def suggest_mapping(
    dataset_version_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    version = db.query(DatasetVersion).filter(DatasetVersion.id == dataset_version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    df = pl.read_parquet(version.file_path)
    suggested = VCNSchemaDefinition.suggest_mapping(df.columns)
    canonical_defs = VCNSchemaDefinition.CANONICAL_FIELDS

    return {
        "dataset_version_id": dataset_version_id,
        "available_columns": df.columns,
        "suggested_mapping": suggested,
        "canonical_fields": canonical_defs
    }


@router.post("/{dataset_version_id}", response_model=SchemaMappingOut)
def create_schema_mapping(
    dataset_version_id: str,
    mapping_in: SchemaMappingCreate,
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    version = db.query(DatasetVersion).filter(DatasetVersion.id == dataset_version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    mapping_id = str(uuid.uuid4())
    rec = SchemaMapping(
        id=mapping_id,
        dataset_version_id=dataset_version_id,
        name=mapping_in.name,
        target_domain=mapping_in.target_domain,
        target_label=mapping_in.target_label,
        column_mappings=mapping_in.column_mappings,
        feature_configs=mapping_in.feature_configs,
        created_at=datetime.datetime.utcnow()
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)

    return SchemaMappingOut(
        id=rec.id,
        dataset_version_id=rec.dataset_version_id,
        name=rec.name,
        target_domain=rec.target_domain,
        target_label=rec.target_label,
        column_mappings=rec.column_mappings,
        feature_configs=rec.feature_configs,
        created_at=rec.created_at
    )


@router.get("/list/{dataset_version_id}", response_model=List[SchemaMappingOut])
def list_schema_mappings(
    dataset_version_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    recs = db.query(SchemaMapping).filter(SchemaMapping.dataset_version_id == dataset_version_id).all()
    return [
        SchemaMappingOut(
            id=r.id,
            dataset_version_id=r.dataset_version_id,
            name=r.name,
            target_domain=r.target_domain,
            target_label=r.target_label,
            column_mappings=r.column_mappings,
            feature_configs=r.feature_configs,
            created_at=r.created_at
        )
        for r in recs
    ]
