from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional

from app.models.schemas import (
    ProviderMetadataSchema,
    SystemProviderMatrixResponse,
)
from app.pipeline.provider_resilience import provider_registry

router = APIRouter(prefix="/providers", tags=["Data Provider Resilience"])


@router.get("/status", response_model=SystemProviderMatrixResponse)
def get_system_provider_status():
    """
    Returns full system-wide data provider status matrix, active provider resolution,
    and operational availability across all 7 registered data providers.
    """
    return provider_registry.get_system_provider_matrix()


@router.get("/active", response_model=ProviderMetadataSchema)
def get_active_provider():
    """
    Returns metadata for the currently active resolved DWLR data provider.
    """
    return provider_registry.get_active_provider_metadata()


from fastapi import Header
from app.routers.auth import ACTIVE_SESSIONS
from app.models.schemas import UserRoleEnum


@router.post("/upload-dataset")
async def upload_custom_dataset(
    file: Optional[UploadFile] = File(None),
    csv_text: Optional[str] = Form(None),
    authorization: Optional[str] = Header(None),
):
    """
    Ingests a custom DWLR dataset (CSV) into the Dataset Upload Provider,
    normalizing observations into the JalKrishi intelligence pipeline.
    Requires administrative or officer role authorization if Bearer token is provided.
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        user = ACTIVE_SESSIONS.get(token)
        if user and user.system_role in [UserRoleEnum.FARMER, UserRoleEnum.READ_ONLY_OFFICIAL]:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Role '{user.system_role.value}' is not authorized to upload custom datasets.",
            )

    if file:
        content = await file.read()
        text_data = content.decode("utf-8", errors="ignore")
        filename = file.filename or "uploaded_dataset.csv"
    elif csv_text:
        text_data = csv_text
        filename = "pasted_dataset.csv"
    else:
        raise HTTPException(status_code=400, detail="Must provide either a CSV file or csv_text form field.")

    count = provider_registry.dataset_upload_provider.ingest_csv_content(text_data, filename)
    if count == 0:
        raise HTTPException(status_code=400, detail="Failed to parse valid DWLR station observations from CSV content.")

    active_provider = provider_registry.get_active_provider_metadata()
    return {
        "status": "success",
        "message": f"Successfully ingested and normalized {count} stations from '{filename}'.",
        "stations_ingested": count,
        "active_provider": active_provider,
    }


@router.post("/clear-dataset")
def clear_custom_dataset(authorization: Optional[str] = Header(None)):
    """
    Clears custom uploaded dataset and reverts to Reference Simulation Provider fallback.
    Requires administrative or officer role authorization if Bearer token is provided.
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        user = ACTIVE_SESSIONS.get(token)
        if user and user.system_role in [UserRoleEnum.FARMER, UserRoleEnum.READ_ONLY_OFFICIAL]:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Role '{user.system_role.value}' is not authorized to clear system datasets.",
            )

    provider_registry.dataset_upload_provider.clear_dataset()
    active_provider = provider_registry.get_active_provider_metadata()
    return {
        "status": "success",
        "message": "Custom dataset cleared. System reverted to Reference Simulation Provider.",
        "active_provider": active_provider,
    }
