from typing import Optional, List, Dict, Any
from collections import defaultdict
from app.config import settings
from app.models.schemas import (
    DWLRStationSchema,
    StationStatus,
    TrendDirection,
    NetworkAnalyticsSummary,
    StateAnalyticsRow,
    StateAnalyticsResponse,
    StateRiskRankingRow,
    StateRiskRankingResponse,
    DistrictAnalyticsRow,
    DistrictAnalyticsResponse,
    DistrictRiskRankingRow,
    DistrictRiskRankingResponse,
    TrendSummaryResponse,
)
from app.pipeline.dwlr_ingest import station_repo


# ==========================================
# 1. Helper Utility Functions
# ==========================================

def get_risk_category(risk_score: float) -> str:
    """Returns standardized 4-tier risk classification."""
    if risk_score < 0.35:
        return "Low"
    elif risk_score < 0.60:
        return "Medium"
    elif risk_score < 0.80:
        return "High"
    return "Critical"


def get_priority_label(risk_score: float, critical_pct: float) -> str:
    """Determines management intervention priority."""
    if risk_score >= 0.70 or critical_pct >= 25.0:
        return "High"
    elif risk_score >= 0.45 or critical_pct >= 10.0:
        return "Medium"
    return "Low"


def get_dominant_trend(rising: int, stable: int, falling: int) -> str:
    """Identifies the dominant trend direction in a population."""
    max_val = max(rising, stable, falling)
    if max_val == 0:
        return "Stable"
    if max_val == falling:
        return "Falling"
    if max_val == rising:
        return "Rising"
    return "Stable"


# ==========================================
# 2. Analytics Engine Core Calculations
# ==========================================

class GroundwaterAnalyticsEngine:
    """
    Hydrogeological Analytics Calculation Engine.
    Processes DWLR station observations into regional aggregations and risk rankings.
    """

    @staticmethod
    def get_network_summary(
        state: Optional[str] = None,
        district: Optional[str] = None,
        status: Optional[str] = None,
        trend: Optional[str] = None,
        risk: Optional[str] = None,
    ) -> NetworkAnalyticsSummary:
        """Calculates national or filtered network-wide telemetry summary."""
        stations = station_repo.filter_stations(
            state=state,
            district=district,
            status=status,
            trend=trend,
            risk=risk,
        )
        total = len(stations)

        if total == 0:
            return NetworkAnalyticsSummary(
                total_stations=0,
                healthy_stations=0,
                moderate_stations=0,
                warning_stations=0,
                critical_stations=0,
                healthy_percentage=0.0,
                moderate_percentage=0.0,
                warning_percentage=0.0,
                critical_percentage=0.0,
                average_groundwater_depth=0.0,
                average_risk_score=0.0,
                falling_trend_count=0,
                stable_trend_count=0,
                rising_trend_count=0,
                telemetry_health={"online_count": 0, "reporting_rate_pct": 0.0, "status": "No Stations Matching Filter"},
                data_mode=settings.DATA_MODE,
                disclaimer=settings.DEMO_DISCLAIMER,
            )

        healthy = sum(1 for s in stations if s.status == StationStatus.HEALTHY)
        moderate = sum(1 for s in stations if s.status == StationStatus.MODERATE)
        warning = sum(1 for s in stations if s.status == StationStatus.WARNING)
        critical = sum(1 for s in stations if s.status == StationStatus.CRITICAL)

        falling = sum(1 for s in stations if s.trend == TrendDirection.FALLING)
        stable = sum(1 for s in stations if s.trend == TrendDirection.STABLE)
        rising = sum(1 for s in stations if s.trend == TrendDirection.RISING)

        avg_depth = round(sum(s.waterLevel for s in stations) / total, 2)
        avg_risk = round(sum(s.riskScore for s in stations) / total, 3)

        online_count = sum(1 for s in stations if s.telemetryStatus.value == "online")
        reporting_rate = round((online_count / total) * 100.0, 1)

        return NetworkAnalyticsSummary(
            total_stations=total,
            healthy_stations=healthy,
            moderate_stations=moderate,
            warning_stations=warning,
            critical_stations=critical,
            healthy_percentage=round((healthy / total) * 100.0, 1),
            moderate_percentage=round((moderate / total) * 100.0, 1),
            warning_percentage=round((warning / total) * 100.0, 1),
            critical_percentage=round((critical / total) * 100.0, 1),
            average_groundwater_depth=avg_depth,
            average_risk_score=avg_risk,
            falling_trend_count=falling,
            stable_trend_count=stable,
            rising_trend_count=rising,
            telemetry_health={
                "online_count": online_count,
                "reporting_rate_pct": reporting_rate,
                "status": "Optimal Synchronized",
            },
            data_mode=settings.DATA_MODE,
            disclaimer=settings.DEMO_DISCLAIMER,
        )

    @staticmethod
    def get_state_analytics(
        state: Optional[str] = None,
        status: Optional[str] = None,
        trend: Optional[str] = None,
        risk: Optional[str] = None,
    ) -> StateAnalyticsResponse:
        """Calculates state-level groundwater statistics across all represented states."""
        stations = station_repo.filter_stations(
            state=state,
            status=status,
            trend=trend,
            risk=risk,
        )

        filters_applied = {"state": state, "status": status, "trend": trend, "risk": risk}
        clean_filters = {k: v for k, v in filters_applied.items() if v is not None}

        if not stations:
            return StateAnalyticsResponse(
                states=[],
                total_states=0,
                filters_applied=clean_filters,
                data_mode=settings.DATA_MODE,
            )

        # Group by State
        state_groups: Dict[str, List[DWLRStationSchema]] = defaultdict(list)
        for s in stations:
            state_groups[s.state].append(s)

        rows: List[StateAnalyticsRow] = []
        for st_name, st_stations in state_groups.items():
            st_total = len(st_stations)
            healthy = sum(1 for s in st_stations if s.status == StationStatus.HEALTHY)
            moderate = sum(1 for s in st_stations if s.status == StationStatus.MODERATE)
            warning = sum(1 for s in st_stations if s.status == StationStatus.WARNING)
            critical = sum(1 for s in st_stations if s.status == StationStatus.CRITICAL)

            rising = sum(1 for s in st_stations if s.trend == TrendDirection.RISING)
            stable = sum(1 for s in st_stations if s.trend == TrendDirection.STABLE)
            falling = sum(1 for s in st_stations if s.trend == TrendDirection.FALLING)

            avg_depth = round(sum(s.waterLevel for s in st_stations) / st_total, 2)
            avg_risk = round(sum(s.riskScore for s in st_stations) / st_total, 3)

            crit_pct = round((critical / st_total) * 100.0, 1)
            warn_pct = round((warning / st_total) * 100.0, 1)
            hlth_pct = round((healthy / st_total) * 100.0, 1)

            rows.append(
                StateAnalyticsRow(
                    state=st_name,
                    station_count=st_total,
                    average_depth=avg_depth,
                    average_risk_score=avg_risk,
                    healthy_count=healthy,
                    moderate_count=moderate,
                    warning_count=warning,
                    critical_count=critical,
                    healthy_percentage=hlth_pct,
                    warning_percentage=warn_pct,
                    critical_percentage=crit_pct,
                    rising_count=rising,
                    stable_count=stable,
                    falling_count=falling,
                    dominant_trend=get_dominant_trend(rising, stable, falling),
                    risk_category=get_risk_category(avg_risk),
                    priority=get_priority_label(avg_risk, crit_pct),
                )
            )

        # Sort alphabetically by state name
        rows.sort(key=lambda r: r.state)

        return StateAnalyticsResponse(
            states=rows,
            total_states=len(rows),
            filters_applied=clean_filters,
            data_mode=settings.DATA_MODE,
        )

    @staticmethod
    def get_state_risk_ranking(
        status: Optional[str] = None,
        trend: Optional[str] = None,
        risk: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> StateRiskRankingResponse:
        """
        Ranks states by a transparent demonstration regional risk score.
        Formula: demo_regional_risk_score = 0.35*(critical_pct/100) + 0.20*(warning_pct/100) + 0.25*avg_risk + 0.20*(falling_pct/100)
        """
        state_resp = GroundwaterAnalyticsEngine.get_state_analytics(
            status=status,
            trend=trend,
            risk=risk,
        )

        ranked_rows: List[StateRiskRankingRow] = []
        formula_desc = "demo_regional_risk_score = 0.35*(critical_pct/100) + 0.20*(warning_pct/100) + 0.25*avg_risk + 0.20*(falling_pct/100)"

        for row in state_resp.states:
            total = row.station_count
            crit_ratio = row.critical_count / total if total > 0 else 0.0
            warn_ratio = row.warning_count / total if total > 0 else 0.0
            fall_ratio = row.falling_count / total if total > 0 else 0.0

            calc_score = round(
                0.35 * crit_ratio + 0.20 * warn_ratio + 0.25 * row.average_risk_score + 0.20 * fall_ratio,
                3,
            )

            falling_pct = round(fall_ratio * 100.0, 1)

            ranked_rows.append(
                StateRiskRankingRow(
                    rank=0,  # assigned after sorting
                    state=row.state,
                    risk_score=calc_score,
                    risk_category=get_risk_category(calc_score),
                    critical_count=row.critical_count,
                    warning_count=row.warning_count,
                    falling_percentage=falling_pct,
                    priority=get_priority_label(calc_score, row.critical_percentage),
                    formula=formula_desc,
                )
            )

        # Sort descending by risk score, then alphabetically
        ranked_rows.sort(key=lambda r: (-r.risk_score, r.state))

        # Assign 1-indexed ranks
        for idx, r in enumerate(ranked_rows, start=1):
            r.rank = idx

        if limit and limit > 0:
            ranked_rows = ranked_rows[:limit]

        return StateRiskRankingResponse(
            rankings=ranked_rows,
            total_ranked=len(ranked_rows),
            data_mode=settings.DATA_MODE,
            disclaimer=settings.DEMO_DISCLAIMER,
        )

    @staticmethod
    def get_district_analytics(
        state: Optional[str] = None,
        district: Optional[str] = None,
        status: Optional[str] = None,
        trend: Optional[str] = None,
        risk: Optional[str] = None,
    ) -> DistrictAnalyticsResponse:
        """Calculates district-level groundwater statistics."""
        stations = station_repo.filter_stations(
            state=state,
            district=district,
            status=status,
            trend=trend,
            risk=risk,
        )

        filters_applied = {"state": state, "district": district, "status": status, "trend": trend, "risk": risk}
        clean_filters = {k: v for k, v in filters_applied.items() if v is not None}

        if not stations:
            return DistrictAnalyticsResponse(
                districts=[],
                total_districts=0,
                filters_applied=clean_filters,
                data_mode=settings.DATA_MODE,
            )

        # Group by (state, district)
        dist_groups: Dict[tuple, List[DWLRStationSchema]] = defaultdict(list)
        for s in stations:
            dist_groups[(s.state, s.district)].append(s)

        rows: List[DistrictAnalyticsRow] = []
        for (st_name, dist_name), dist_stations in dist_groups.items():
            d_total = len(dist_stations)
            healthy = sum(1 for s in dist_stations if s.status == StationStatus.HEALTHY)
            moderate = sum(1 for s in dist_stations if s.status == StationStatus.MODERATE)
            warning = sum(1 for s in dist_stations if s.status == StationStatus.WARNING)
            critical = sum(1 for s in dist_stations if s.status == StationStatus.CRITICAL)

            rising = sum(1 for s in dist_stations if s.trend == TrendDirection.RISING)
            stable = sum(1 for s in dist_stations if s.trend == TrendDirection.STABLE)
            falling = sum(1 for s in dist_stations if s.trend == TrendDirection.FALLING)

            avg_depth = round(sum(s.waterLevel for s in dist_stations) / d_total, 2)
            avg_risk = round(sum(s.riskScore for s in dist_stations) / d_total, 3)

            crit_pct = round((critical / d_total) * 100.0, 1)
            warn_pct = round((warning / d_total) * 100.0, 1)
            fall_pct = round((falling / d_total) * 100.0, 1)

            # Days to critical inspection
            days_vals = [s.daysToCritical for s in dist_stations if s.daysToCritical is not None]
            avg_days = round(sum(days_vals) / len(days_vals)) if days_vals else None

            days_summary = {
                "days_to_critical_available": False,
                "note": "Initial observed estimate. Full multi-horizon scientific projections will be implemented in Phase D.",
                "observed_avg_days": avg_days,
            }

            rows.append(
                DistrictAnalyticsRow(
                    state=st_name,
                    district=dist_name,
                    station_count=d_total,
                    average_depth=avg_depth,
                    average_risk_score=avg_risk,
                    healthy_count=healthy,
                    moderate_count=moderate,
                    warning_count=warning,
                    critical_count=critical,
                    critical_percentage=crit_pct,
                    warning_percentage=warn_pct,
                    dominant_trend=get_dominant_trend(rising, stable, falling),
                    falling_percentage=fall_pct,
                    risk_category=get_risk_category(avg_risk),
                    days_to_critical_summary=days_summary,
                )
            )

        # Sort alphabetically by state, then district
        rows.sort(key=lambda r: (r.state, r.district))

        return DistrictAnalyticsResponse(
            districts=rows,
            total_districts=len(rows),
            filters_applied=clean_filters,
            data_mode=settings.DATA_MODE,
        )

    @staticmethod
    def get_district_risk_ranking(
        state: Optional[str] = None,
        status: Optional[str] = None,
        trend: Optional[str] = None,
        risk: Optional[str] = None,
        limit: int = 10,
    ) -> DistrictRiskRankingResponse:
        """Ranks districts by acute aquifer risk score."""
        dist_resp = GroundwaterAnalyticsEngine.get_district_analytics(
            state=state,
            status=status,
            trend=trend,
            risk=risk,
        )

        ranked: List[DistrictRiskRankingRow] = []
        for row in dist_resp.districts:
            total = row.station_count
            crit_ratio = row.critical_count / total if total > 0 else 0.0
            warn_ratio = row.warning_count / total if total > 0 else 0.0
            fall_ratio = row.falling_percentage / 100.0

            calc_score = round(
                0.40 * crit_ratio + 0.20 * warn_ratio + 0.25 * row.average_risk_score + 0.15 * fall_ratio,
                3,
            )

            ranked.append(
                DistrictRiskRankingRow(
                    rank=0,
                    district=row.district,
                    state=row.state,
                    risk_score=calc_score,
                    risk_category=get_risk_category(calc_score),
                    critical_count=row.critical_count,
                    critical_percentage=row.critical_percentage,
                    warning_count=row.warning_count,
                    falling_percentage=row.falling_percentage,
                    priority=get_priority_label(calc_score, row.critical_percentage),
                )
            )

        # Sort descending by calculated risk score
        ranked.sort(key=lambda r: (-r.risk_score, r.state, r.district))

        # Assign 1-indexed ranks
        for idx, r in enumerate(ranked, start=1):
            r.rank = idx

        if limit > 0:
            ranked = ranked[:limit]

        return DistrictRiskRankingResponse(
            rankings=ranked,
            total_ranked=len(ranked),
            data_mode=settings.DATA_MODE,
            disclaimer=settings.DEMO_DISCLAIMER,
        )

    @staticmethod
    def get_groundwater_trend_summary(
        state: Optional[str] = None,
        district: Optional[str] = None,
        days: int = 30,
    ) -> TrendSummaryResponse:
        """Summarizes observed historical groundwater level trajectory for a given timeframe."""
        if days not in [7, 30, 90]:
            raise ValueError("Trend timeframe must be one of 7, 30, or 90 days.")

        stations = station_repo.filter_stations(state=state, district=district)
        filters_applied = {"state": state, "district": district, "days": days}
        clean_filters = {k: v for k, v in filters_applied.items() if v is not None}

        if not stations:
            return TrendSummaryResponse(
                period_days=days,
                average_start_depth=0.0,
                average_end_depth=0.0,
                average_change=0.0,
                trend_direction="Stable",
                station_count=0,
                filters_applied=clean_filters,
                data_mode=settings.DATA_MODE,
                disclaimer=settings.DEMO_DISCLAIMER,
            )

        total = len(stations)
        current_depth = round(sum(s.waterLevel for s in stations) / total, 2)

        # Calculate average monthly drawdown rate
        avg_rate_month = sum(s.trendRateMetersPerMonth for s in stations) / total
        # Project back to period start: change = rate_per_month * (days / 30.0)
        period_change = round(avg_rate_month * (days / 30.0), 2)
        start_depth = round(current_depth - period_change, 2)

        direction = "Falling" if period_change > 0.05 else "Rising" if period_change < -0.05 else "Stable"

        return TrendSummaryResponse(
            period_days=days,
            average_start_depth=start_depth,
            average_end_depth=current_depth,
            average_change=period_change,
            trend_direction=direction,
            station_count=total,
            filters_applied=clean_filters,
            data_mode=settings.DATA_MODE,
            disclaimer=settings.DEMO_DISCLAIMER,
        )


analytics_engine = GroundwaterAnalyticsEngine()
