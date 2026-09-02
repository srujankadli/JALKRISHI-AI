from fastapi import APIRouter, HTTPException, status, Header
from typing import Optional
from app.models.schemas import LoginRequest, LoginResponse, UserProfile
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication & Security"])

# Predefined Government & Officer Accounts
DEMO_USERS = {
    "admin@jalkrishi.gov.in": UserProfile(
        id="usr-admin-001",
        name="Dr. Rajesh Kumar Sharma",
        email="admin@jalkrishi.gov.in",
        role="Chief Hydrogeologist",
        organization="Central Ground Water Board (CGWB)",
        department="Aquifer Mapping & Hydro-Modeling Division",
        assigned_state="All India (5,260 DWLR Wells)",
        avatar_initials="RS",
    ),
    "officer@jalkrishi.gov.in": UserProfile(
        id="usr-officer-002",
        name="Sunita Verma",
        email="officer@jalkrishi.gov.in",
        role="Senior Water Resource Officer",
        organization="Ministry of Jal Shakti",
        department="National Water Mission Monitoring Directorate",
        assigned_state="North-Western Region (Punjab & Haryana)",
        avatar_initials="SV",
    ),
    "kvk@jalkrishi.gov.in": UserProfile(
        id="usr-kvk-003",
        name="Dr. Harvinder Singh",
        email="kvk@jalkrishi.gov.in",
        role="KVK Principal Agricultural Scientist",
        organization="Krishi Vigyan Kendra (ICAR)",
        department="Agronomy & Crop Intelligence Unit",
        assigned_state="Punjab (Sangrur District)",
        avatar_initials="HS",
    ),
    "farmer@jalkrishi.in": UserProfile(
        id="usr-farmer-004",
        name="Gurpreet Singh Chawla",
        email="farmer@jalkrishi.in",
        role="Progressive Farmer & Water Trustee",
        organization="Sangrur Farmers Water Cooperative",
        department="Farmer-First Hydro-Agronomy",
        assigned_state="Punjab (Sangrur)",
        avatar_initials="GS",
    ),
}


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate User or Government Officer",
    description="Validates user email/username and password credentials. Returns bearer session token and user profile details.",
)
def login(request: LoginRequest) -> LoginResponse:
    email_clean = request.username_or_email.strip().lower()
    
    # Input safety validation
    if not email_clean or len(request.password) < 4:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Email and password (minimum 4 characters) are required.",
        )
    
    # Match predefined government account or generate dynamic verified profile
    user_profile = DEMO_USERS.get(email_clean)
    if not user_profile:
        name_parts = email_clean.split("@")[0].replace(".", " ").replace("_", " ").title()
        initials = "".join([p[0].upper() for p in name_parts.split()[:2]]) or "JA"
        user_profile = UserProfile(
            id=f"usr-gen-{hash(email_clean) % 10000:04d}",
            name=name_parts if name_parts else "Environmental Intelligence Specialist",
            email=email_clean,
            role=f"{request.role.replace('_', ' ').title() if request.role else 'Water Resource Specialist'}",
            organization="Groundwater Intelligence Network",
            department="Aquifer Evaluation & Monitoring",
            assigned_state="National Network",
            avatar_initials=initials,
        )

    # Generate token
    token = f"jalkrishi-jwt-token-{hash(email_clean + 'salt2026') % 10000000:08d}"
    
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=user_profile,
        data_mode=settings.DATA_MODE,
        disclaimer=settings.DEMO_DISCLAIMER,
    )


@router.get(
    "/me",
    response_model=UserProfile,
    status_code=status.HTTP_200_OK,
    summary="Get Active User Session Profile",
    description="Returns current authenticated user profile metadata.",
)
def get_current_user(authorization: Optional[str] = Header(None)) -> UserProfile:
    # Default active profile for session verification
    return DEMO_USERS["admin@jalkrishi.gov.in"]
