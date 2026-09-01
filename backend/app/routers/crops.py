from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    CropRecommendationRequest,
    CropRecommendationResponse,
    CropComparisonRequest,
    CropComparisonResponse,
    CropCatalogResponse,
    CropMethodologyResponse,
)
from app.engines.crop_recommender import crop_engine

router = APIRouter(prefix="/api/v1/crops", tags=["Crop Recommendation & Advisory"])


@router.post(
    "/recommend",
    response_model=CropRecommendationResponse,
    summary="Get Farmer-First Hydro-Agronomic Crop Recommendations",
    description="Evaluates farm soil, season, rainfall, and DWLR groundwater telemetry to rank top 3 recommended crops and flag unsuitable high-water crops. Data Mode: DEMO_SIMULATION.",
)
def recommend_crops(request: CropRecommendationRequest) -> CropRecommendationResponse:
    if request.farm_area_acres is not None and request.farm_area_acres <= 0.0:
        raise HTTPException(
            status_code=422,
            detail="Farm area must be greater than 0.0 acres.",
        )
    try:
        return crop_engine.evaluate_recommendations(request)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post(
    "/compare",
    response_model=CropComparisonResponse,
    summary="Compare Selected Crops Side-by-Side",
    description="Scores and compares multiple specified crop IDs against the farm profile and groundwater constraints.",
)
def compare_crops(request: CropComparisonRequest) -> CropComparisonResponse:
    try:
        return crop_engine.compare_crops(request)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get(
    "/catalog",
    response_model=CropCatalogResponse,
    summary="Get Full Crop Profile Catalog",
    description="Returns catalogue of supported kharif, rabi, and zaid crops with agronomic attributes, water demand in mm, and aquifer impacts.",
)
def get_crop_catalog() -> CropCatalogResponse:
    return crop_engine.get_catalog()


@router.get(
    "/methodology",
    response_model=CropMethodologyResponse,
    summary="Get Crop Scoring Model & Methodology",
    description="Returns the 5 component scoring weights (Soil 25%, Water 25%, Season 15%, Rainfall 15%, Groundwater 20%), tier thresholds, and limitations.",
)
def get_crop_methodology() -> CropMethodologyResponse:
    return crop_engine.get_methodology()
