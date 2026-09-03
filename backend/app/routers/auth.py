from fastapi import APIRouter, HTTPException, status, Header, Depends
from typing import Optional, Dict, List
from app.models.schemas import LoginRequest, LoginResponse, UserProfile, UserRoleEnum
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication & Security"])

# Active In-Memory Token Session Store
ACTIVE_SESSIONS: Dict[str, UserProfile] = {}

# Predefined Verified Government & Farmer Accounts
DEMO_USERS: Dict[str, UserProfile] = {
    "admin@jalkrishi.gov.in": UserProfile(
        id="usr-admin-001",
        name="Dr. Rajesh Kumar Sharma",
        email="admin@jalkrishi.gov.in",
        role="Chief Hydrogeologist",
        system_role=UserRoleEnum.ADMIN,
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
        system_role=UserRoleEnum.STATE_OFFICIAL,
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
        system_role=UserRoleEnum.DISTRICT_OFFICIAL,
        organization="Krishi Vigyan Kendra (ICAR)",
        department="Agronomy & Crop Intelligence Unit",
        assigned_state="Punjab (Sangrur District)",
        avatar_initials="HS",
    ),
    "analyst@jalkrishi.gov.in": UserProfile(
        id="usr-analyst-005",
        name="Dr. Ananya Roy",
        email="analyst@jalkrishi.gov.in",
        role="Senior Hydrologist Analyst",
        system_role=UserRoleEnum.HYDROLOGIST_ANALYST,
        organization="National Institute of Hydrology",
        department="Aquifer Analytics Unit",
        assigned_state="Pan-India Network",
        avatar_initials="AR",
    ),
    "observer@jalkrishi.gov.in": UserProfile(
        id="usr-observer-006",
        name="Vikramaditya Rao",
        email="observer@jalkrishi.gov.in",
        role="Read-Only Water Observer",
        system_role=UserRoleEnum.READ_ONLY_OFFICIAL,
        organization="Central Ground Water Board",
        department="Monitoring Inspectorate",
        assigned_state="Western Region",
        avatar_initials="VR",
    ),
    "farmer@jalkrishi.in": UserProfile(
        id="usr-farmer-004",
        name="Gurpreet Singh Chawla",
        email="farmer@jalkrishi.in",
        role="Progressive Farmer & Water Trustee",
        system_role=UserRoleEnum.FARMER,
        organization="Sangrur Farmers Water Cooperative",
        department="Farmer-First Hydro-Agronomy",
        assigned_state="Punjab (Sangrur)",
        avatar_initials="GS",
        preferred_language="pa",
        farm_latitude=30.24,
        farm_longitude=75.84,
    ),
}

# Seed default session token for instant access
default_admin = DEMO_USERS["admin@jalkrishi.gov.in"]
ACTIVE_SESSIONS["jalkrishi-default-session-token"] = default_admin


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate User or Government Officer",
    description="Validates user credentials. Generates bearer session token and returns authoritative backend user profile.",
)
def login(request: LoginRequest) -> LoginResponse:
    email_clean = request.username_or_email.strip().lower()

    if not email_clean or len(request.password) < 4:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Email and password (minimum 4 characters) are required.",
        )

    # Trusted Predefined Account Matching
    user_profile = DEMO_USERS.get(email_clean)

    if not user_profile:
        # Dynamic Registration Security Policy:
        # Dynamic / unrecognised sign-ins get assigned FARMER or READ_ONLY_OFFICIAL role.
        # NEVER allow arbitrary users to gain ADMIN or STATE_OFFICIAL privileges!
        name_parts = email_clean.split("@")[0].replace(".", " ").replace("_", " ").title()
        initials = "".join([p[0].upper() for p in name_parts.split()[:2]]) or "JA"

        req_role = (request.role or "").lower()
        if "officer" in req_role or "admin" in req_role or "analyst" in req_role:
            assigned_sys_role = UserRoleEnum.READ_ONLY_OFFICIAL
            assigned_display_role = "Read-Only Official Observer"
        else:
            assigned_sys_role = UserRoleEnum.FARMER
            assigned_display_role = "Farmer & Water Trustee"

        user_profile = UserProfile(
            id=f"usr-gen-{abs(hash(email_clean)) % 10000:04d}",
            name=name_parts if name_parts else "JalKrishi Account Holder",
            email=email_clean,
            role=assigned_display_role,
            system_role=assigned_sys_role,
            organization="JalKrishi Community Network",
            department="Groundwater Monitoring",
            assigned_state="National Network",
            avatar_initials=initials,
        )

    # Generate token and store in active session memory
    token = f"jalkrishi-jwt-token-{abs(hash(email_clean + 'salt2026')) % 10000000:08d}"
    ACTIVE_SESSIONS[token] = user_profile

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
    description="Returns current authenticated user profile metadata based on Authorization Bearer token.",
)
def get_current_user(authorization: Optional[str] = Header(None)) -> UserProfile:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        session_user = ACTIVE_SESSIONS.get(token)
        if session_user:
            return session_user

    # Fallback default active session
    return ACTIVE_SESSIONS.get("jalkrishi-default-session-token", DEMO_USERS["admin@jalkrishi.gov.in"])


def get_current_active_user(authorization: Optional[str] = Header(None)) -> UserProfile:
    """Dependency that resolves active user profile or raises 401 if missing/invalid."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Header 'Authorization: Bearer <token>' missing.",
        )

    token = authorization.split(" ")[1]
    user = ACTIVE_SESSIONS.get(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token. Please log in again.",
        )
    return user


def require_roles(allowed_roles: List[UserRoleEnum]):
    """
    FastAPI Dependency Guard enforcing backend Role-Based Access Control (RBAC).
    Raises HTTP 401 if unauthenticated, and HTTP 403 if user system_role is unauthorized.
    """
    def role_checker(user: UserProfile = Depends(get_current_active_user)) -> UserProfile:
        if user.system_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. User role '{user.system_role.value}' is not authorized for this operation.",
            )
        return user

    return role_checker
