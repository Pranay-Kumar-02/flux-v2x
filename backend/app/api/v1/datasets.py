import os
import uuid
import datetime
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import polars as pl

from app.db.session import get_db
from app.core.config import settings
from app.models.entities import Dataset, DatasetVersion, DatasetProfile, Workspace, User
from app.schemas.api_models import DatasetOut, DatasetVersionOut, DatasetPreview, DatasetProfileOut
from app.api.deps import get_current_user, get_current_workspace
from app.ingestion.parser import IngestionEngine
from app.profiling.profiler import DatasetProfiler

router = APIRouter(prefix="/datasets", tags=["Dataset Library & Ingestion"])


@router.post("/upload", response_model=DatasetOut)
async def upload_dataset(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    is_synthetic: bool = Form(False),
    provenance: Optional[str] = Form("user_upload"),
    workspace: Workspace = Depends(get_current_workspace),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file has no filename.")

    dataset_id = str(uuid.uuid4())
    version_id = str(uuid.uuid4())
    upload_dir = os.path.join(settings.LOCAL_STORAGE_PATH, dataset_id)
    derived_dir = os.path.join(settings.DERIVED_STORAGE_PATH, dataset_id)
    os.makedirs(upload_dir, exist_ok=True)
    os.makedirs(derived_dir, exist_ok=True)

    sanitized_filename = os.path.basename(file.filename)
    raw_path = os.path.join(upload_dir, sanitized_filename)

    with open(raw_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(raw_path)
    file_format = IngestionEngine.detect_format(raw_path, sanitized_filename)
    dest_parquet_path = os.path.join(derived_dir, "v1.parquet")

    try:
        row_count, col_count, sha256_hash = IngestionEngine.ingest_and_standardize(
            raw_path, dest_parquet_path, file_format
        )
    except Exception as e:
        if os.path.exists(raw_path):
            os.remove(raw_path)
        raise HTTPException(status_code=400, detail=f"Failed to ingest file: {str(e)}")

    display_name = name or os.path.splitext(sanitized_filename)[0]

    dataset = Dataset(
        id=dataset_id,
        workspace_id=workspace.id,
        name=display_name,
        description=description,
        file_format=file_format,
        file_path=raw_path,
        file_size_bytes=file_size,
        sha256_hash=sha256_hash,
        row_count=row_count,
        column_count=col_count,
        is_synthetic=is_synthetic,
        provenance=provenance,
        created_at=datetime.datetime.utcnow()
    )
    db.add(dataset)

    version = DatasetVersion(
        id=version_id,
        dataset_id=dataset_id,
        version_num=1,
        file_path=dest_parquet_path,
        row_count=row_count,
        column_count=col_count,
        sha256_hash=sha256_hash,
        transformation_metadata={"initial_import": True, "raw_format": file_format},
        created_at=datetime.datetime.utcnow()
    )
    db.add(version)
    db.commit()

    # Automatically compute and store dataset profile
    try:
        df = pl.read_parquet(dest_parquet_path)
        profile_dict = DatasetProfiler.profile_dataframe(df)
        db_profile = DatasetProfile(
            id=str(uuid.uuid4()),
            dataset_version_id=version_id,
            profile_data=profile_dict,
            created_at=datetime.datetime.utcnow()
        )
        db.add(db_profile)
        db.commit()
    except Exception:
        pass

    db.refresh(dataset)
    return DatasetOut(
        id=dataset.id,
        workspace_id=dataset.workspace_id,
        name=dataset.name,
        description=dataset.description,
        file_format=dataset.file_format,
        file_size_bytes=dataset.file_size_bytes,
        sha256_hash=dataset.sha256_hash,
        row_count=dataset.row_count,
        column_count=dataset.column_count,
        is_synthetic=dataset.is_synthetic,
        provenance=dataset.provenance,
        created_at=dataset.created_at,
        versions_count=1
    )


@router.get("", response_model=List[DatasetOut])
def list_datasets(
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    datasets = db.query(Dataset).filter(Dataset.workspace_id == workspace.id).order_by(Dataset.created_at.desc()).all()
    out = []
    for d in datasets:
        v_count = len(d.versions) if d.versions else 1
        out.append(DatasetOut(
            id=d.id,
            workspace_id=d.workspace_id,
            name=d.name,
            description=d.description,
            file_format=d.file_format,
            file_size_bytes=d.file_size_bytes,
            sha256_hash=d.sha256_hash,
            row_count=d.row_count,
            column_count=d.column_count,
            is_synthetic=d.is_synthetic,
            provenance=d.provenance,
            created_at=d.created_at,
            versions_count=v_count
        ))
    return out


@router.get("/{dataset_id}", response_model=DatasetOut)
def get_dataset(
    dataset_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.workspace_id == workspace.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return DatasetOut(
        id=dataset.id,
        workspace_id=dataset.workspace_id,
        name=dataset.name,
        description=dataset.description,
        file_format=dataset.file_format,
        file_size_bytes=dataset.file_size_bytes,
        sha256_hash=dataset.sha256_hash,
        row_count=dataset.row_count,
        column_count=dataset.column_count,
        is_synthetic=dataset.is_synthetic,
        provenance=dataset.provenance,
        created_at=dataset.created_at,
        versions_count=len(dataset.versions) if dataset.versions else 1
    )


@router.get("/{dataset_id}/preview", response_model=DatasetPreview)
def preview_dataset(
    dataset_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.workspace_id == workspace.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    latest_version = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == dataset.id
    ).order_by(DatasetVersion.version_num.desc()).first()
    if not latest_version or not os.path.exists(latest_version.file_path):
        raise HTTPException(status_code=404, detail="Standardized dataset file not found on disk")

    try:
        df = pl.read_parquet(latest_version.file_path)
        total_rows = df.height
        slice_df = df.slice(offset, limit)
        dtypes = {col: str(df[col].dtype) for col in df.columns}
        records = slice_df.to_dicts()

        return DatasetPreview(
            dataset_id=dataset.id,
            version_id=latest_version.id,
            total_rows=total_rows,
            columns=df.columns,
            data=records,
            dtypes=dtypes
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load preview: {str(e)}")


@router.get("/{dataset_id}/profile", response_model=DatasetProfileOut)
def get_dataset_profile(
    dataset_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.workspace_id == workspace.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    latest_version = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == dataset.id
    ).order_by(DatasetVersion.version_num.desc()).first()
    if not latest_version:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    profile_rec = db.query(DatasetProfile).filter(
        DatasetProfile.dataset_version_id == latest_version.id
    ).first()

    if profile_rec:
        pdata = profile_rec.profile_data
        return DatasetProfileOut(
            dataset_version_id=latest_version.id,
            total_rows=pdata.get("total_rows", 0),
            total_columns=pdata.get("total_columns", 0),
            duplicate_rows=pdata.get("duplicate_rows", 0),
            duplicate_percentage=pdata.get("duplicate_percentage", 0.0),
            memory_usage_mb=pdata.get("memory_usage_mb", 0.0),
            columns=pdata.get("columns", []),
            class_distribution=pdata.get("class_distribution"),
            leakage_warnings=pdata.get("leakage_warnings", []),
            created_at=profile_rec.created_at
        )

    # Compute on the fly if missing
    try:
        df = pl.read_parquet(latest_version.file_path)
        pdata = DatasetProfiler.profile_dataframe(df)
        new_prof = DatasetProfile(
            id=str(uuid.uuid4()),
            dataset_version_id=latest_version.id,
            profile_data=pdata,
            created_at=datetime.datetime.utcnow()
        )
        db.add(new_prof)
        db.commit()

        return DatasetProfileOut(
            dataset_version_id=latest_version.id,
            total_rows=pdata.get("total_rows", 0),
            total_columns=pdata.get("total_columns", 0),
            duplicate_rows=pdata.get("duplicate_rows", 0),
            duplicate_percentage=pdata.get("duplicate_percentage", 0.0),
            memory_usage_mb=pdata.get("memory_usage_mb", 0.0),
            columns=pdata.get("columns", []),
            class_distribution=pdata.get("class_distribution"),
            leakage_warnings=pdata.get("leakage_warnings", []),
            created_at=datetime.datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to profile dataset: {str(e)}")


@router.delete("/{dataset_id}")
def delete_dataset(
    dataset_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.workspace_id == workspace.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    db.delete(dataset)
    db.commit()
    return {"message": "Dataset successfully deleted", "dataset_id": dataset_id}
