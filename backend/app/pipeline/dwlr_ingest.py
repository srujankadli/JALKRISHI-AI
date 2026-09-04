import math
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from app.models.schemas import (
    DWLRStationSchema,
    HistoricalReadingSchema,
    StationStatus,
    TrendDirection,
    TelemetryStatus,
)
from app.config import settings


# ==========================================
# 1. Deterministic PRNG (Mulberry32 Port)
# ==========================================

class Mulberry32:
    """32-bit deterministic Mulberry32 PRNG matching TypeScript implementation."""
    def __init__(self, seed: int = 42):
        self.s = seed & 0xFFFFFFFF

    def next(self) -> float:
        self.s = (self.s + 0x6D2B79F5) & 0xFFFFFFFF
        z = self.s
        z = (z ^ (z >> 15)) * (1 | z)
        z &= 0xFFFFFFFF
        z = (z + ((z ^ (z >> 7)) * (61 | z))) & 0xFFFFFFFF
        z = z ^ (z >> 14)
        return (z & 0xFFFFFFFF) / 4294967296.0


# ==========================================
# 2. Hand-Crafted Anchor Stations Data
# ==========================================

ANCHOR_MOCK_STATIONS: List[Dict[str, Any]] = [
    {
        "id": "DWLR-PB-001",
        "stationCode": "PB-SAN-012",
        "stationName": "Sangrur Central Agricultural Zone",
        "state": "Punjab",
        "district": "Sangrur",
        "block": "Sunam",
        "latitude": 30.2450,
        "longitude": 75.8420,
        "waterLevel": 28.4,
        "previousWaterLevel": 27.8,
        "seasonalAverage": 24.5,
        "criticalThreshold": 30.0,
        "riskScore": 0.88,
        "status": "critical",
        "trend": "falling",
        "trendRateMetersPerMonth": 0.28,
        "daysToCritical": 22,
        "batteryLevel": 94,
        "telemetryStatus": "online",
        "lastUpdated": "10 mins ago",
        "soilType": "Alluvial Loam",
        "aquiferType": "Deep Unconfined Sand/Gravel",
        "farmerSummary": "Water table is critically low and declining at ~28cm/month. Limit intensive tube-well pumping.",
        "actionableAdvice": "Switch upcoming sowing to short-duration pulses or mustard. Adopt drip irrigation for high-value patches.",
        "historicalData": [
            {"date": "2026-03", "waterLevel": 26.2, "rainfall": 15},
            {"date": "2026-04", "waterLevel": 26.9, "rainfall": 8},
            {"date": "2026-05", "waterLevel": 27.5, "rainfall": 4},
            {"date": "2026-06", "waterLevel": 27.8, "rainfall": 62},
            {"date": "2026-07", "waterLevel": 28.0, "rainfall": 95},
            {"date": "2026-08", "waterLevel": 28.4, "rainfall": 48},
        ],
    },
    {
        "id": "DWLR-RJ-002",
        "stationCode": "RJ-JOD-045",
        "stationName": "Jodhpur Arid Research Station",
        "state": "Rajasthan",
        "district": "Jodhpur",
        "block": "Mandore",
        "latitude": 26.2389,
        "longitude": 73.0243,
        "waterLevel": 42.1,
        "previousWaterLevel": 41.5,
        "seasonalAverage": 39.0,
        "criticalThreshold": 45.0,
        "riskScore": 0.82,
        "status": "critical",
        "trend": "falling",
        "trendRateMetersPerMonth": 0.22,
        "daysToCritical": 41,
        "batteryLevel": 88,
        "telemetryStatus": "online",
        "lastUpdated": "18 mins ago",
        "soilType": "Desert Sandy Loam",
        "aquiferType": "Sandstone / Fractured Rock",
        "farmerSummary": "Severe water stress. Groundwater recharge is minimal due to deficit monsoon.",
        "actionableAdvice": "Prioritize Bajra (Pearl Millet) and Moong. Avoid high-water Rabi crops without localized rainwater harvest.",
        "historicalData": [
            {"date": "2026-03", "waterLevel": 40.2, "rainfall": 2},
            {"date": "2026-04", "waterLevel": 40.8, "rainfall": 0},
            {"date": "2026-05", "waterLevel": 41.2, "rainfall": 12},
            {"date": "2026-06", "waterLevel": 41.4, "rainfall": 35},
            {"date": "2026-07", "waterLevel": 41.8, "rainfall": 45},
            {"date": "2026-08", "waterLevel": 42.1, "rainfall": 18},
        ],
    },
    {
        "id": "DWLR-MH-003",
        "stationCode": "MH-AUR-019",
        "stationName": "Aurangabad Marathwada Watershed",
        "state": "Maharashtra",
        "district": "Chhatrapati Sambhaji Nagar",
        "block": "Paithan",
        "latitude": 19.8762,
        "longitude": 75.3433,
        "waterLevel": 16.8,
        "previousWaterLevel": 15.9,
        "seasonalAverage": 14.2,
        "criticalThreshold": 20.0,
        "riskScore": 0.65,
        "status": "warning",
        "trend": "falling",
        "trendRateMetersPerMonth": 0.19,
        "daysToCritical": 68,
        "batteryLevel": 92,
        "telemetryStatus": "online",
        "lastUpdated": "25 mins ago",
        "soilType": "Black Cotton Soil (Vertisol)",
        "aquiferType": "Deccan Basaltic Traps",
        "farmerSummary": "Water level is dropping faster than normal seasonal baseline. Moderate warning active.",
        "actionableAdvice": "Fallow fields should be prepared with farm ponds. Shift from sugarcane to soybean / sorghum.",
        "historicalData": [
            {"date": "2026-03", "waterLevel": 14.5, "rainfall": 5},
            {"date": "2026-04", "waterLevel": 15.1, "rainfall": 10},
            {"date": "2026-05", "waterLevel": 15.6, "rainfall": 18},
            {"date": "2026-06", "waterLevel": 15.8, "rainfall": 110},
            {"date": "2026-07", "waterLevel": 16.2, "rainfall": 145},
            {"date": "2026-08", "waterLevel": 16.8, "rainfall": 55},
        ],
    },
    {
        "id": "DWLR-KA-004",
        "stationCode": "KA-KOL-008",
        "stationName": "Kolar Semi-Arid Zone Monitor",
        "state": "Karnataka",
        "district": "Kolar",
        "block": "Mulbagal",
        "latitude": 13.1367,
        "longitude": 78.1291,
        "waterLevel": 32.5,
        "previousWaterLevel": 31.8,
        "seasonalAverage": 28.0,
        "criticalThreshold": 35.0,
        "riskScore": 0.79,
        "status": "critical",
        "trend": "falling",
        "trendRateMetersPerMonth": 0.25,
        "daysToCritical": 30,
        "batteryLevel": 79,
        "telemetryStatus": "online",
        "lastUpdated": "12 mins ago",
        "soilType": "Red Loamy Sand",
        "aquiferType": "Hard Granitic Gneiss",
        "farmerSummary": "Critical extraction zone. Deep borewells under strain.",
        "actionableAdvice": "Ragi (Finger Millet) and groundnut recommended. Restrict flood irrigation.",
        "historicalData": [
            {"date": "2026-03", "waterLevel": 30.1, "rainfall": 12},
            {"date": "2026-04", "waterLevel": 30.9, "rainfall": 24},
            {"date": "2026-05", "waterLevel": 31.4, "rainfall": 40},
            {"date": "2026-06", "waterLevel": 31.6, "rainfall": 75},
            {"date": "2026-07", "waterLevel": 32.0, "rainfall": 65},
            {"date": "2026-08", "waterLevel": 32.5, "rainfall": 32},
        ],
    },
    {
        "id": "DWLR-UP-005",
        "stationCode": "UP-VAR-032",
        "stationName": "Varanasi Gangetic Alluvium Well",
        "state": "Uttar Pradesh",
        "district": "Varanasi",
        "block": "Kashi",
        "latitude": 25.3176,
        "longitude": 82.9739,
        "waterLevel": 8.2,
        "previousWaterLevel": 8.9,
        "seasonalAverage": 9.5,
        "criticalThreshold": 18.0,
        "riskScore": 0.22,
        "status": "healthy",
        "trend": "rising",
        "trendRateMetersPerMonth": -0.21,
        "daysToCritical": None,
        "batteryLevel": 98,
        "telemetryStatus": "online",
        "lastUpdated": "5 mins ago",
        "soilType": "Gangetic Fertile Silt",
        "aquiferType": "Multi-layered Alluvial Sand",
        "farmerSummary": "Water levels healthy and recovering due to steady riverbed recharge and monsoon showers.",
        "actionableAdvice": "Safe for optimal Kharif & Rabi rotation. Maintain standard conservation tillage.",
        "historicalData": [
            {"date": "2026-03", "waterLevel": 9.8, "rainfall": 18},
            {"date": "2026-04", "waterLevel": 10.2, "rainfall": 6},
            {"date": "2026-05", "waterLevel": 10.5, "rainfall": 22},
            {"date": "2026-06", "waterLevel": 9.9, "rainfall": 140},
            {"date": "2026-07", "waterLevel": 8.9, "rainfall": 220},
            {"date": "2026-08", "waterLevel": 8.2, "rainfall": 180},
        ],
    },
    {
        "id": "DWLR-TN-006",
        "stationCode": "TN-TNJ-014",
        "stationName": "Thanjavur Delta Monitor Station",
        "state": "Tamil Nadu",
        "district": "Thanjavur",
        "block": "Orathanadu",
        "latitude": 10.7870,
        "longitude": 79.1378,
        "waterLevel": 7.1,
        "previousWaterLevel": 7.4,
        "seasonalAverage": 8.0,
        "criticalThreshold": 15.0,
        "riskScore": 0.28,
        "status": "healthy",
        "trend": "stable",
        "trendRateMetersPerMonth": 0.02,
        "daysToCritical": None,
        "batteryLevel": 95,
        "telemetryStatus": "online",
        "lastUpdated": "14 mins ago",
        "soilType": "Clayey Delta Alluvium",
        "aquiferType": "Coastal Sand & Deltaic Silt",
        "farmerSummary": "Water level is healthy. Good canal feeder support in the Cauvery delta.",
        "actionableAdvice": "Favorable for Samba paddy and black gram crop rotation.",
        "historicalData": [
            {"date": "2026-03", "waterLevel": 7.8, "rainfall": 20},
            {"date": "2026-04", "waterLevel": 8.1, "rainfall": 35},
            {"date": "2026-05", "waterLevel": 8.3, "rainfall": 50},
            {"date": "2026-06", "waterLevel": 7.9, "rainfall": 90},
            {"date": "2026-07", "waterLevel": 7.4, "rainfall": 130},
            {"date": "2026-08", "waterLevel": 7.1, "rainfall": 110},
        ],
    },
    {
        "id": "DWLR-GJ-007",
        "stationCode": "GJ-MEH-027",
        "stationName": "Mehsana Intensive Tube-well Grid",
        "state": "Gujarat",
        "district": "Mehsana",
        "block": "Kadi",
        "latitude": 23.5880,
        "longitude": 72.3693,
        "waterLevel": 35.8,
        "previousWaterLevel": 35.1,
        "seasonalAverage": 32.0,
        "criticalThreshold": 38.0,
        "riskScore": 0.84,
        "status": "critical",
        "trend": "falling",
        "trendRateMetersPerMonth": 0.24,
        "daysToCritical": 28,
        "batteryLevel": 86,
        "telemetryStatus": "online",
        "lastUpdated": "8 mins ago",
        "soilType": "Sandy Loam / Goradu",
        "aquiferType": "Deep Confined Sand Aquifer",
        "farmerSummary": "Extreme deep extraction. Tube-well yield dropping across local farms.",
        "actionableAdvice": "Shift to micro-irrigation for castor and cumin. Curtail heavy summer fodder pumping.",
        "historicalData": [
            {"date": "2026-03", "waterLevel": 33.8, "rainfall": 0},
            {"date": "2026-04", "waterLevel": 34.4, "rainfall": 0},
            {"date": "2026-05", "waterLevel": 34.9, "rainfall": 8},
            {"date": "2026-06", "waterLevel": 35.0, "rainfall": 80},
            {"date": "2026-07", "waterLevel": 35.2, "rainfall": 110},
            {"date": "2026-08", "waterLevel": 35.8, "rainfall": 42},
        ],
    },
    {
        "id": "DWLR-HR-008",
        "stationCode": "HR-KUR-011",
        "stationName": "Kurukshetra Agronomic Observatory",
        "state": "Haryana",
        "district": "Kurukshetra",
        "block": "Pehowa",
        "latitude": 29.9695,
        "longitude": 76.8783,
        "waterLevel": 22.3,
        "previousWaterLevel": 21.6,
        "seasonalAverage": 19.5,
        "criticalThreshold": 26.0,
        "riskScore": 0.72,
        "status": "warning",
        "trend": "falling",
        "trendRateMetersPerMonth": 0.21,
        "daysToCritical": 53,
        "batteryLevel": 91,
        "telemetryStatus": "online",
        "lastUpdated": "15 mins ago",
        "soilType": "Alluvial Loamy Sand",
        "aquiferType": "Quaternary Sand Strata",
        "farmerSummary": "Water levels dropping consistently. Warning state triggered ahead of Rabi planting.",
        "actionableAdvice": "Opt for direct-seeded rice (DSR) or maize; shift winter wheat to low-till mustard.",
        "historicalData": [
            {"date": "2026-03", "waterLevel": 20.4, "rainfall": 14},
            {"date": "2026-04", "waterLevel": 20.9, "rainfall": 5},
            {"date": "2026-05", "waterLevel": 21.3, "rainfall": 18},
            {"date": "2026-06", "waterLevel": 21.5, "rainfall": 70},
            {"date": "2026-07", "waterLevel": 21.8, "rainfall": 85},
            {"date": "2026-08", "waterLevel": 22.3, "rainfall": 38},
        ],
    },
    {
        "id": "DWLR-MP-009",
        "stationCode": "MP-HOS-005",
        "stationName": "Narmadapuram Valley Hydro-Well",
        "state": "Madhya Pradesh",
        "district": "Narmadapuram",
        "block": "Pipariya",
        "latitude": 22.7562,
        "longitude": 77.7289,
        "waterLevel": 9.8,
        "previousWaterLevel": 10.4,
        "seasonalAverage": 11.2,
        "criticalThreshold": 19.0,
        "riskScore": 0.31,
        "status": "healthy",
        "trend": "rising",
        "trendRateMetersPerMonth": -0.18,
        "daysToCritical": None,
        "batteryLevel": 94,
        "telemetryStatus": "online",
        "lastUpdated": "3 mins ago",
        "soilType": "Deep Black Soil",
        "aquiferType": "Narmada Alluvium",
        "farmerSummary": "Healthy water balance supported by good river valley infiltration.",
        "actionableAdvice": "Ideal conditions for soybean and chickpea cultivation with minimal supplemental irrigation.",
        "historicalData": [
            {"date": "2026-03", "waterLevel": 11.4, "rainfall": 8},
            {"date": "2026-04", "waterLevel": 11.9, "rainfall": 4},
            {"date": "2026-05", "waterLevel": 12.2, "rainfall": 28},
            {"date": "2026-06", "waterLevel": 11.6, "rainfall": 190},
            {"date": "2026-07", "waterLevel": 10.5, "rainfall": 310},
            {"date": "2026-08", "waterLevel": 9.8, "rainfall": 240},
        ],
    },
    {
        "id": "DWLR-AP-010",
        "stationCode": "AP-ANA-018",
        "stationName": "Anantapur Rayalaseema Station",
        "state": "Andhra Pradesh",
        "district": "Anantapur",
        "block": "Dharmavaram",
        "latitude": 14.6819,
        "longitude": 77.6006,
        "waterLevel": 26.7,
        "previousWaterLevel": 26.0,
        "seasonalAverage": 23.0,
        "criticalThreshold": 29.0,
        "riskScore": 0.81,
        "status": "critical",
        "trend": "falling",
        "trendRateMetersPerMonth": 0.22,
        "daysToCritical": 31,
        "batteryLevel": 82,
        "telemetryStatus": "online",
        "lastUpdated": "20 mins ago",
        "soilType": "Red Gravelly Loam",
        "aquiferType": "Weathered Granite / Fissured Gneiss",
        "farmerSummary": "Critically depleted groundwater. Dry spell compounding borewell drop.",
        "actionableAdvice": "Stick to drought-resilient groundnut and millets. Deploy in-situ soil moisture mulch.",
        "historicalData": [
            {"date": "2026-03", "waterLevel": 24.8, "rainfall": 10},
            {"date": "2026-04", "waterLevel": 25.4, "rainfall": 15},
            {"date": "2026-05", "waterLevel": 25.8, "rainfall": 35},
            {"date": "2026-06", "waterLevel": 25.9, "rainfall": 50},
            {"date": "2026-07", "waterLevel": 26.2, "rainfall": 40},
            {"date": "2026-08", "waterLevel": 26.7, "rainfall": 22},
        ],
    },
    {
        "id": "DWLR-TG-011",
        "stationCode": "TG-MED-009",
        "stationName": "Medak Telangana Plateau Station",
        "state": "Telangana",
        "district": "Medak",
        "block": "Narsapur",
        "latitude": 18.0483,
        "longitude": 78.2635,
        "waterLevel": 14.3,
        "previousWaterLevel": 14.1,
        "seasonalAverage": 13.8,
        "criticalThreshold": 22.0,
        "riskScore": 0.44,
        "status": "moderate",
        "trend": "stable",
        "trendRateMetersPerMonth": 0.05,
        "daysToCritical": 154,
        "batteryLevel": 93,
        "telemetryStatus": "online",
        "lastUpdated": "16 mins ago",
        "soilType": "Chalka Red Earth",
        "aquiferType": "Granite Crystalline Complex",
        "farmerSummary": "Groundwater stable at moderate levels. Check dam revival providing buffer.",
        "actionableAdvice": "Cotton and red gram suitable with scheduled furrow irrigation.",
        "historicalData": [
            {"date": "2026-03", "waterLevel": 14.9, "rainfall": 15},
            {"date": "2026-04", "waterLevel": 15.2, "rainfall": 20},
            {"date": "2026-05", "waterLevel": 15.5, "rainfall": 42},
            {"date": "2026-06", "waterLevel": 14.8, "rainfall": 125},
            {"date": "2026-07", "waterLevel": 14.2, "rainfall": 160},
            {"date": "2026-08", "waterLevel": 14.3, "rainfall": 85},
        ],
    },
    {
        "id": "DWLR-BR-012",
        "stationCode": "BR-PAT-004",
        "stationName": "Patna Central Alluvial Basin",
        "state": "Bihar",
        "district": "Patna",
        "block": "Danapur",
        "latitude": 25.5941,
        "longitude": 85.1376,
        "waterLevel": 6.8,
        "previousWaterLevel": 7.2,
        "seasonalAverage": 7.5,
        "criticalThreshold": 16.0,
        "riskScore": 0.18,
        "status": "healthy",
        "trend": "rising",
        "trendRateMetersPerMonth": -0.15,
        "daysToCritical": None,
        "batteryLevel": 97,
        "telemetryStatus": "online",
        "lastUpdated": "2 mins ago",
        "soilType": "Heavy Silt Loam",
        "aquiferType": "Deep Ganges Saturated Alluvium",
        "farmerSummary": "Abundant water level. Natural high water table across the block.",
        "actionableAdvice": "Good soil moisture for multi-cropping. Monitor for localized waterlogging in low patches.",
        "historicalData": [
            {"date": "2026-03", "waterLevel": 7.9, "rainfall": 22},
            {"date": "2026-04", "waterLevel": 8.2, "rainfall": 14},
            {"date": "2026-05", "waterLevel": 8.4, "rainfall": 38},
            {"date": "2026-06", "waterLevel": 7.8, "rainfall": 165},
            {"date": "2026-07", "waterLevel": 7.1, "rainfall": 245},
            {"date": "2026-08", "waterLevel": 6.8, "rainfall": 195},
        ],
    },
    {
        "id": "DWLR-PB-013",
        "stationCode": "PB-BAT-007",
        "stationName": "Bathinda South Cotton-Wheat Belt",
        "state": "Punjab",
        "district": "Bathinda",
        "block": "Talwandi Sabo",
        "latitude": 29.9880,
        "longitude": 75.0880,
        "waterLevel": 25.1,
        "previousWaterLevel": 24.3,
        "seasonalAverage": 21.0,
        "criticalThreshold": 28.0,
        "riskScore": 0.76,
        "status": "warning",
        "trend": "falling",
        "trendRateMetersPerMonth": 0.26,
        "daysToCritical": 34,
        "batteryLevel": 89,
        "telemetryStatus": "online",
        "lastUpdated": "11 mins ago",
        "soilType": "Light Alluvial Sand",
        "aquiferType": "Unconfined Alluvial Sand",
        "farmerSummary": "Water level falling rapidly due to peak tube-well irrigation.",
        "actionableAdvice": "Schedule tube-well cycles at night to cut evaporation. Consider mustard over high-water wheat.",
        "historicalData": [
            {"date": "2026-03", "waterLevel": 22.8, "rainfall": 12},
            {"date": "2026-04", "waterLevel": 23.4, "rainfall": 4},
            {"date": "2026-05", "waterLevel": 23.9, "rainfall": 16},
            {"date": "2026-06", "waterLevel": 24.1, "rainfall": 55},
            {"date": "2026-07", "waterLevel": 24.5, "rainfall": 72},
            {"date": "2026-08", "waterLevel": 25.1, "rainfall": 30},
        ],
    },
    {
        "id": "DWLR-RJ-014",
        "stationCode": "RJ-JAI-022",
        "stationName": "Jaipur Rural Agriculture Basin",
        "state": "Rajasthan",
        "district": "Jaipur",
        "block": "Chaksu",
        "latitude": 26.6020,
        "longitude": 75.9520,
        "waterLevel": 31.2,
        "previousWaterLevel": 30.6,
        "seasonalAverage": 27.5,
        "criticalThreshold": 34.0,
        "riskScore": 0.77,
        "status": "warning",
        "trend": "falling",
        "trendRateMetersPerMonth": 0.20,
        "daysToCritical": 42,
        "batteryLevel": 85,
        "telemetryStatus": "online",
        "lastUpdated": "30 mins ago",
        "soilType": "Sandy Loam",
        "aquiferType": "Quartzite & Schist Alluvium",
        "farmerSummary": "Water level is falling near warning limits. Recharge deficit of 22%.",
        "actionableAdvice": "Switch to chickpea (Chana) and pearl millet. Avoid planting thirsty fodder.",
        "historicalData": [
            {"date": "2026-03", "waterLevel": 29.2, "rainfall": 5},
            {"date": "2026-04", "waterLevel": 29.8, "rainfall": 2},
            {"date": "2026-05", "waterLevel": 30.2, "rainfall": 14},
            {"date": "2026-06", "waterLevel": 30.4, "rainfall": 60},
            {"date": "2026-07", "waterLevel": 30.7, "rainfall": 82},
            {"date": "2026-08", "waterLevel": 31.2, "rainfall": 28},
        ],
    },
    {
        "id": "DWLR-WB-015",
        "stationCode": "WB-BUR-015",
        "stationName": "Burdwan Lower Damodar Basin",
        "state": "West Bengal",
        "district": "Purba Bardhaman",
        "block": "Burdwan I",
        "latitude": 23.2324,
        "longitude": 87.8615,
        "waterLevel": 5.4,
        "previousWaterLevel": 5.9,
        "seasonalAverage": 6.2,
        "criticalThreshold": 14.0,
        "riskScore": 0.15,
        "status": "healthy",
        "trend": "rising",
        "trendRateMetersPerMonth": -0.16,
        "daysToCritical": None,
        "batteryLevel": 99,
        "telemetryStatus": "online",
        "lastUpdated": "1 min ago",
        "soilType": "Deltaic Clay Loam",
        "aquiferType": "Alluvial Sand and Gravel",
        "farmerSummary": "Excellent groundwater availability supported by high monsoon precipitation.",
        "actionableAdvice": "Favorable for Aman rice, jute, and mustard rotations.",
        "historicalData": [
            {"date": "2026-03", "waterLevel": 6.6, "rainfall": 35},
            {"date": "2026-04", "waterLevel": 7.0, "rainfall": 48},
            {"date": "2026-05", "waterLevel": 7.2, "rainfall": 95},
            {"date": "2026-06", "waterLevel": 6.4, "rainfall": 220},
            {"date": "2026-07", "waterLevel": 5.8, "rainfall": 310},
            {"date": "2026-08", "waterLevel": 5.4, "rainfall": 260},
        ],
    },
    {
        "id": "DWLR-KA-016",
        "stationCode": "KA-BEL-003",
        "stationName": "Belagavi Sugarcane Belt Well",
        "state": "Karnataka",
        "district": "Belagavi",
        "block": "Athani",
        "latitude": 16.7324,
        "longitude": 75.0615,
        "waterLevel": 18.6,
        "previousWaterLevel": 18.0,
        "seasonalAverage": 15.5,
        "criticalThreshold": 22.0,
        "riskScore": 0.69,
        "status": "warning",
        "trend": "falling",
        "trendRateMetersPerMonth": 0.18,
        "daysToCritical": 56,
        "batteryLevel": 87,
        "telemetryStatus": "online",
        "lastUpdated": "19 mins ago",
        "soilType": "Deep Black Soil",
        "aquiferType": "Basaltic Weathered Flow",
        "farmerSummary": "Water levels dropping due to high sugarcane water extraction.",
        "actionableAdvice": "Adopt drip systems for existing sugarcane; substitute new acreage with maize or sunflower.",
        "historicalData": [
            {"date": "2026-03", "waterLevel": 16.8, "rainfall": 10},
            {"date": "2026-04", "waterLevel": 17.3, "rainfall": 25},
            {"date": "2026-05", "waterLevel": 17.6, "rainfall": 50},
            {"date": "2026-06", "waterLevel": 17.8, "rainfall": 90},
            {"date": "2026-07", "waterLevel": 18.1, "rainfall": 110},
            {"date": "2026-08", "waterLevel": 18.6, "rainfall": 45},
        ],
    },
]


# ==========================================
# 3. State & District Geographic Configs
# ==========================================

STATE_CONFIGS = [
    {
        "state": "Punjab",
        "targetCount": 420,
        "districts": [
            {"name": "Sangrur", "latRange": [30.15, 30.40], "lngRange": [75.70, 76.05], "blocks": ["Sunam", "Lehragaga", "Dhuri", "Malerkotla", "Moonak"], "criticalWeight": 0.65, "soil": ["Alluvial Loam", "Clayey Alluvium"], "aquifer": ["Deep Unconfined Alluvial Sand", "Multi-layered Alluvial Aquifer"]},
            {"name": "Bathinda", "latRange": [30.05, 30.35], "lngRange": [74.80, 75.20], "blocks": ["Talwandi Sabo", "Rampura Phul", "Maur", "Bhagta Bhaika"], "criticalWeight": 0.60, "soil": ["Sandy Loam", "Silty Sand"], "aquifer": ["Deep Sand/Gravel Aquifer", "Semi-confined Alluvium"]},
            {"name": "Ludhiana", "latRange": [30.75, 31.05], "lngRange": [75.65, 76.10], "blocks": ["Jagraon", "Samrala", "Khanna", "Doraha"], "criticalWeight": 0.45, "soil": ["Alluvial Silt Loam", "Sandy Clay Loam"], "aquifer": ["Unconfined Alluvium", "Piezometric Alluvium"]},
            {"name": "Patiala", "latRange": [30.15, 30.50], "lngRange": [76.20, 76.60], "blocks": ["Nabha", "Rajpura", "Samana", "Patran"], "criticalWeight": 0.50, "soil": ["Alluvial Loam"], "aquifer": ["Alluvial Sand / Silt"]},
            {"name": "Mansa", "latRange": [29.85, 30.15], "lngRange": [75.25, 75.60], "blocks": ["Budhlada", "Sardulgarh", "Jhunir"], "criticalWeight": 0.55, "soil": ["Sandy Loam", "Saline Silt"], "aquifer": ["Deep Sand Layer"]},
            {"name": "Amritsar", "latRange": [31.50, 31.85], "lngRange": [74.70, 75.15], "blocks": ["Ajnala", "Majitha", "Verka", "Rayya"], "criticalWeight": 0.35, "soil": ["Fertile Alluvium"], "aquifer": ["Upper Bari Doab Alluvium"]},
        ],
    },
    {
        "state": "Rajasthan",
        "targetCount": 680,
        "districts": [
            {"name": "Jodhpur", "latRange": [26.05, 26.65], "lngRange": [72.75, 73.45], "blocks": ["Mandore", "Bilara", "Bhopalgarh", "Luni", "Osian", "Phalodi"], "criticalWeight": 0.70, "soil": ["Desert Sand", "Arid Sandy Loam"], "aquifer": ["Sandstone & Fractured Limestone", "Deep Desert Aquifer"]},
            {"name": "Jaipur", "latRange": [26.70, 27.25], "lngRange": [75.50, 76.10], "blocks": ["Sanganer", "Amber", "Chomu", "Phulera", "Bassi", "Kotputli"], "criticalWeight": 0.55, "soil": ["Sandy Loam", "Calcareous Soil"], "aquifer": ["Alluvial Sand & Quartzite", "Hard Rock Fractured Gneiss"]},
            {"name": "Bikaner", "latRange": [27.70, 28.35], "lngRange": [72.90, 73.65], "blocks": ["Nokha", "Kolayat", "Lunkaransar", "Khajuwala"], "criticalWeight": 0.65, "soil": ["Thar Desert Dune Sand"], "aquifer": ["Tertiary Sandstone", "Deep Confined Saline Aquifer"]},
            {"name": "Nagaur", "latRange": [26.80, 27.40], "lngRange": [73.80, 74.45], "blocks": ["Merta", "Degana", "Didwana", "Ladnun", "Makrana"], "criticalWeight": 0.60, "soil": ["Sandy Loam", "Gypsiferous Soil"], "aquifer": ["Limestone / Marbles & Sandstone"]},
            {"name": "Barmer", "latRange": [25.50, 26.15], "lngRange": [71.10, 71.75], "blocks": ["Balotra", "Gudamalani", "Siwana", "Baytu"], "criticalWeight": 0.60, "soil": ["Desert Sand"], "aquifer": ["Sedimentary Sandstone & Conglomerate"]},
            {"name": "Sikar", "latRange": [27.35, 27.85], "lngRange": [74.95, 75.45], "blocks": ["Fatehpur", "Laxmangarh", "Danta Ramgarh", "Neem Ka Thana"], "criticalWeight": 0.50, "soil": ["Light Sandy Loam"], "aquifer": ["Quartzite / Schist & Alluvial Sand"]},
        ],
    },
    {
        "state": "Maharashtra",
        "targetCount": 720,
        "districts": [
            {"name": "Aurangabad", "latRange": [19.70, 20.15], "lngRange": [75.10, 75.60], "blocks": ["Gangapur", "Vaijapur", "Paithan", "Kannad", "Sillod"], "criticalWeight": 0.40, "soil": ["Black Cotton Soil (Regur)", "Medium Black Soil"], "aquifer": ["Deccan Basalt Vesicular Lava Flows", "Weathered Deccan Trap"]},
            {"name": "Nashik", "latRange": [19.80, 20.30], "lngRange": [73.65, 74.20], "blocks": ["Niphad", "Dindori", "Sinnar", "Yeola", "Malegaon"], "criticalWeight": 0.35, "soil": ["Black Clayey Loam", "Red Laterite Loam"], "aquifer": ["Basaltic Lava Flow & Jointed Rock"]},
            {"name": "Pune", "latRange": [18.35, 18.85], "lngRange": [73.70, 74.30], "blocks": ["Baramati", "Indapur", "Shirur", "Daund", "Haveli", "Junner"], "criticalWeight": 0.35, "soil": ["Medium to Deep Black Soil"], "aquifer": ["Fractured Deccan Basalt Aquifer"]},
            {"name": "Ahmednagar", "latRange": [19.00, 19.55], "lngRange": [74.50, 75.10], "blocks": ["Rahata", "Sangamner", "Shrirampur", "Kopargaon", "Newasa", "Parner"], "criticalWeight": 0.45, "soil": ["Black Cotton Soil", "Shallow Clay Loam"], "aquifer": ["Weathered Basalt Trap Layer"]},
            {"name": "Solapur", "latRange": [17.50, 18.05], "lngRange": [75.65, 76.25], "blocks": ["Pandharpur", "Barshi", "Karmala", "Madha", "Sangola"], "criticalWeight": 0.40, "soil": ["Shallow Rocky Black Soil"], "aquifer": ["Deccan Trap Basaltic Aquifer"]},
            {"name": "Jalna", "latRange": [19.65, 20.05], "lngRange": [75.75, 76.20], "blocks": ["Ambad", "Partur", "Bhokardan", "Badnapur"], "criticalWeight": 0.38, "soil": ["Medium Black Loam"], "aquifer": ["Vesicular Zeolitic Basalt"]},
        ],
    },
    {
        "state": "Karnataka",
        "targetCount": 540,
        "districts": [
            {"name": "Kolar", "latRange": [13.00, 13.35], "lngRange": [78.00, 78.35], "blocks": ["Mulbagal", "Bangarapet", "Srinivaspur", "Malur"], "criticalWeight": 0.55, "soil": ["Red Sandy Loam", "Lateritic Red Soil"], "aquifer": ["Deep Fractured Granitic Gneiss", "Hard Rock Crystalline Aquifer"]},
            {"name": "Belagavi", "latRange": [15.70, 16.30], "lngRange": [74.40, 75.05], "blocks": ["Gokak", "Bailhongal", "Chikkodi", "Athani", "Hukkeri", "Savadatti"], "criticalWeight": 0.25, "soil": ["Deep Black Cotton Soil", "Red Sandy Soil"], "aquifer": ["Deccan Basalt & Crystalline Limestone"]},
            {"name": "Tumakuru", "latRange": [13.20, 13.70], "lngRange": [76.90, 77.30], "blocks": ["Tiptur", "Sira", "Madhugiri", "Kunigal", "Gubbi"], "criticalWeight": 0.35, "soil": ["Red Loam", "Mixed Sandy Soil"], "aquifer": ["Peninsular Gneissic Complex"]},
            {"name": "Chitradurga", "latRange": [14.05, 14.45], "lngRange": [76.20, 76.70], "blocks": ["Hiriyur", "Challakere", "Hosadurga", "Holalkere"], "criticalWeight": 0.45, "soil": ["Red Loamy Sand", "Black Clay"], "aquifer": ["Granite & Schist Hard Rock"]},
            {"name": "Mandya", "latRange": [12.40, 12.80], "lngRange": [76.70, 77.10], "blocks": ["Maddur", "Malavalli", "Pandavapura", "Srirangapatna"], "criticalWeight": 0.15, "soil": ["Fertile Red Loam", "Canal Irrigated Alluvium"], "aquifer": ["Shallow Crystalline Aquifer"]},
            {"name": "Ballari", "latRange": [14.95, 15.45], "lngRange": [76.75, 77.20], "blocks": ["Hospet", "Siruguppa", "Sandur", "Kampli"], "criticalWeight": 0.30, "soil": ["Deep Black Soil"], "aquifer": ["Basalt & Fractured Quartzite"]},
        ],
    },
    {
        "state": "Uttar Pradesh",
        "targetCount": 850,
        "districts": [
            {"name": "Varanasi", "latRange": [25.20, 25.50], "lngRange": [82.85, 83.15], "blocks": ["Kashi", "Pindra", "Sevapuri", "Araziline", "Cholapur"], "criticalWeight": 0.12, "soil": ["Gangetic Alluvial Silt Loam", "Fine Sandy Alluvium"], "aquifer": ["Gangetic Unconfined Sand Aquifer", "Deep Alluvial Sand Layer"]},
            {"name": "Prayagraj", "latRange": [25.30, 25.65], "lngRange": [81.70, 82.10], "blocks": ["Phulpur", "Handia", "Karchhana", "Soraon", "Meja"], "criticalWeight": 0.15, "soil": ["Gangetic Alluvium", "Loamy Silt"], "aquifer": ["Confluence Alluvial Aquifer"]},
            {"name": "Lucknow", "latRange": [26.70, 27.05], "lngRange": [80.80, 81.15], "blocks": ["Mohanlalganj", "Bakshi Ka Talab", "Malihabad", "Kakori", "Gosainganj"], "criticalWeight": 0.20, "soil": ["Alluvial Loam"], "aquifer": ["Gomti Basin Multi-tier Alluvium"]},
            {"name": "Bareilly", "latRange": [28.25, 28.60], "lngRange": [79.25, 79.65], "blocks": ["Faridpur", "Aonla", "Baheri", "Mirganj", "Nawabganj"], "criticalWeight": 0.10, "soil": ["Terai Silt Loam", "Clayey Alluvium"], "aquifer": ["High Permeability Sand / Gravel"]},
            {"name": "Meerut", "latRange": [28.85, 29.20], "lngRange": [77.55, 77.95], "blocks": ["Mawana", "Sardhana", "Hastinapur", "Daurala"], "criticalWeight": 0.35, "soil": ["Upper Doab Alluvial Loam"], "aquifer": ["Ganga-Yamuna Interfluve Sand Layer"]},
            {"name": "Gorakhpur", "latRange": [26.65, 27.00], "lngRange": [83.25, 83.60], "blocks": ["Sahjanwa", "Bansgaon", "Campierganj", "Chauri Chaura", "Pipraich"], "criticalWeight": 0.08, "soil": ["Rapti Alluvial Silt"], "aquifer": ["Shallow High-Yield Alluvium"]},
        ],
    },
    {
        "state": "Gujarat",
        "targetCount": 460,
        "districts": [
            {"name": "Mehsana", "latRange": [23.45, 23.85], "lngRange": [72.25, 72.65], "blocks": ["Kadi", "Visnagar", "Vijapur", "Unjha", "Becharaji", "Kheralu"], "criticalWeight": 0.50, "soil": ["Sandy Loam", "Calcareous Silt"], "aquifer": ["Deep Mesozoic Sandstone", "Alluvial Sand & Gravel"]},
            {"name": "Ahmedabad", "latRange": [22.85, 23.25], "lngRange": [72.40, 72.85], "blocks": ["Sanand", "Dholka", "Bavla", "Viramgam", "Daskroi"], "criticalWeight": 0.35, "soil": ["Clayey Silt", "Coastal Saline Alluvium"], "aquifer": ["Sabarmati Basin Alluvium"]},
            {"name": "Rajkot", "latRange": [22.15, 22.55], "lngRange": [70.65, 71.05], "blocks": ["Gondal", "Jasdan", "Jetpur", "Dhoraji", "Kotda Sangani"], "criticalWeight": 0.30, "soil": ["Medium Black Cotton Soil"], "aquifer": ["Saurashtra Basalt Trap"]},
            {"name": "Banaskantha", "latRange": [24.05, 24.50], "lngRange": [72.10, 72.60], "blocks": ["Palanpur", "Deesa", "Tharad", "Dhanera", "Vav"], "criticalWeight": 0.55, "soil": ["Arid Sandy Soil"], "aquifer": ["Desert Boundary Sandstone & Alluvium"]},
        ],
    },
    {
        "state": "Haryana",
        "targetCount": 380,
        "districts": [
            {"name": "Kurukshetra", "latRange": [29.85, 30.15], "lngRange": [76.70, 77.05], "blocks": ["Pehowa", "Shahbad", "Thanesar", "Ladwa", "Babain"], "criticalWeight": 0.45, "soil": ["Alluvial Loam", "Sandy Silt Loam"], "aquifer": ["Ghaggar Alluvial Aquifer", "Deep Sand Gravel Layer"]},
            {"name": "Karnal", "latRange": [29.55, 29.85], "lngRange": [76.85, 77.20], "blocks": ["Gharaunda", "Indri", "Nilokheri", "Assandh"], "criticalWeight": 0.40, "soil": ["Fertile Alluvial Loam"], "aquifer": ["Yamuna Alluvial Plain Sand Layer"]},
            {"name": "Sirsa", "latRange": [29.40, 29.75], "lngRange": [74.90, 75.30], "blocks": ["Ellenabad", "Rania", "Dabwali", "Kalanwali"], "criticalWeight": 0.45, "soil": ["Sandy Loam", "Light Alluvium"], "aquifer": ["Indo-Gangetic Basin Deep Aquifer"]},
            {"name": "Hisar", "latRange": [29.00, 29.35], "lngRange": [75.60, 76.00], "blocks": ["Hansi", "Adampur", "Barwala", "Uklana"], "criticalWeight": 0.35, "soil": ["Arid Loamy Sand"], "aquifer": ["Saline & Fresh Water Transition Zone"]},
        ],
    },
    {
        "state": "Tamil Nadu",
        "targetCount": 510,
        "districts": [
            {"name": "Thanjavur", "latRange": [10.65, 10.95], "lngRange": [79.05, 79.35], "blocks": ["Kumbakonam", "Papanasam", "Pattukkottai", "Orathanadu", "Thiruvaiyaru"], "criticalWeight": 0.15, "soil": ["Cauvery Delta Alluvial Clay", "Sandy Deltaic Alluvium"], "aquifer": ["Tertiary Cuddalore Sandstone", "Deltaic Silt/Sand"]},
            {"name": "Madurai", "latRange": [9.80, 10.10], "lngRange": [78.00, 78.30], "blocks": ["Melur", "Usilampatti", "Vadipatti", "Thirumangalam"], "criticalWeight": 0.25, "soil": ["Red Loam", "Black Soil"], "aquifer": ["Crystalline Charnockite & Gneiss"]},
            {"name": "Coimbatore", "latRange": [10.85, 11.20], "lngRange": [76.85, 77.15], "blocks": ["Pollachi", "Sulur", "Mettupalayam", "Annur"], "criticalWeight": 0.35, "soil": ["Red Gravelly Soil", "Black Clay"], "aquifer": ["Hard Rock Weathered Gneiss Layer"]},
            {"name": "Salem", "latRange": [11.55, 11.85], "lngRange": [78.05, 78.35], "blocks": ["Attur", "Mettur", "Omalur", "Sankari"], "criticalWeight": 0.30, "soil": ["Red Sandy Soil"], "aquifer": ["Fissured Hard Rock System"]},
        ],
    },
    {
        "state": "Madhya Pradesh",
        "targetCount": 490,
        "districts": [
            {"name": "Narmadapuram", "latRange": [22.65, 22.95], "lngRange": [77.65, 78.05], "blocks": ["Itarsi", "Pipariya", "Sohagpur", "Babai", "Seoni Malwa"], "criticalWeight": 0.10, "soil": ["Deep Black Alluvial Clay", "Narmada Basin Loam"], "aquifer": ["Narmada Alluvial Valley Sand/Gravel", "Gondwana Sandstone"]},
            {"name": "Indore", "latRange": [22.60, 22.90], "lngRange": [75.75, 76.05], "blocks": ["Mhow", "Depalpur", "Sanwer"], "criticalWeight": 0.25, "soil": ["Deep Black Cotton Soil"], "aquifer": ["Malwa Plateau Basaltic Lava Flow"]},
            {"name": "Ujjain", "latRange": [23.10, 23.40], "lngRange": [75.65, 75.95], "blocks": ["Nagda", "Mahidpur", "Badnagar", "Tarana"], "criticalWeight": 0.25, "soil": ["Medium Black Clay Loam"], "aquifer": ["Vesicular Jointed Basalt"]},
            {"name": "Bhopal", "latRange": [23.15, 23.40], "lngRange": [77.30, 77.55], "blocks": ["Berasia", "Phanda"], "criticalWeight": 0.18, "soil": ["Black Cotton Soil", "Lateritic Red Silt"], "aquifer": ["Vindhyan Sandstone & Basalt"]},
        ],
    },
    {
        "state": "Andhra Pradesh",
        "targetCount": 350,
        "districts": [
            {"name": "Anantapur", "latRange": [14.55, 14.85], "lngRange": [77.50, 77.80], "blocks": ["Dharmavaram", "Hindupur", "Kadiri", "Guntakal", "Tadpatri"], "criticalWeight": 0.45, "soil": ["Red Gravelly Sandy Loam", "Black Soil"], "aquifer": ["Rayalaseema Crystalline Granite & Schist"]},
            {"name": "Kurnool", "latRange": [15.65, 15.95], "lngRange": [77.95, 78.20], "blocks": ["Nandyal", "Adoni", "Yemmiganur", "Dhone"], "criticalWeight": 0.30, "soil": ["Black Cotton Soil", "Red Loamy Soil"], "aquifer": ["Cuddapah Limestone & Quartzite"]},
            {"name": "Guntur", "latRange": [16.20, 16.50], "lngRange": [80.35, 80.60], "blocks": ["Tenali", "Narasaraopet", "Bapatla", "Sattenapalle"], "criticalWeight": 0.15, "soil": ["Krishna Delta Deep Alluvial Clay"], "aquifer": ["Coastal Alluvium & Weathered Gneiss"]},
        ],
    },
    {
        "state": "Telangana",
        "targetCount": 280,
        "districts": [
            {"name": "Medak", "latRange": [17.95, 18.25], "lngRange": [78.15, 78.45], "blocks": ["Sangareddy", "Siddipet", "Narsapur", "Zahirabad", "Gajwel"], "criticalWeight": 0.30, "soil": ["Red Chalkas (Sandy Loam)", "Black Soil"], "aquifer": ["Deccan Peninsular Granitic Gneiss"]},
            {"name": "Nalgonda", "latRange": [16.95, 17.25], "lngRange": [79.15, 79.45], "blocks": ["Suryapet", "Miryalaguda", "Devarakonda", "Kodad"], "criticalWeight": 0.35, "soil": ["Red Sandy Soil", "Black Clay"], "aquifer": ["Granite & Dolerite Dykes"]},
        ],
    },
    {
        "state": "Bihar",
        "targetCount": 210,
        "districts": [
            {"name": "Patna", "latRange": [25.50, 25.75], "lngRange": [85.05, 85.35], "blocks": ["Danapur", "Phulwari Sharif", "Barh", "Bikram", "Masaurhi"], "criticalWeight": 0.05, "soil": ["Gangetic Deep Silt Loam", "Clayey Alluvium"], "aquifer": ["Middle Ganga Multi-aquifer Sand System"]},
            {"name": "Gaya", "latRange": [24.65, 24.95], "lngRange": [84.90, 85.15], "blocks": ["Bodh Gaya", "Sherghati", "Tekari", "Wazirganj"], "criticalWeight": 0.18, "soil": ["Sandy Loam", "Rocky Red Soil"], "aquifer": ["Falgu River Alluvium & Gneiss"]},
        ],
    },
    {
        "state": "West Bengal",
        "targetCount": 180,
        "districts": [
            {"name": "Burdwan", "latRange": [23.15, 23.40], "lngRange": [87.75, 88.05], "blocks": ["Kalna", "Katwa", "Memari", "Galsi", "Bhatar"], "criticalWeight": 0.08, "soil": ["Damodar Alluvial Clay Silt", "Red Laterite"], "aquifer": ["Bengal Delta Multi-tier Deep Sand Aquifer"]},
            {"name": "Murshidabad", "latRange": [24.05, 24.30], "lngRange": [88.15, 88.40], "blocks": ["Berhampore", "Kandi", "Jangipur", "Lalgola"], "criticalWeight": 0.06, "soil": ["Ganga Alluvial Silt"], "aquifer": ["High Permeability Sand System"]},
        ],
    },
]


# ==========================================
# 4. Ingestion Loader Architecture
# ==========================================

class BaseDWLRLoader(ABC):
    """Abstract Base Loader Interface for future live ingestion adapters."""
    @abstractmethod
    def load_stations(self) -> List[DWLRStationSchema]:
        """Loads and normalizes DWLR station records."""
        pass


class DemoDWLRLoader(BaseDWLRLoader):
    """
    Deterministic Demo DWLR Loader.
    Generates 5,260 observation stations matching the frontend's TypeScript generator.
    """
    def __init__(self, seed: int = 42):
        self.seed = seed

    def load_stations(self) -> List[DWLRStationSchema]:
        rng = Mulberry32(self.seed)
        stations: List[DWLRStationSchema] = []
        existing_ids = set()

        # 1. Load hand-crafted anchor mock stations first
        for anchor in ANCHOR_MOCK_STATIONS:
            hist = [HistoricalReadingSchema(**h) for h in anchor.get("historicalData", [])]
            st = DWLRStationSchema(
                id=anchor["id"],
                stationCode=anchor["stationCode"],
                stationName=anchor["stationName"],
                state=anchor["state"],
                district=anchor["district"],
                block=anchor["block"],
                latitude=anchor["latitude"],
                longitude=anchor["longitude"],
                waterLevel=anchor["waterLevel"],
                previousWaterLevel=anchor["previousWaterLevel"],
                seasonalAverage=anchor["seasonalAverage"],
                criticalThreshold=anchor["criticalThreshold"],
                riskScore=anchor["riskScore"],
                status=StationStatus(anchor["status"]),
                trend=TrendDirection(anchor["trend"]),
                trendRateMetersPerMonth=anchor["trendRateMetersPerMonth"],
                daysToCritical=anchor["daysToCritical"],
                batteryLevel=anchor["batteryLevel"],
                telemetryStatus=TelemetryStatus(anchor["telemetryStatus"]),
                lastUpdated=anchor["lastUpdated"],
                soilType=anchor["soilType"],
                aquiferType=anchor["aquiferType"],
                historicalData=hist,
                farmerSummary=anchor["farmerSummary"],
                actionableAdvice=anchor["actionableAdvice"],
            )
            stations.append(st)
            existing_ids.add(st.id)

        # 2. Generate remaining stations across state configurations
        for config in STATE_CONFIGS:
            needed = config["targetCount"]
            created_for_state = len([s for s in stations if s.state == config["state"]])
            districts = config["districts"]

            while created_for_state < needed:
                dist_idx = int(rng.next() * len(districts))
                dist = districts[dist_idx]
                block = dist["blocks"][int(rng.next() * len(dist["blocks"]))]
                soil = dist["soil"][int(rng.next() * len(dist["soil"]))]
                aquifer = dist["aquifer"][int(rng.next() * len(dist["aquifer"]))]

                lat = dist["latRange"][0] + rng.next() * (dist["latRange"][1] - dist["latRange"][0])
                lng = dist["lngRange"][0] + rng.next() * (dist["lngRange"][1] - dist["lngRange"][0])

                roll = rng.next()
                if roll < dist["criticalWeight"] * 0.4:
                    status = StationStatus.CRITICAL
                    risk_score = 0.78 + rng.next() * 0.2
                    trend = TrendDirection.FALLING
                    trend_rate = -(0.2 + rng.next() * 0.18)
                    water_level = 22.0 + rng.next() * 26.0
                    critical_threshold = water_level + 1.5 + rng.next() * 3.0
                    days_to_critical = round(15 + rng.next() * 45)
                elif roll < dist["criticalWeight"] * 0.8:
                    status = StationStatus.WARNING
                    risk_score = 0.55 + rng.next() * 0.22
                    trend = TrendDirection.FALLING if rng.next() > 0.3 else TrendDirection.STABLE
                    trend_rate = -(0.1 + rng.next() * 0.12)
                    water_level = 16.0 + rng.next() * 18.0
                    critical_threshold = water_level + 4.0 + rng.next() * 5.0
                    days_to_critical = round(45 + rng.next() * 90)
                elif roll < dist["criticalWeight"] + 0.35:
                    status = StationStatus.MODERATE
                    risk_score = 0.35 + rng.next() * 0.18
                    trend_roll = rng.next()
                    trend = TrendDirection.STABLE if trend_roll > 0.5 else TrendDirection.FALLING if trend_roll > 0.25 else TrendDirection.RISING
                    trend_rate = (rng.next() - 0.5) * 0.1
                    water_level = 11.0 + rng.next() * 12.0
                    critical_threshold = water_level + 8.0 + rng.next() * 8.0
                    days_to_critical = None
                else:
                    status = StationStatus.HEALTHY
                    risk_score = 0.15 + rng.next() * 0.18
                    trend = TrendDirection.RISING if rng.next() > 0.4 else TrendDirection.STABLE
                    trend_rate = 0.05 + rng.next() * 0.15
                    water_level = 4.5 + rng.next() * 9.5
                    critical_threshold = water_level + 12.0 + rng.next() * 10.0
                    days_to_critical = None

                seq_number = len(stations) + 1
                state_code = config["state"][:2].upper()
                dist_code = dist["name"][:3].upper()
                station_id = f"DWLR-{state_code}-{str(seq_number).zfill(4)}"

                if station_id not in existing_ids:
                    existing_ids.add(station_id)
                    minutes_ago = round(5 + rng.next() * 55)
                    station_code = f"{state_code}-{dist_code}-{str(created_for_state + 1).zfill(3)}"
                    battery = round(82 + rng.next() * 18)

                    if status == StationStatus.CRITICAL:
                        farmer_summary = f"Water table is critically depleted at {round(water_level, 1)}m depth. Extraction heavily outpaces recharge."
                        actionable_advice = "Prioritize drought-resilient crops (millets/pulses). Avoid flood irrigation; deploy drip/sprinklers."
                    elif status == StationStatus.WARNING:
                        farmer_summary = f"Water level is steadily declining at {round(abs(trend_rate) * 100)}cm/month in this block."
                        actionable_advice = "Schedule irrigation during evening or early morning. Consider micro-irrigation subsidies."
                    elif status == StationStatus.MODERATE:
                        farmer_summary = "Aquifer conditions are stable with manageable seasonal drawdown."
                        actionable_advice = "Maintain balanced water use. Good conditions for standard kharif/rabi rotations."
                    else:
                        farmer_summary = f"Water table is healthy and shallow at {round(water_level, 1)}m depth with active recharge."
                        actionable_advice = "Favorable soil moisture for diversified cropping. Practice recharge maintenance."

                    t_roll = rng.next()
                    if t_roll < 0.88:
                        tel_status = TelemetryStatus.ONLINE
                    elif t_roll < 0.95:
                        tel_status = TelemetryStatus.DELAYED
                    else:
                        tel_status = TelemetryStatus.OFFLINE

                    st_obj = DWLRStationSchema(
                        id=station_id,
                        stationCode=station_code,
                        stationName=f"{dist['name']} {block} DWLR Node #{created_for_state + 1}",
                        state=config["state"],
                        district=dist["name"],
                        block=block,
                        latitude=round(lat, 4),
                        longitude=round(lng, 4),
                        waterLevel=round(water_level, 1),
                        previousWaterLevel=round(water_level - trend_rate, 1),
                        seasonalAverage=round(water_level * 0.95, 1),
                        criticalThreshold=round(critical_threshold, 1),
                        riskScore=round(risk_score, 2),
                        status=status,
                        trend=trend,
                        trendRateMetersPerMonth=round(trend_rate, 2),
                        daysToCritical=days_to_critical,
                        batteryLevel=battery,
                        telemetryStatus=tel_status,
                        lastUpdated=f"{minutes_ago} mins ago",
                        soilType=soil,
                        aquiferType=aquifer,
                        farmerSummary=farmer_summary,
                        actionableAdvice=actionable_advice,
                    )
                    stations.append(st_obj)
                    created_for_state += 1

        # 3. Backfill up to target 5,260
        total_target = 5260
        while len(stations) < total_target:
            config = STATE_CONFIGS[int(rng.next() * len(STATE_CONFIGS))]
            dist = config["districts"][int(rng.next() * len(config["districts"]))]
            lat = dist["latRange"][0] + rng.next() * (dist["latRange"][1] - dist["latRange"][0])
            lng = dist["lngRange"][0] + rng.next() * (dist["lngRange"][1] - dist["lngRange"][0])
            seq = len(stations) + 1
            state_code = config["state"][:2].upper()
            battery = round(80 + rng.next() * 20)

            t_roll = rng.next()
            if t_roll < 0.88:
                tel_status = TelemetryStatus.ONLINE
            elif t_roll < 0.95:
                tel_status = TelemetryStatus.DELAYED
            else:
                tel_status = TelemetryStatus.OFFLINE

            st_obj = DWLRStationSchema(
                id=f"DWLR-{state_code}-{str(seq).zfill(4)}",
                stationCode=f"{state_code}-{dist['name'][:3].upper()}-{str(seq % 1000).zfill(3)}",
                stationName=f"{dist['name']} Regional Node #{seq % 500}",
                state=config["state"],
                district=dist["name"],
                block=dist["blocks"][0],
                latitude=round(lat, 4),
                longitude=round(lng, 4),
                waterLevel=round(10.0 + rng.next() * 15.0, 1),
                previousWaterLevel=12.5,
                seasonalAverage=11.8,
                criticalThreshold=25.0,
                riskScore=0.35,
                status=StationStatus.MODERATE,
                trend=TrendDirection.STABLE,
                trendRateMetersPerMonth=0.02,
                daysToCritical=None,
                batteryLevel=battery,
                telemetryStatus=tel_status,
                lastUpdated="12 mins ago",
                soilType=dist["soil"][0],
                aquiferType=dist["aquifer"][0],
                farmerSummary="Groundwater table is stable.",
                actionableAdvice="Standard seasonal irrigation.",
            )
            stations.append(st_obj)

        return stations[:5260]


class CSVLoader(BaseDWLRLoader):
    """Stub adapter for future batch CSV telemetry file ingestion."""
    def load_stations(self) -> List[DWLRStationSchema]:
        raise NotImplementedError("CSVLoader will be connected in live deployment phase.")


class IndiaWRISLoader(BaseDWLRLoader):
    """Stub adapter for future live India-WRIS REST API ingestion."""
    def load_stations(self) -> List[DWLRStationSchema]:
        raise NotImplementedError("IndiaWRISLoader will be connected in live deployment phase.")


# ==========================================
# 5. In-Memory Station Repository (Singleton)
# ==========================================

class DWLRStationRepository:
    """In-memory singleton store for high-performance station queries and filtering."""
    def __init__(self, loader: Optional[BaseDWLRLoader] = None):
        self.loader = loader or DemoDWLRLoader()
        self._stations: List[DWLRStationSchema] = []
        self._station_map: Dict[str, DWLRStationSchema] = {}
        self._initialized = False

    def initialize(self):
        if not self._initialized:
            self._stations = self.loader.load_stations()
            self._station_map = {s.id.lower(): s for s in self._stations}
            # Also map stationCode
            for s in self._stations:
                self._station_map[s.stationCode.lower()] = s
            self._initialized = True

    def reload(self) -> List[DWLRStationSchema]:
        """Forces a deterministic reload of all stations from the loader."""
        self._initialized = False
        self._stations = []
        self._station_map = {}
        self.initialize()
        return self._stations

    def set_custom_stations(self, stations: List[DWLRStationSchema]):
        """Sets custom uploaded station dataset as active station network."""
        self._stations = stations
        self._station_map = {s.id.lower(): s for s in stations}
        for s in stations:
            self._station_map[s.stationCode.lower()] = s
        self._initialized = True

    def reset_to_default(self):
        """Resets active station repository back to reference simulation loader."""
        self.reload()

    def get_all(self) -> List[DWLRStationSchema]:
        self.initialize()
        return self._stations

    def get_by_id(self, station_id: str) -> Optional[DWLRStationSchema]:
        self.initialize()
        return self._station_map.get(station_id.lower())

    def filter_stations(
        self,
        state: Optional[str] = None,
        district: Optional[str] = None,
        block: Optional[str] = None,
        status: Optional[str] = None,
        trend: Optional[str] = None,
        risk: Optional[str] = None,
    ) -> List[DWLRStationSchema]:
        self.initialize()
        results = self._stations

        if state and state.lower() != "all states":
            s_low = state.lower()
            results = [s for s in results if s.state.lower() == s_low]

        if district and district.lower() != "all districts":
            d_low = district.lower()
            results = [s for s in results if s.district.lower() == d_low]

        if block and block.lower() != "all blocks":
            b_low = block.lower()
            results = [s for s in results if s.block.lower() == b_low]

        if status and status.lower() != "all":
            st_low = status.lower()
            results = [s for s in results if s.status.value.lower() == st_low]

        if trend and trend.lower() != "all":
            tr_low = trend.lower()
            results = [s for s in results if s.trend.value.lower() == tr_low]

        if risk and risk.lower() != "all":
            r_low = risk.lower()
            if r_low == "low":
                results = [s for s in results if s.riskScore < 0.35]
            elif r_low == "medium":
                results = [s for s in results if 0.35 <= s.riskScore < 0.6]
            elif r_low == "high":
                results = [s for s in results if 0.6 <= s.riskScore < 0.8]
            elif r_low == "critical":
                results = [s for s in results if s.riskScore >= 0.8]

        return results

    def search(self, query: str, limit: int = 50) -> List[DWLRStationSchema]:
        self.initialize()
        q = query.strip().lower()
        if not q:
            return self._stations[:limit]

        matches = []
        for s in self._stations:
            if (
                q in s.id.lower()
                or q in s.stationCode.lower()
                or q in s.stationName.lower()
                or q in s.district.lower()
                or q in s.state.lower()
                or q in s.block.lower()
            ):
                matches.append(s)
                if len(matches) >= limit:
                    break
        return matches

    def get_summary(self, filtered_stations: Optional[List[DWLRStationSchema]] = None) -> Dict[str, Any]:
        stations = filtered_stations if filtered_stations is not None else self.get_all()
        total = len(stations)

        healthy = sum(1 for s in stations if s.status == StationStatus.HEALTHY)
        moderate = sum(1 for s in stations if s.status == StationStatus.MODERATE)
        warning = sum(1 for s in stations if s.status == StationStatus.WARNING)
        critical = sum(1 for s in stations if s.status == StationStatus.CRITICAL)

        avg_depth = round(sum(s.waterLevel for s in stations) / total, 1) if total > 0 else 0.0
        avg_risk = round(sum(s.riskScore for s in stations) / total, 2) if total > 0 else 0.0

        unique_states = len(set(s.state for s in stations))
        online_count = sum(1 for s in stations if s.telemetryStatus == TelemetryStatus.ONLINE)
        reporting_rate = round((online_count / total) * 100, 1) if total > 0 else 0.0

        return {
            "totalStations": total,
            "healthyCount": healthy,
            "moderateCount": moderate,
            "warningCount": warning,
            "criticalCount": critical,
            "avgDepthMbgl": avg_depth,
            "avgRiskScore": avg_risk,
            "statesCount": unique_states,
            "telemetryHealth": {
                "onlineCount": online_count,
                "reportingRatePct": reporting_rate,
                "status": "Optimal Synchronized",
            },
            "data_mode": settings.DATA_MODE,
            "disclaimer": settings.DEMO_DISCLAIMER,
        }


# Global Singleton Instance
station_repo = DWLRStationRepository()
