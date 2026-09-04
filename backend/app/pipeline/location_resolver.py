"""
JalKrishi AI — Nationwide Dynamic Location Resolver Module
-----------------------------------------------------------
Resolves arbitrary Indian location queries (villages, towns, tehsils/taluks,
cities, districts, states, PIN codes, coordinates) to geographical coordinates
(latitude, longitude) and administrative metadata.

Supports 13 Indian regional languages:
- English, Hindi, Kannada, Tamil, Telugu, Bengali, Gujarati, Marathi,
  Malayalam, Punjabi, Odia, Assamese, Urdu.

STRICT ARCHITECTURAL RULES:
1. Zero implicit/default city fallbacks (NO Kolar, Sangrur, Shivamogga, Bengaluru defaults).
2. International locations outside India return a clear India-support notice.
3. Unrecognized locations return a clear unrecognized location error without faking coordinates.
4. If coordinates are available, uses geographic distance to find nearby DWLR stations without picking unrelated stations.
"""

import logging
import re
from typing import Optional, Dict, Any, Tuple, Set
from dataclasses import dataclass
from app.pipeline.dwlr_ingest import station_repo

logger = logging.getLogger("app.location_resolver")


@dataclass
class LocationResolution:
    is_resolved: bool
    status: str = "VERIFIED"  # "VERIFIED", "AMBIGUOUS", "UNRESOLVED", "INTERNATIONAL"
    resolution_source: Optional[str] = None
    confidence: float = 1.0
    ambiguous_options: Optional[list] = None
    name: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    matched_station_id: Optional[str] = None
    error_message: Optional[str] = None
    is_international: bool = False



# ==============================================================================
# AMBIGUOUS LOCATIONS DATABASE (Requires disambiguation)
# ==============================================================================
AMBIGUOUS_LOCATIONS_MAP: Dict[str, list] = {
    "rajpur": [
        {"district": "Barwani", "state": "Madhya Pradesh", "latitude": 21.9333, "longitude": 75.1333, "confidence": 0.85},
        {"district": "Balrampur", "state": "Chhattisgarh", "latitude": 23.5167, "longitude": 83.3333, "confidence": 0.85},
        {"district": "Dehradun", "state": "Uttarakhand", "latitude": 30.3833, "longitude": 78.0833, "confidence": 0.85},
    ],
    "bilaspur": [
        {"district": "Bilaspur", "state": "Chhattisgarh", "latitude": 22.0797, "longitude": 82.1391, "confidence": 0.90},
        {"district": "Bilaspur", "state": "Himachal Pradesh", "latitude": 31.3260, "longitude": 76.7621, "confidence": 0.85},
        {"district": "Rampur", "state": "Uttar Pradesh", "latitude": 28.8833, "longitude": 79.2667, "confidence": 0.80},
    ],
    "rampur": [
        {"district": "Rampur", "state": "Uttar Pradesh", "latitude": 28.8033, "longitude": 79.0257, "confidence": 0.90},
        {"district": "Shimla", "state": "Himachal Pradesh", "latitude": 31.4500, "longitude": 77.6333, "confidence": 0.85},
    ],
    "aurangabad": [
        {"district": "Chhatrapati Sambhajinagar", "state": "Maharashtra", "latitude": 19.8762, "longitude": 75.3433, "confidence": 0.95},
        {"district": "Aurangabad", "state": "Bihar", "latitude": 24.7500, "longitude": 84.3667, "confidence": 0.90},
    ],
    "pratapgarh": [
        {"district": "Pratapgarh", "state": "Uttar Pradesh", "latitude": 25.9000, "longitude": 81.9833, "confidence": 0.90},
        {"district": "Pratapgarh", "state": "Rajasthan", "latitude": 24.0333, "longitude": 74.7833, "confidence": 0.90},
    ],
}

# ==============================================================================
# 1. COMPREHENSIVE NATIONWIDE INDIAN REFERENCE LOCATIONS DATABASE
# ==============================================================================
# Format: "place_key": (latitude, longitude, district, state)
KNOWN_REFERENCE_LOCATIONS: Dict[str, Tuple[float, float, str, str]] = {
    # --- MAHARASHTRA (West) ---
    "mumbai": (19.0760, 72.8777, "Mumbai", "Maharashtra"),
    "bombay": (19.0760, 72.8777, "Mumbai", "Maharashtra"),
    "pune": (18.5204, 73.8567, "Pune", "Maharashtra"),
    "poona": (18.5204, 73.8567, "Pune", "Maharashtra"),
    "nashik": (19.9975, 73.7898, "Nashik", "Maharashtra"),
    "nasik": (19.9975, 73.7898, "Nashik", "Maharashtra"),
    "baramati": (18.1517, 74.5772, "Pune", "Maharashtra"),
    "nagpur": (21.1458, 79.0882, "Nagpur", "Maharashtra"),
    "thane": (19.2183, 72.9781, "Thane", "Maharashtra"),
    "chhatrapati sambhajinagar": (19.8762, 75.3433, "Chhatrapati Sambhajinagar", "Maharashtra"),
    "aurangabad": (19.8762, 75.3433, "Chhatrapati Sambhajinagar", "Maharashtra"),
    "solapur": (17.6599, 75.9064, "Solapur", "Maharashtra"),
    "kolhapur": (16.7050, 74.2433, "Kolhapur", "Maharashtra"),
    "amravati": (20.9374, 77.7796, "Amravati", "Maharashtra"),
    "nanded": (19.1383, 77.3210, "Nanded", "Maharashtra"),
    "jalgaon": (21.0077, 75.5626, "Jalgaon", "Maharashtra"),
    "akola": (20.7002, 77.0082, "Akola", "Maharashtra"),
    "latur": (18.4088, 76.5604, "Latur", "Maharashtra"),
    "dhule": (20.9042, 74.7749, "Dhule", "Maharashtra"),
    "ahmednagar": (19.0952, 74.7496, "Ahmednagar", "Maharashtra"),
    "satara": (17.6805, 74.0183, "Satara", "Maharashtra"),
    "sangli": (16.8524, 74.5815, "Sangli", "Maharashtra"),
    "ratnagiri": (16.9902, 73.3120, "Ratnagiri", "Maharashtra"),
    "sindhudurg": (16.1118, 73.6876, "Sindhudurg", "Maharashtra"),
    "parbhani": (19.2644, 76.7767, "Parbhani", "Maharashtra"),
    "beed": (18.9891, 75.7601, "Beed", "Maharashtra"),
    "osmanabad": (18.1853, 76.0419, "Dharashiv", "Maharashtra"),
    "dharashiv": (18.1853, 76.0419, "Dharashiv", "Maharashtra"),
    "wardha": (20.7453, 78.6022, "Wardha", "Maharashtra"),
    "yavatmal": (20.3888, 78.1204, "Yavatmal", "Maharashtra"),
    "chandrapur": (19.9615, 79.2961, "Chandrapur", "Maharashtra"),
    "bhandara": (21.1714, 79.6521, "Bhandara", "Maharashtra"),
    "gondia": (21.4598, 80.1961, "Gondia", "Maharashtra"),
    "gadchiroli": (20.1809, 79.9972, "Gadchiroli", "Maharashtra"),
    "maharashtra": (19.7515, 75.7139, "Maharashtra", "Maharashtra"),

    # --- GUJARAT (West) ---
    "ahmedabad": (23.0225, 72.5714, "Ahmedabad", "Gujarat"),
    "surat": (21.1702, 72.8311, "Surat", "Gujarat"),
    "vadodara": (22.3072, 73.1812, "Vadodara", "Gujarat"),
    "baroda": (22.3072, 73.1812, "Vadodara", "Gujarat"),
    "rajkot": (22.3039, 70.8022, "Rajkot", "Gujarat"),
    "bhavnagar": (21.7645, 72.1519, "Bhavnagar", "Gujarat"),
    "jamnagar": (22.4707, 70.0577, "Jamnagar", "Gujarat"),
    "junagadh": (21.5222, 70.4579, "Junagadh", "Gujarat"),
    "gandhinagar": (23.2156, 72.6369, "Gandhinagar", "Gujarat"),
    "mehsana": (23.5880, 72.3693, "Mehsana", "Gujarat"),
    "anand": (22.5645, 72.9289, "Anand", "Gujarat"),
    "morbi": (22.8173, 70.8370, "Morbi", "Gujarat"),
    "bharuch": (21.7051, 72.9959, "Bharuch", "Gujarat"),
    "porbandar": (21.6417, 69.6293, "Porbandar", "Gujarat"),
    "navsari": (20.9467, 72.9520, "Navsari", "Gujarat"),
    "valsad": (20.5992, 72.9342, "Valsad", "Gujarat"),
    "bhuj": (23.2420, 69.6669, "Kutch", "Gujarat"),
    "kutch": (23.2420, 69.6669, "Kutch", "Gujarat"),
    "amreli": (21.6032, 71.2221, "Amreli", "Gujarat"),
    "banaskantha": (24.1724, 72.4346, "Banaskantha", "Gujarat"),
    "palanpur": (24.1724, 72.4346, "Banaskantha", "Gujarat"),
    "sabarkantha": (23.5880, 72.9667, "Sabarkantha", "Gujarat"),
    "himatnagar": (23.5880, 72.9667, "Sabarkantha", "Gujarat"),
    "surendranagar": (22.7275, 71.6370, "Surendranagar", "Gujarat"),
    "gujarat": (22.2587, 71.1924, "Gujarat", "Gujarat"),

    # --- GOA (West) ---
    "goa": (15.2993, 74.1240, "North Goa", "Goa"),
    "panaji": (15.4909, 73.8278, "North Goa", "Goa"),
    "panjim": (15.4909, 73.8278, "North Goa", "Goa"),
    "margao": (15.2832, 73.9862, "South Goa", "Goa"),
    "vasco da gama": (15.3982, 73.8113, "South Goa", "Goa"),
    "vasco": (15.3982, 73.8113, "South Goa", "Goa"),
    "mapusa": (15.5937, 73.8142, "North Goa", "Goa"),
    "ponda": (15.4026, 74.0151, "North Goa", "Goa"),

    # --- PUNJAB (North) ---
    "punjab": (31.1471, 75.3412, "Punjab", "Punjab"),
    "amritsar": (31.6340, 74.8723, "Amritsar", "Punjab"),
    "ludhiana": (30.9010, 75.8573, "Ludhiana", "Punjab"),
    "jalandhar": (31.3260, 75.5762, "Jalandhar", "Punjab"),
    "patiala": (30.3398, 76.3869, "Patiala", "Punjab"),
    "bathinda": (30.2110, 74.9455, "Bathinda", "Punjab"),
    "sangrur": (30.2450, 75.8420, "Sangrur", "Punjab"),
    "hoshiarpur": (31.5273, 75.9149, "Hoshiarpur", "Punjab"),
    "mohali": (30.7046, 76.7179, "SAS Nagar", "Punjab"),
    "sas nagar": (30.7046, 76.7179, "SAS Nagar", "Punjab"),
    "firozpur": (30.9237, 74.6064, "Firozpur", "Punjab"),
    "gurdaspur": (32.0419, 75.4053, "Gurdaspur", "Punjab"),
    "pathankot": (32.2643, 75.6527, "Pathankot", "Punjab"),
    "moga": (30.8230, 75.1734, "Moga", "Punjab"),
    "kapurthala": (31.3802, 75.3815, "Kapurthala", "Punjab"),
    "faridkot": (30.6769, 74.7583, "Faridkot", "Punjab"),
    "mansa": (29.9984, 75.3934, "Mansa", "Punjab"),
    "fazilka": (30.4036, 74.0254, "Fazilka", "Punjab"),
    "barnala": (30.3819, 75.5471, "Barnala", "Punjab"),
    "fatehgarh sahib": (30.6488, 76.3888, "Fatehgarh Sahib", "Punjab"),
    "rupnagar": (30.9664, 76.5331, "Rupnagar", "Punjab"),
    "ropar": (30.9664, 76.5331, "Rupnagar", "Punjab"),
    "tarn taran": (31.4520, 74.9264, "Tarn Taran", "Punjab"),
    "malerkotla": (30.5256, 75.8887, "Malerkotla", "Punjab"),

    # --- HARYANA & CHANDIGARH (North) ---
    "haryana": (29.0588, 76.0856, "Haryana", "Haryana"),
    "chandigarh": (30.7333, 76.7794, "Chandigarh", "Chandigarh"),
    "gurugram": (28.4595, 77.0266, "Gurugram", "Haryana"),
    "gurgaon": (28.4595, 77.0266, "Gurugram", "Haryana"),
    "faridabad": (28.4089, 77.3178, "Faridabad", "Haryana"),
    "hisar": (29.1492, 75.7217, "Hisar", "Haryana"),
    "rohtak": (28.8955, 76.6066, "Rohtak", "Haryana"),
    "panipat": (29.3909, 76.9635, "Panipat", "Haryana"),
    "karnal": (29.6857, 76.9905, "Karnal", "Haryana"),
    "ambala": (30.3782, 76.7767, "Ambala", "Haryana"),
    "yamunanagar": (30.1290, 77.2674, "Yamunanagar", "Haryana"),
    "sonipat": (28.9931, 77.0151, "Sonipat", "Haryana"),
    "panchkula": (30.6942, 76.8606, "Panchkula", "Haryana"),
    "bhiwani": (28.7932, 76.1390, "Bhiwani", "Haryana"),
    "sirsa": (29.5349, 75.0290, "Sirsa", "Haryana"),
    "jind": (29.3157, 76.3157, "Jind", "Haryana"),
    "rewari": (28.1920, 76.6191, "Rewari", "Haryana"),
    "kurukshetra": (29.9695, 76.8783, "Kurukshetra", "Haryana"),
    "kaithal": (29.8015, 76.3997, "Kaithal", "Haryana"),
    "palwal": (28.1447, 77.3259, "Palwal", "Haryana"),
    "jhajjar": (28.6063, 76.6565, "Jhajjar", "Haryana"),
    "fatehabad": (29.5152, 75.4552, "Fatehabad", "Haryana"),
    "mahendragarh": (28.2796, 76.1517, "Mahendragarh", "Haryana"),
    "narnaul": (28.0439, 76.1077, "Mahendragarh", "Haryana"),

    # --- DELHI (North) ---
    "delhi": (28.6139, 77.2090, "Delhi", "Delhi"),
    "new delhi": (28.6139, 77.2090, "Delhi", "Delhi"),
    "ncr": (28.6139, 77.2090, "Delhi", "Delhi"),

    # --- RAJASTHAN (North/West) ---
    "rajasthan": (27.0238, 74.2179, "Rajasthan", "Rajasthan"),
    "jaipur": (26.9124, 75.7873, "Jaipur", "Rajasthan"),
    "jodhpur": (26.2389, 73.0243, "Jodhpur", "Rajasthan"),
    "udaipur": (24.5854, 73.7125, "Udaipur", "Rajasthan"),
    "kota": (25.2138, 75.8648, "Kota", "Rajasthan"),
    "bikaner": (28.0229, 73.3119, "Bikaner", "Rajasthan"),
    "ajmer": (26.4499, 74.6399, "Ajmer", "Rajasthan"),
    "alwar": (27.5530, 76.6346, "Alwar", "Rajasthan"),
    "sikar": (27.6094, 75.1398, "Sikar", "Rajasthan"),
    "bharatpur": (27.2152, 77.5030, "Bharatpur", "Rajasthan"),
    "bhilwara": (25.3407, 74.6313, "Bhilwara", "Rajasthan"),
    "sri ganganagar": (29.9038, 73.8772, "Sri Ganganagar", "Rajasthan"),
    "ganganagar": (29.9038, 73.8772, "Sri Ganganagar", "Rajasthan"),
    "pali": (25.7713, 73.3237, "Pali", "Rajasthan"),
    "chittorgarh": (24.8887, 74.6269, "Chittorgarh", "Rajasthan"),
    "hanumangarh": (29.5819, 74.3294, "Hanumangarh", "Rajasthan"),
    "jhunjhunu": (28.1289, 75.3995, "Jhunjhunu", "Rajasthan"),
    "churu": (28.2900, 74.9698, "Churu", "Rajasthan"),
    "nagaur": (27.2070, 73.7423, "Nagaur", "Rajasthan"),
    "tonk": (26.1668, 75.7885, "Tonk", "Rajasthan"),
    "barmer": (25.7532, 71.4181, "Barmer", "Rajasthan"),
    "jaisalmer": (26.9157, 70.9083, "Jaisalmer", "Rajasthan"),
    "jalore": (25.3444, 72.6156, "Jalore", "Rajasthan"),
    "sirohi": (24.8826, 72.8601, "Sirohi", "Rajasthan"),
    "banswara": (23.5461, 74.4373, "Banswara", "Rajasthan"),
    "dungarpur": (23.8385, 73.7147, "Dungarpur", "Rajasthan"),
    "pratapgarh": (24.0315, 74.7816, "Pratapgarh", "Rajasthan"),
    "sawai madhopur": (25.9928, 76.3533, "Sawai Madhopur", "Rajasthan"),
    "karauli": (26.4950, 77.0200, "Karauli", "Rajasthan"),
    "dholpur": (26.7025, 77.8934, "Dholpur", "Rajasthan"),
    "baran": (25.1011, 76.5132, "Baran", "Rajasthan"),
    "jhalawar": (24.5973, 76.1610, "Jhalawar", "Rajasthan"),
    "bundi": (25.4415, 75.6454, "Bundi", "Rajasthan"),
    "rajsamand": (25.0748, 73.8822, "Rajsamand", "Rajasthan"),
    "dausa": (26.8931, 76.3375, "Dausa", "Rajasthan"),

    # --- UTTAR PRADESH (North/Central) ---
    "uttar pradesh": (26.8467, 80.9462, "Uttar Pradesh", "Uttar Pradesh"),
    "lucknow": (26.8467, 80.9462, "Lucknow", "Uttar Pradesh"),
    "kanpur": (26.4499, 80.3319, "Kanpur Nagar", "Uttar Pradesh"),
    "varanasi": (25.3176, 82.9739, "Varanasi", "Uttar Pradesh"),
    "banaras": (25.3176, 82.9739, "Varanasi", "Uttar Pradesh"),
    "kashi": (25.3176, 82.9739, "Varanasi", "Uttar Pradesh"),
    "prayagraj": (25.4358, 81.8463, "Prayagraj", "Uttar Pradesh"),
    "allahabad": (25.4358, 81.8463, "Prayagraj", "Uttar Pradesh"),
    "agra": (27.1767, 78.0081, "Agra", "Uttar Pradesh"),
    "meerut": (28.9845, 77.7064, "Meerut", "Uttar Pradesh"),
    "ghaziabad": (28.6692, 77.4538, "Ghaziabad", "Uttar Pradesh"),
    "noida": (28.5355, 77.3910, "Gautam Buddha Nagar", "Uttar Pradesh"),
    "greater noida": (28.4744, 77.5040, "Gautam Buddha Nagar", "Uttar Pradesh"),
    "aligarh": (27.8974, 78.0880, "Aligarh", "Uttar Pradesh"),
    "bareilly": (28.3670, 79.4304, "Bareilly", "Uttar Pradesh"),
    "moradabad": (28.8386, 78.7733, "Moradabad", "Uttar Pradesh"),
    "gorakhpur": (26.7606, 83.3732, "Gorakhpur", "Uttar Pradesh"),
    "jhansi": (25.4484, 78.5685, "Jhansi", "Uttar Pradesh"),
    "mathura": (27.4924, 77.6737, "Mathura", "Uttar Pradesh"),
    "ayodhya": (26.7922, 82.1998, "Ayodhya", "Uttar Pradesh"),
    "faizabad": (26.7730, 82.1458, "Ayodhya", "Uttar Pradesh"),
    "saharanpur": (29.9671, 77.5510, "Saharanpur", "Uttar Pradesh"),
    "firozabad": (27.1593, 78.3957, "Firozabad", "Uttar Pradesh"),
    "muzaffarnagar": (29.4727, 77.7085, "Muzaffarnagar", "Uttar Pradesh"),
    "budaun": (28.0315, 79.1235, "Budaun", "Uttar Pradesh"),
    "rampur": (28.8074, 79.0270, "Rampur", "Uttar Pradesh"),
    "shahjahanpur": (27.8805, 79.9080, "Shahjahanpur", "Uttar Pradesh"),
    "farrukhabad": (27.3826, 79.5847, "Farrukhabad", "Uttar Pradesh"),
    "etawah": (26.7770, 79.0305, "Etawah", "Uttar Pradesh"),
    "mainpuri": (27.2285, 79.0242, "Mainpuri", "Uttar Pradesh"),
    "mirzapur": (25.1460, 82.5690, "Mirzapur", "Uttar Pradesh"),
    "sonbhadra": (24.6853, 83.0664, "Sonbhadra", "Uttar Pradesh"),
    "robertsganj": (24.6853, 83.0664, "Sonbhadra", "Uttar Pradesh"),
    "sultanpur": (26.2648, 82.0727, "Sultanpur", "Uttar Pradesh"),
    "jaunpur": (25.7464, 82.6837, "Jaunpur", "Uttar Pradesh"),
    "azamgarh": (26.0683, 83.1840, "Azamgarh", "Uttar Pradesh"),
    "ballia": (25.7584, 84.1482, "Ballia", "Uttar Pradesh"),
    "deoria": (26.5024, 83.7791, "Deoria", "Uttar Pradesh"),
    "basti": (26.7995, 82.7486, "Basti", "Uttar Pradesh"),
    "gonda": (27.1307, 81.9619, "Gonda", "Uttar Pradesh"),
    "bahraich": (27.5744, 81.5975, "Bahraich", "Uttar Pradesh"),
    "sitapur": (27.5684, 80.6829, "Sitapur", "Uttar Pradesh"),
    "hardoi": (27.3957, 80.1312, "Hardoi", "Uttar Pradesh"),
    "unnao": (26.5457, 80.4878, "Unnao", "Uttar Pradesh"),
    "raebareli": (26.2303, 81.2409, "Raebareli", "Uttar Pradesh"),
    "amethi": (26.1558, 81.8152, "Amethi", "Uttar Pradesh"),
    "pratapgarh up": (25.8973, 81.9443, "Pratapgarh", "Uttar Pradesh"),
    "banda": (25.4754, 80.3347, "Banda", "Uttar Pradesh"),
    "chitrakoot": (25.1769, 80.8711, "Chitrakoot", "Uttar Pradesh"),
    "hamirpur": (25.9538, 80.1517, "Hamirpur", "Uttar Pradesh"),
    "mahoba": (25.2917, 79.8722, "Mahoba", "Uttar Pradesh"),
    "lalitpur": (24.6908, 78.4144, "Lalitpur", "Uttar Pradesh"),
    "jalaun": (26.1472, 79.3364, "Jalaun", "Uttar Pradesh"),
    "orai": (25.9928, 79.4527, "Jalaun", "Uttar Pradesh"),

    # --- MADHYA PRADESH (Central) ---
    "madhya pradesh": (22.9734, 78.6569, "Madhya Pradesh", "Madhya Pradesh"),
    "bhopal": (23.2599, 77.4126, "Bhopal", "Madhya Pradesh"),
    "indore": (22.7196, 75.8577, "Indore", "Madhya Pradesh"),
    "jabalpur": (23.1815, 79.9864, "Jabalpur", "Madhya Pradesh"),
    "gwalior": (26.2183, 78.1828, "Gwalior", "Madhya Pradesh"),
    "ujjain": (23.1765, 75.7885, "Ujjain", "Madhya Pradesh"),
    "sagar": (23.8388, 78.7378, "Sagar", "Madhya Pradesh"),
    "dewas": (22.9676, 76.0534, "Dewas", "Madhya Pradesh"),
    "satna": (24.5800, 80.8322, "Satna", "Madhya Pradesh"),
    "ratlam": (23.3315, 75.0367, "Ratlam", "Madhya Pradesh"),
    "rewa": (24.5362, 81.3037, "Rewa", "Madhya Pradesh"),
    "katni": (23.8343, 80.3957, "Katni", "Madhya Pradesh"),
    "singrauli": (24.1992, 82.6645, "Singrauli", "Madhya Pradesh"),
    "burhanpur": (21.3109, 76.2298, "Burhanpur", "Madhya Pradesh"),
    "khandwa": (21.8267, 76.3473, "Khandwa", "Madhya Pradesh"),
    "khargone": (21.8234, 75.6186, "Khargone", "Madhya Pradesh"),
    "chhindwara": (22.0574, 78.9382, "Chhindwara", "Madhya Pradesh"),
    "guna": (24.6480, 77.3110, "Guna", "Madhya Pradesh"),
    "shivpuri": (25.4319, 77.6593, "Shivpuri", "Madhya Pradesh"),
    "vidisha": (23.5251, 77.8081, "Vidisha", "Madhya Pradesh"),
    "damoh": (23.8323, 79.4420, "Damoh", "Madhya Pradesh"),
    "mandsaur": (24.0722, 75.0694, "Mandsaur", "Madhya Pradesh"),
    "neemuch": (24.4740, 74.8719, "Neemuch", "Madhya Pradesh"),
    "hoshangabad": (22.7519, 77.7289, "Narmadapuram", "Madhya Pradesh"),
    "narmadapuram": (22.7519, 77.7289, "Narmadapuram", "Madhya Pradesh"),
    "sehore": (23.2031, 77.0844, "Sehore", "Madhya Pradesh"),
    "raisen": (23.3315, 77.7947, "Raisen", "Madhya Pradesh"),
    "betul": (21.9015, 77.9015, "Betul", "Madhya Pradesh"),
    "balaghat": (21.8129, 80.1837, "Balaghat", "Madhya Pradesh"),
    "seoni": (22.0869, 79.5435, "Seoni", "Madhya Pradesh"),
    "narsinghpur": (22.9475, 79.1950, "Narsinghpur", "Madhya Pradesh"),
    "mandla": (22.5982, 80.3712, "Mandla", "Madhya Pradesh"),
    "dindori": (22.9463, 81.0805, "Dindori", "Madhya Pradesh"),
    "dhar": (22.5976, 75.2976, "Dhar", "Madhya Pradesh"),
    "barwani": (22.0367, 74.9031, "Barwani", "Madhya Pradesh"),
    "alirajpur": (22.3045, 74.3546, "Alirajpur", "Madhya Pradesh"),
    "jhabua": (22.7694, 74.5956, "Jhabua", "Madhya Pradesh"),
    "shajapur": (23.4267, 76.2778, "Shajapur", "Madhya Pradesh"),
    "agar malwa": (23.7118, 76.0152, "Agar Malwa", "Madhya Pradesh"),
    "rajgarh": (24.0076, 76.7277, "Rajgarh", "Madhya Pradesh"),
    "panna": (24.7208, 80.1837, "Panna", "Madhya Pradesh"),
    "chhatarpur": (24.9164, 79.5811, "Chhatarpur", "Madhya Pradesh"),
    "tikamgarh": (24.7447, 78.8311, "Tikamgarh", "Madhya Pradesh"),
    "niwari": (25.3582, 78.8020, "Niwari", "Madhya Pradesh"),
    "bhind": (26.5654, 78.7885, "Bhind", "Madhya Pradesh"),
    "morena": (26.4950, 77.9942, "Morena", "Madhya Pradesh"),
    "sheopur": (25.6669, 76.6976, "Sheopur", "Madhya Pradesh"),
    "datia": (25.6672, 78.4619, "Datia", "Madhya Pradesh"),
    "sidhi": (24.4072, 81.8847, "Sidhi", "Madhya Pradesh"),
    "shahdol": (23.2942, 81.3533, "Shahdol", "Madhya Pradesh"),
    "umaria": (23.5247, 80.8354, "Umaria", "Madhya Pradesh"),
    "anuppur": (23.1044, 81.6917, "Anuppur", "Madhya Pradesh"),

    # --- CHHATTISGARH (Central/East) ---
    "chhattisgarh": (21.2787, 81.8661, "Chhattisgarh", "Chhattisgarh"),
    "raipur": (21.2514, 81.6296, "Raipur", "Chhattisgarh"),
    "bhilai": (21.1938, 81.3509, "Durg", "Chhattisgarh"),
    "durg": (21.1904, 81.2849, "Durg", "Chhattisgarh"),
    "bilaspur": (22.0797, 82.1409, "Bilaspur", "Chhattisgarh"),
    "korba": (22.3595, 82.7501, "Korba", "Chhattisgarh"),
    "rajnandgaon": (21.0974, 81.0347, "Rajnandgaon", "Chhattisgarh"),
    "raigarh": (21.8974, 83.3950, "Raigarh", "Chhattisgarh"),
    "jagdalpur": (19.0734, 82.0298, "Bastar", "Chhattisgarh"),
    "bastar": (19.0734, 82.0298, "Bastar", "Chhattisgarh"),
    "ambikapur": (23.1197, 83.1989, "Surguja", "Chhattisgarh"),
    "surguja": (23.1197, 83.1989, "Surguja", "Chhattisgarh"),
    "dhamtari": (20.7071, 81.5498, "Dhamtari", "Chhattisgarh"),
    "mahasamund": (21.1094, 82.0967, "Mahasamund", "Chhattisgarh"),
    "kanker": (20.2719, 81.4931, "Kanker", "Chhattisgarh"),
    "kabirdham": (22.0118, 81.2464, "Kabirdham", "Chhattisgarh"),
    "kawardha": (22.0118, 81.2464, "Kabirdham", "Chhattisgarh"),
    "janjgir": (22.0117, 82.5714, "Janjgir-Champa", "Chhattisgarh"),
    "champa": (22.0463, 82.6567, "Janjgir-Champa", "Chhattisgarh"),

    # --- KARNATAKA (South) ---
    "karnataka": (15.3173, 75.7139, "Karnataka", "Karnataka"),
    "bengaluru": (12.9716, 77.5946, "Bengaluru Urban", "Karnataka"),
    "bangalore": (12.9716, 77.5946, "Bengaluru Urban", "Karnataka"),
    "mysuru": (12.2958, 76.6394, "Mysuru", "Karnataka"),
    "mysore": (12.2958, 76.6394, "Mysuru", "Karnataka"),
    "hubballi": (15.3647, 75.1240, "Dharwad", "Karnataka"),
    "hubli": (15.3647, 75.1240, "Dharwad", "Karnataka"),
    "dharwad": (15.4589, 75.0078, "Dharwad", "Karnataka"),
    "mangaluru": (12.9141, 74.8560, "Dakshina Kannada", "Karnataka"),
    "mangalore": (12.9141, 74.8560, "Dakshina Kannada", "Karnataka"),
    "belagavi": (15.8497, 74.4977, "Belagavi", "Karnataka"),
    "belgaum": (15.8497, 74.4977, "Belagavi", "Karnataka"),
    "kalaburagi": (17.3297, 76.8343, "Kalaburagi", "Karnataka"),
    "gulbarga": (17.3297, 76.8343, "Kalaburagi", "Karnataka"),
    "davanagere": (14.4644, 75.9218, "Davanagere", "Karnataka"),
    "davangere": (14.4644, 75.9218, "Davanagere", "Karnataka"),
    "ballari": (15.1394, 76.9214, "Ballari", "Karnataka"),
    "bellary": (15.1394, 76.9214, "Ballari", "Karnataka"),
    "vijayapura": (16.8302, 75.7100, "Vijayapura", "Karnataka"),
    "bijapur": (16.8302, 75.7100, "Vijayapura", "Karnataka"),
    "shivamogga": (13.9299, 75.5681, "Shivamogga", "Karnataka"),
    "shimoga": (13.9299, 75.5681, "Shivamogga", "Karnataka"),
    "tumakuru": (13.3409, 77.1006, "Tumakuru", "Karnataka"),
    "tumkur": (13.3409, 77.1006, "Tumakuru", "Karnataka"),
    "raichur": (16.2120, 77.3439, "Raichur", "Karnataka"),
    "bidar": (17.9104, 77.5199, "Bidar", "Karnataka"),
    "hosapete": (15.2719, 76.3888, "Vijayanagara", "Karnataka"),
    "hospet": (15.2719, 76.3888, "Vijayanagara", "Karnataka"),
    "gadag": (15.4298, 75.6322, "Gadag", "Karnataka"),
    "udupi": (13.3409, 74.7421, "Udupi", "Karnataka"),
    "kolar": (13.1367, 78.1291, "Kolar", "Karnataka"),
    "chikkaballapur": (13.4325, 77.7275, "Chikkaballapur", "Karnataka"),
    "chikballapur": (13.4325, 77.7275, "Chikkaballapur", "Karnataka"),
    "hassan": (13.0033, 76.1004, "Hassan", "Karnataka"),
    "mandya": (12.5218, 76.8951, "Mandya", "Karnataka"),
    "chamarajanagar": (11.9261, 76.9437, "Chamarajanagar", "Karnataka"),
    "chikkamagaluru": (13.3161, 75.7720, "Chikkamagaluru", "Karnataka"),
    "chikmagalur": (13.3161, 75.7720, "Chikkamagaluru", "Karnataka"),
    "ramanagara": (12.7209, 77.2799, "Ramanagara", "Karnataka"),
    "bagalkote": (16.1875, 75.6987, "Bagalkote", "Karnataka"),
    "bagalkot": (16.1875, 75.6987, "Bagalkote", "Karnataka"),
    "haveri": (14.7954, 75.3991, "Haveri", "Karnataka"),
    "koppal": (15.3482, 76.1557, "Koppal", "Karnataka"),
    "yadgir": (16.7634, 77.1352, "Yadgir", "Karnataka"),
    "uttara kannada": (14.8185, 74.1303, "Uttara Kannada", "Karnataka"),
    "karwar": (14.8185, 74.1303, "Uttara Kannada", "Karnataka"),
    "kodagu": (12.4244, 75.7382, "Kodagu", "Karnataka"),
    "madikeri": (12.4244, 75.7382, "Kodagu", "Karnataka"),
    "coorg": (12.4244, 75.7382, "Kodagu", "Karnataka"),

    # --- TAMIL NADU (South) ---
    "tamil nadu": (11.1271, 78.6569, "Tamil Nadu", "Tamil Nadu"),
    "chennai": (13.0827, 80.2707, "Chennai", "Tamil Nadu"),
    "madras": (13.0827, 80.2707, "Chennai", "Tamil Nadu"),
    "coimbatore": (11.0168, 76.9558, "Coimbatore", "Tamil Nadu"),
    "madurai": (9.9252, 78.1198, "Madurai", "Tamil Nadu"),
    "tiruchirappalli": (10.7905, 78.7047, "Tiruchirappalli", "Tamil Nadu"),
    "trichy": (10.7905, 78.7047, "Tiruchirappalli", "Tamil Nadu"),
    "salem": (11.6643, 78.1460, "Salem", "Tamil Nadu"),
    "tirunelveli": (8.7139, 77.7567, "Tirunelveli", "Tamil Nadu"),
    "nellai": (8.7139, 77.7567, "Tirunelveli", "Tamil Nadu"),
    "tiruppur": (11.1085, 77.3411, "Tiruppur", "Tamil Nadu"),
    "tirupur": (11.1085, 77.3411, "Tiruppur", "Tamil Nadu"),
    "ranipet": (12.9224, 79.3328, "Ranipet", "Tamil Nadu"),
    "nagercoil": (8.1833, 77.4119, "Kanyakumari", "Tamil Nadu"),
    "kanyakumari": (8.0883, 77.5385, "Kanyakumari", "Tamil Nadu"),
    "thanjavur": (10.7870, 79.1378, "Thanjavur", "Tamil Nadu"),
    "tanjore": (10.7870, 79.1378, "Thanjavur", "Tamil Nadu"),
    "vellore": (12.9165, 79.1325, "Vellore", "Tamil Nadu"),
    "kancheepuram": (12.8342, 79.7036, "Kancheepuram", "Tamil Nadu"),
    "kanchipuram": (12.8342, 79.7036, "Kancheepuram", "Tamil Nadu"),
    "erode": (11.3410, 77.7172, "Erode", "Tamil Nadu"),
    "tiruvannamalai": (12.2253, 79.0747, "Tiruvannamalai", "Tamil Nadu"),
    "dindigul": (10.3673, 77.9803, "Dindigul", "Tamil Nadu"),
    "cuddalore": (11.7480, 79.7714, "Cuddalore", "Tamil Nadu"),
    "karur": (10.9601, 78.0766, "Karur", "Tamil Nadu"),
    "namakkal": (11.2189, 78.1674, "Namakkal", "Tamil Nadu"),
    "dharmapuri": (12.1211, 78.1582, "Dharmapuri", "Tamil Nadu"),
    "krishnagiri": (12.5186, 78.2137, "Krishnagiri", "Tamil Nadu"),
    "hosur": (12.7409, 77.8253, "Krishnagiri", "Tamil Nadu"),
    "nilgiris": (11.4916, 76.7337, "Nilgiris", "Tamil Nadu"),
    "ooty": (11.4102, 76.6950, "Nilgiris", "Tamil Nadu"),
    "udhagamandalam": (11.4102, 76.6950, "Nilgiris", "Tamil Nadu"),
    "perambalur": (11.2342, 78.8820, "Perambalur", "Tamil Nadu"),
    "ariyalur": (11.1401, 79.0786, "Ariyalur", "Tamil Nadu"),
    "pudukkottai": (10.3797, 78.8208, "Pudukkottai", "Tamil Nadu"),
    "sivaganga": (9.8433, 78.4809, "Sivaganga", "Tamil Nadu"),
    "virudhunagar": (9.5680, 77.9624, "Virudhunagar", "Tamil Nadu"),
    "ramanathapuram": (9.3639, 78.8395, "Ramanathapuram", "Tamil Nadu"),
    "thoothukudi": (8.7642, 78.1348, "Thoothukudi", "Tamil Nadu"),
    "tuticorin": (8.7642, 78.1348, "Thoothukudi", "Tamil Nadu"),
    "tenkasi": (8.9594, 77.3152, "Tenkasi", "Tamil Nadu"),
    "thiruvarur": (10.7725, 79.6366, "Thiruvarur", "Tamil Nadu"),
    "nagapattinam": (10.7672, 79.8449, "Nagapattinam", "Tamil Nadu"),
    "mayiladuthurai": (11.1035, 79.6550, "Mayiladuthurai", "Tamil Nadu"),
    "kallakurichi": (11.7384, 78.9639, "Kallakurichi", "Tamil Nadu"),
    "viluppuram": (11.9401, 79.4861, "Viluppuram", "Tamil Nadu"),
    "chengalpattu": (12.6841, 79.9836, "Chengalpattu", "Tamil Nadu"),
    "tiruvallur": (13.1432, 79.9079, "Tiruvallur", "Tamil Nadu"),

    # --- KERALA (South) ---
    "kerala": (10.8505, 76.2711, "Kerala", "Kerala"),
    "thiruvananthapuram": (8.5241, 76.9366, "Thiruvananthapuram", "Kerala"),
    "trivandrum": (8.5241, 76.9366, "Thiruvananthapuram", "Kerala"),
    "kochi": (9.9312, 76.2673, "Ernakulam", "Kerala"),
    "cochin": (9.9312, 76.2673, "Ernakulam", "Kerala"),
    "ernakulam": (9.9816, 76.2999, "Ernakulam", "Kerala"),
    "kozhikode": (11.2588, 75.7804, "Kozhikode", "Kerala"),
    "calicut": (11.2588, 75.7804, "Kozhikode", "Kerala"),
    "thrissur": (10.5276, 76.2144, "Thrissur", "Kerala"),
    "trichur": (10.5276, 76.2144, "Thrissur", "Kerala"),
    "kollam": (8.8932, 76.6141, "Kollam", "Kerala"),
    "quilon": (8.8932, 76.6141, "Kollam", "Kerala"),
    "alappuzha": (9.4981, 76.3388, "Alappuzha", "Kerala"),
    "alleppey": (9.4981, 76.3388, "Alappuzha", "Kerala"),
    "palakkad": (10.7867, 76.6548, "Palakkad", "Kerala"),
    "palghat": (10.7867, 76.6548, "Palakkad", "Kerala"),
    "malappuram": (11.0510, 76.0711, "Malappuram", "Kerala"),
    "kannur": (11.8745, 75.3704, "Kannur", "Kerala"),
    "cannanore": (11.8745, 75.3704, "Kannur", "Kerala"),
    "kottayam": (9.5916, 76.5222, "Kottayam", "Kerala"),
    "kasaragod": (12.5102, 74.9852, "Kasaragod", "Kerala"),
    "wayanad": (11.6854, 76.1320, "Wayanad", "Kerala"),
    "kalpetta": (11.6103, 76.0827, "Wayanad", "Kerala"),
    "idukki": (9.8494, 76.9807, "Idukki", "Kerala"),
    "painavu": (9.8494, 76.9807, "Idukki", "Kerala"),
    "pathanamthitta": (9.2648, 76.7870, "Pathanamthitta", "Kerala"),

    # --- ANDHRA PRADESH (South) ---
    "andhra pradesh": (15.9129, 79.7400, "Andhra Pradesh", "Andhra Pradesh"),
    "amaravati": (16.5417, 80.5158, "Guntur", "Andhra Pradesh"),
    "visakhapatnam": (17.6868, 83.2185, "Visakhapatnam", "Andhra Pradesh"),
    "vizag": (17.6868, 83.2185, "Visakhapatnam", "Andhra Pradesh"),
    "vijayawada": (16.5062, 80.6480, "NTR", "Andhra Pradesh"),
    "guntur": (16.3067, 80.4365, "Guntur", "Andhra Pradesh"),
    "nellore": (14.4426, 79.9865, "SPSR Nellore", "Andhra Pradesh"),
    "kurnool": (15.8281, 78.0373, "Kurnool", "Andhra Pradesh"),
    "kakinada": (16.9891, 82.2475, "Kakinada", "Andhra Pradesh"),
    "rajamahendravaram": (17.0005, 81.8040, "East Godavari", "Andhra Pradesh"),
    "rajahmundry": (17.0005, 81.8040, "East Godavari", "Andhra Pradesh"),
    "kadapa": (14.4673, 78.8242, "YSR Kadapa", "Andhra Pradesh"),
    "cuddapah": (14.4673, 78.8242, "YSR Kadapa", "Andhra Pradesh"),
    "tirupati": (13.6288, 79.4192, "Tirupati", "Andhra Pradesh"),
    "anantapur": (14.6819, 77.6006, "Anantapur", "Andhra Pradesh"),
    "anantapuramu": (14.6819, 77.6006, "Anantapur", "Andhra Pradesh"),
    "vizianagaram": (18.1067, 83.3956, "Vizianagaram", "Andhra Pradesh"),
    "eluru": (16.7107, 81.0952, "Eluru", "Andhra Pradesh"),
    "ongole": (15.5057, 80.0499, "Prakasam", "Andhra Pradesh"),
    "nandyal": (15.4786, 78.4836, "Nandyal", "Andhra Pradesh"),
    "machilipatnam": (16.1875, 81.1389, "Krishna", "Andhra Pradesh"),
    "adoni": (15.6322, 77.2728, "Kurnool", "Andhra Pradesh"),
    "tenali": (16.2437, 80.6400, "Guntur", "Andhra Pradesh"),
    "proddatur": (14.7526, 78.5524, "YSR Kadapa", "Andhra Pradesh"),
    "chittoor": (13.2172, 79.1003, "Chittoor", "Andhra Pradesh"),
    "hindupur": (13.8289, 77.4910, "Sri Sathya Sai", "Andhra Pradesh"),
    "bhimavaram": (16.5449, 81.5212, "West Godavari", "Andhra Pradesh"),
    "srikakulam": (18.2949, 83.8938, "Srikakulam", "Andhra Pradesh"),

    # --- TELANGANA (South) ---
    "telangana": (18.1124, 79.0193, "Telangana", "Telangana"),
    "hyderabad": (17.3850, 78.4867, "Hyderabad", "Telangana"),
    "secunderabad": (17.4399, 78.4983, "Hyderabad", "Telangana"),
    "warangal": (17.9689, 79.5941, "Warangal", "Telangana"),
    "hanamkonda": (18.0076, 79.5583, "Hanamkonda", "Telangana"),
    "nizamabad": (18.6725, 78.0941, "Nizamabad", "Telangana"),
    "karimnagar": (18.4386, 79.1288, "Karimnagar", "Telangana"),
    "khammam": (17.2473, 80.1514, "Khammam", "Telangana"),
    "ramagundam": (18.7557, 79.5161, "Peddapalli", "Telangana"),
    "mahbubnagar": (16.7488, 77.9844, "Mahbubnagar", "Telangana"),
    "nalgonda": (17.0577, 79.2684, "Nalgonda", "Telangana"),
    "adilabad": (19.6641, 78.5320, "Adilabad", "Telangana"),
    "suryapet": (17.1439, 79.6239, "Suryapet", "Telangana"),
    "siddipet": (18.1018, 78.8520, "Siddipet", "Telangana"),
    "miryalaguda": (16.8724, 79.5630, "Nalgonda", "Telangana"),
    "jagtial": (18.7944, 78.9125, "Jagtial", "Telangana"),
    "nirmal": (19.0964, 78.3428, "Nirmal", "Telangana"),
    "mancherial": (18.8679, 79.4639, "Mancherial", "Telangana"),
    "kamareddy": (18.3222, 78.3375, "Kamareddy", "Telangana"),
    "sangareddy": (17.6190, 78.0811, "Sangareddy", "Telangana"),
    "medak": (18.0485, 78.2618, "Medak", "Telangana"),
    "vikarabad": (17.3366, 77.9048, "Vikarabad", "Telangana"),

    # --- WEST BENGAL (East) ---
    "west bengal": (22.9868, 87.8550, "West Bengal", "West Bengal"),
    "kolkata": (22.5726, 88.3639, "Kolkata", "West Bengal"),
    "calcutta": (22.5726, 88.3639, "Kolkata", "West Bengal"),
    "howrah": (22.5958, 88.2636, "Howrah", "West Bengal"),
    "asansol": (23.6739, 86.9524, "Paschim Bardhaman", "West Bengal"),
    "siliguri": (26.7271, 88.3953, "Darjeeling", "West Bengal"),
    "durgapur": (23.5204, 87.3119, "Paschim Bardhaman", "West Bengal"),
    "bardhaman": (23.2324, 87.8615, "Purba Bardhaman", "West Bengal"),
    "burdwan": (23.2324, 87.8615, "Purba Bardhaman", "West Bengal"),
    "malda": (25.0108, 88.1411, "Malda", "West Bengal"),
    "english bazar": (25.0108, 88.1411, "Malda", "West Bengal"),
    "kharagpur": (22.3460, 87.2320, "Paschim Medinipur", "West Bengal"),
    "darjeeling": (27.0410, 88.2663, "Darjeeling", "West Bengal"),
    "kalimpong": (27.0594, 88.4695, "Kalimpong", "West Bengal"),
    "jalpaiguri": (26.5415, 88.7196, "Jalpaiguri", "West Bengal"),
    "alipurduar": (26.4919, 89.5271, "Alipurduar", "West Bengal"),
    "cooch behar": (26.3239, 89.4510, "Cooch Behar", "West Bengal"),
    "murshidabad": (24.1759, 88.2802, "Murshidabad", "West Bengal"),
    "baharampur": (24.0988, 88.2686, "Murshidabad", "West Bengal"),
    "nadia": (23.4710, 88.5565, "Nadia", "West Bengal"),
    "krishnanagar": (23.4042, 88.5034, "Nadia", "West Bengal"),
    "hooghly": (22.9030, 88.3894, "Hooghly", "West Bengal"),
    "chinsurah": (22.9030, 88.3894, "Hooghly", "West Bengal"),
    "north 24 parganas": (22.7210, 88.4815, "North 24 Parganas", "West Bengal"),
    "barasat": (22.7210, 88.4815, "North 24 Parganas", "West Bengal"),
    "south 24 parganas": (22.1837, 88.5320, "South 24 Parganas", "West Bengal"),
    "alipore": (22.5312, 88.3267, "South 24 Parganas", "West Bengal"),
    "purulia": (23.3321, 86.3652, "Purulia", "West Bengal"),
    "bankura": (23.2324, 87.0715, "Bankura", "West Bengal"),
    "birbhum": (23.8402, 87.6186, "Birbhum", "West Bengal"),
    "suri": (23.8402, 87.6186, "Birbhum", "West Bengal"),

    # --- BIHAR (East) ---
    "bihar": (25.0961, 85.3131, "Bihar", "Bihar"),
    "patna": (25.5941, 85.1376, "Patna", "Bihar"),
    "gaya": (24.7914, 85.0002, "Gaya", "Bihar"),
    "bhagalpur": (25.2425, 86.9842, "Bhagalpur", "Bihar"),
    "muzaffarpur": (26.1209, 85.3647, "Muzaffarpur", "Bihar"),
    "purnia": (25.7771, 87.4753, "Purnia", "Bihar"),
    "purnea": (25.7771, 87.4753, "Purnia", "Bihar"),
    "darbhanga": (26.1542, 85.8918, "Darbhanga", "Bihar"),
    "bihar sharif": (25.1982, 85.5149, "Nalanda", "Bihar"),
    "nalanda": (25.1982, 85.5149, "Nalanda", "Bihar"),
    "arrah": (25.5560, 84.6603, "Bhojpur", "Bihar"),
    "bhojpur": (25.5560, 84.6603, "Bhojpur", "Bihar"),
    "begusarai": (25.4182, 86.1272, "Begusarai", "Bihar"),
    "katihar": (25.5394, 87.5707, "Katihar", "Bihar"),
    "munger": (25.3757, 86.4744, "Munger", "Bihar"),
    "chhapra": (25.7811, 84.7543, "Saran", "Bihar"),
    "saran": (25.7811, 84.7543, "Saran", "Bihar"),
    "motihari": (26.6469, 84.9089, "East Champaran", "Bihar"),
    "bettiah": (26.8024, 84.5033, "West Champaran", "Bihar"),
    "saharsa": (25.8835, 86.6006, "Saharsa", "Bihar"),
    "sasaram": (24.9522, 84.0315, "Rohtas", "Bihar"),
    "rohtas": (24.9522, 84.0315, "Rohtas", "Bihar"),
    "hajipur": (25.6858, 85.2146, "Vaishali", "Bihar"),
    "vaishali": (25.6858, 85.2146, "Vaishali", "Bihar"),
    "siwan": (26.2196, 84.3567, "Siwan", "Bihar"),
    "gopalganj": (26.4687, 84.4447, "Gopalganj", "Bihar"),
    "madhubani": (26.3546, 86.0715, "Madhubani", "Bihar"),
    "samastipur": (25.8628, 85.7811, "Samastipur", "Bihar"),
    "sitamarhi": (26.5979, 85.4891, "Sitamarhi", "Bihar"),
    "kishanganj": (26.0739, 87.9392, "Kishanganj", "Bihar"),

    # --- ODISHA (East) ---
    "odisha": (20.9517, 85.0985, "Odisha", "Odisha"),
    "orissa": (20.9517, 85.0985, "Odisha", "Odisha"),
    "bhubaneswar": (20.2961, 85.8245, "Khordha", "Odisha"),
    "cuttack": (20.4625, 85.8828, "Cuttack", "Odisha"),
    "rourkela": (22.2604, 84.8536, "Sundargarh", "Odisha"),
    "berhampur": (19.3150, 84.7941, "Ganjam", "Odisha"),
    "brahmapur": (19.3150, 84.7941, "Ganjam", "Odisha"),
    "sambalpur": (21.4669, 83.9812, "Sambalpur", "Odisha"),
    "puri": (19.8135, 85.8312, "Puri", "Odisha"),
    "balasore": (21.4934, 86.9135, "Balasore", "Odisha"),
    "bhadrak": (21.0544, 86.4957, "Bhadrak", "Odisha"),
    "baripada": (21.9322, 86.7360, "Mayurbhanj", "Odisha"),
    "mayurbhanj": (21.9322, 86.7360, "Mayurbhanj", "Odisha"),
    "jharsuguda": (21.8554, 84.0062, "Jharsuguda", "Odisha"),
    "balangir": (20.7107, 83.4839, "Balangir", "Odisha"),
    "kalahandi": (19.9075, 83.1643, "Kalahandi", "Odisha"),
    "bhawanipatna": (19.9075, 83.1643, "Kalahandi", "Odisha"),
    "koraput": (18.8135, 82.7123, "Koraput", "Odisha"),
    "angul": (20.8444, 85.1015, "Angul", "Odisha"),
    "dhenkanal": (20.6593, 85.5960, "Dhenkanal", "Odisha"),
    "kendujhar": (21.6289, 85.5818, "Kendujhar", "Odisha"),
    "keonjhar": (21.6289, 85.5818, "Kendujhar", "Odisha"),

    # --- JHARKHAND (East) ---
    "jharkhand": (23.6102, 85.2799, "Jharkhand", "Jharkhand"),
    "ranchi": (23.3441, 85.3096, "Ranchi", "Jharkhand"),
    "jamshedpur": (22.8046, 86.2029, "East Singhbhum", "Jharkhand"),
    "tatanagar": (22.8046, 86.2029, "East Singhbhum", "Jharkhand"),
    "dhanbad": (23.7957, 86.4304, "Dhanbad", "Jharkhand"),
    "bokaro": (23.6693, 86.1511, "Bokaro", "Jharkhand"),
    "deoghar": (24.4826, 86.7001, "Deoghar", "Jharkhand"),
    "hazaribagh": (23.9925, 85.3637, "Hazaribagh", "Jharkhand"),
    "giridih": (24.1903, 86.3039, "Giridih", "Jharkhand"),
    "ramgarh": (23.6332, 85.5149, "Ramgarh", "Jharkhand"),
    "dumka": (24.2677, 87.2497, "Dumka", "Jharkhand"),
    "chaibasa": (22.5519, 85.8078, "West Singhbhum", "Jharkhand"),
    "palamu": (24.0410, 84.0700, "Palamu", "Jharkhand"),
    "medininagar": (24.0410, 84.0700, "Palamu", "Jharkhand"),
    "daltonganj": (24.0410, 84.0700, "Palamu", "Jharkhand"),

    # --- ASSAM & NORTHEAST ---
    "assam": (26.2006, 92.9376, "Assam", "Assam"),
    "guwahati": (26.1445, 91.7362, "Kamrup Metropolitan", "Assam"),
    "dispur": (26.1408, 91.7907, "Kamrup Metropolitan", "Assam"),
    "silchar": (24.8333, 92.7789, "Cachar", "Assam"),
    "dibrugarh": (27.4728, 94.9120, "Dibrugarh", "Assam"),
    "jorhat": (26.7509, 94.2037, "Jorhat", "Assam"),
    "nagaon": (26.3464, 92.6840, "Nagaon", "Assam"),
    "tinsukia": (27.5015, 95.3622, "Tinsukia", "Assam"),
    "tezpur": (26.6338, 92.7926, "Sonitpur", "Assam"),
    "bongaigaon": (26.5028, 90.5530, "Bongaigaon", "Assam"),
    "sikkim": (27.5330, 88.5122, "Sikkim", "Sikkim"),
    "gangtok": (27.3389, 88.6065, "East Sikkim", "Sikkim"),
    "meghalaya": (25.4670, 91.3662, "Meghalaya", "Meghalaya"),
    "shillong": (25.5788, 91.8933, "East Khasi Hills", "Meghalaya"),
    "tura": (25.5144, 90.2031, "West Garo Hills", "Meghalaya"),
    "tripura": (23.9408, 91.9882, "Tripura", "Tripura"),
    "agartala": (23.8315, 91.2868, "West Tripura", "Tripura"),
    "mizoram": (23.1645, 92.9376, "Mizoram", "Mizoram"),
    "aizawl": (23.7271, 92.7176, "Aizawl", "Mizoram"),
    "manipur": (24.6637, 93.9063, "Manipur", "Manipur"),
    "imphal": (24.8170, 93.9368, "Imphal West", "Manipur"),
    "nagaland": (26.1584, 94.5624, "Nagaland", "Nagaland"),
    "kohima": (25.6751, 94.1086, "Kohima", "Nagaland"),
    "dimapur": (25.9094, 93.7266, "Dimapur", "Nagaland"),
    "arunachal pradesh": (28.2180, 94.7278, "Arunachal Pradesh", "Arunachal Pradesh"),
    "itanagar": (27.0844, 93.6053, "Papum Pare", "Arunachal Pradesh"),
    "tawang": (27.5862, 91.8659, "Tawang", "Arunachal Pradesh"),

    # --- JAMMU & KASHMIR & LADAKH (North) ---
    "jammu and kashmir": (33.7782, 76.5762, "Jammu and Kashmir", "Jammu and Kashmir"),
    "jammu & kashmir": (33.7782, 76.5762, "Jammu and Kashmir", "Jammu and Kashmir"),
    "kashmir": (34.0837, 74.7973, "Srinagar", "Jammu and Kashmir"),
    "srinagar": (34.0837, 74.7973, "Srinagar", "Jammu and Kashmir"),
    "jammu": (32.7266, 74.8570, "Jammu", "Jammu and Kashmir"),
    "anantnag": (33.7311, 75.1487, "Anantnag", "Jammu and Kashmir"),
    "baramulla": (34.2093, 74.3436, "Baramulla", "Jammu and Kashmir"),
    "udhampur": (32.9254, 75.1416, "Udhampur", "Jammu and Kashmir"),
    "kathua": (32.3865, 75.5273, "Kathua", "Jammu and Kashmir"),
    "ladakh": (34.1526, 77.5771, "Leh", "Ladakh"),
    "leh": (34.1526, 77.5771, "Leh", "Ladakh"),
    "kargil": (34.5539, 76.1349, "Kargil", "Ladakh"),

    # --- HIMACHAL PRADESH (North) ---
    "himachal pradesh": (31.1048, 77.1734, "Himachal Pradesh", "Himachal Pradesh"),
    "himachal": (31.1048, 77.1734, "Himachal Pradesh", "Himachal Pradesh"),
    "shimla": (31.1048, 77.1734, "Shimla", "Himachal Pradesh"),
    "mandi": (31.7087, 76.9320, "Mandi", "Himachal Pradesh"),
    "solan": (30.9045, 77.0967, "Solan", "Himachal Pradesh"),
    "dharamshala": (32.2190, 76.3234, "Kangra", "Himachal Pradesh"),
    "kangra": (32.0998, 76.2691, "Kangra", "Himachal Pradesh"),
    "kullu": (31.9579, 77.1095, "Kullu", "Himachal Pradesh"),
    "manali": (32.2432, 77.1892, "Kullu", "Himachal Pradesh"),
    "bilaspur hp": (31.3325, 76.7626, "Bilaspur", "Himachal Pradesh"),
    "hamirpur hp": (31.6862, 76.5213, "Hamirpur", "Himachal Pradesh"),
    "una": (31.4685, 76.2708, "Una", "Himachal Pradesh"),
    "chamba": (32.5534, 76.1258, "Chamba", "Himachal Pradesh"),
    "sirmaur": (30.5599, 77.2960, "Sirmaur", "Himachal Pradesh"),
    "nahan": (30.5599, 77.2960, "Sirmaur", "Himachal Pradesh"),

    # --- UTTARAKHAND (North) ---
    "uttarakhand": (30.0668, 79.0193, "Uttarakhand", "Uttarakhand"),
    "uttaranchal": (30.0668, 79.0193, "Uttarakhand", "Uttarakhand"),
    "dehradun": (30.3165, 78.0322, "Dehradun", "Uttarakhand"),
    "haridwar": (29.9457, 78.1642, "Haridwar", "Uttarakhand"),
    "rishikesh": (30.0869, 78.2676, "Dehradun", "Uttarakhand"),
    "roorkee": (29.8543, 77.8880, "Haridwar", "Uttarakhand"),
    "haldwani": (29.2183, 79.5130, "Nainital", "Uttarakhand"),
    "nainital": (29.3919, 79.4542, "Nainital", "Uttarakhand"),
    "almora": (29.5971, 79.6591, "Almora", "Uttarakhand"),
    "pithoragarh": (29.5829, 80.2182, "Pithoragarh", "Uttarakhand"),
    "chamoli": (30.4225, 79.3282, "Chamoli", "Uttarakhand"),
    "gopeshwar": (30.4225, 79.3282, "Chamoli", "Uttarakhand"),
    "pauri": (30.1472, 78.7808, "Pauri Garhwal", "Uttarakhand"),
    "tehri": (30.3835, 78.4808, "Tehri Garhwal", "Uttarakhand"),
    "rudraprayag": (30.2844, 78.9811, "Rudraprayag", "Uttarakhand"),
    "uttarkashi": (30.7268, 78.4354, "Uttarkashi", "Uttarakhand"),
    "udham singh nagar": (28.9800, 79.5000, "Udham Singh Nagar", "Uttarakhand"),
    "rudrapur": (28.9800, 79.5000, "Udham Singh Nagar", "Uttarakhand"),
    "kashipur": (29.2104, 78.9619, "Udham Singh Nagar", "Uttarakhand"),

    # --- UNION TERRITORIES (Islands & Others) ---
    "puducherry": (11.9416, 79.8083, "Puducherry", "Puducherry"),
    "pondicherry": (11.9416, 79.8083, "Puducherry", "Puducherry"),
    "karaikal": (10.9254, 79.8380, "Karaikal", "Puducherry"),
    "mahe": (11.7002, 75.5340, "Mahe", "Puducherry"),
    "yanam": (16.7339, 82.2175, "Yanam", "Puducherry"),
    "andaman and nicobar": (11.6234, 92.7265, "South Andaman", "Andaman and Nicobar Islands"),
    "andaman": (11.6234, 92.7265, "South Andaman", "Andaman and Nicobar Islands"),
    "port blair": (11.6234, 92.7265, "South Andaman", "Andaman and Nicobar Islands"),
    "lakshadweep": (10.5667, 72.6417, "Lakshadweep", "Lakshadweep"),
    "kavaratti": (10.5667, 72.6417, "Lakshadweep", "Lakshadweep"),
    "daman": (20.3974, 72.8328, "Daman", "Dadra and Nagar Haveli and Daman and Diu"),
    "diu": (20.7144, 70.9874, "Diu", "Dadra and Nagar Haveli and Daman and Diu"),
    "silvassa": (20.2763, 73.0083, "Dadra and Nagar Haveli", "Dadra and Nagar Haveli and Daman and Diu"),
    "dadra and nagar haveli": (20.2763, 73.0083, "Dadra and Nagar Haveli", "Dadra and Nagar Haveli and Daman and Diu"),
}


# ==============================================================================
# 2. KNOWN PIN CODES (6 DIGIT PREFIXES AND MAJOR POSTAL CIRCLES)
# ==============================================================================
KNOWN_PIN_PREFIXES: Dict[str, Tuple[float, float, str, str]] = {
    # 11: Delhi
    "110": (28.6139, 77.2090, "Delhi", "Delhi"),
    # 12-13: Haryana
    "121": (28.4089, 77.3178, "Faridabad", "Haryana"),
    "122": (28.4595, 77.0266, "Gurugram", "Haryana"),
    "124": (28.8955, 76.6066, "Rohtak", "Haryana"),
    "125": (29.1492, 75.7217, "Hisar", "Haryana"),
    "132": (29.6857, 76.9905, "Karnal", "Haryana"),
    "133": (30.3782, 76.7767, "Ambala", "Haryana"),
    "134": (30.6942, 76.8606, "Panchkula", "Haryana"),
    # 14-16: Punjab & Chandigarh
    "140": (30.7046, 76.7179, "SAS Nagar", "Punjab"),
    "141": (30.9010, 75.8573, "Ludhiana", "Punjab"),
    "143": (31.6340, 74.8723, "Amritsar", "Punjab"),
    "144": (31.3260, 75.5762, "Jalandhar", "Punjab"),
    "147": (30.3398, 76.3869, "Patiala", "Punjab"),
    "148": (30.2450, 75.8420, "Sangrur", "Punjab"),
    "151": (30.2110, 74.9455, "Bathinda", "Punjab"),
    "160": (30.7333, 76.7794, "Chandigarh", "Chandigarh"),
    # 17: Himachal Pradesh
    "171": (31.1048, 77.1734, "Shimla", "Himachal Pradesh"),
    "175": (31.7087, 76.9320, "Mandi", "Himachal Pradesh"),
    "176": (32.2190, 76.3234, "Kangra", "Himachal Pradesh"),
    # 18-19: Jammu & Kashmir, Ladakh
    "180": (32.7266, 74.8570, "Jammu", "Jammu and Kashmir"),
    "190": (34.0837, 74.7973, "Srinagar", "Jammu and Kashmir"),
    "194": (34.1526, 77.5771, "Leh", "Ladakh"),
    # 20-28: Uttar Pradesh & Uttarakhand
    "201": (28.6692, 77.4538, "Ghaziabad", "Uttar Pradesh"),
    "202": (27.8974, 78.0880, "Aligarh", "Uttar Pradesh"),
    "208": (26.4499, 80.3319, "Kanpur Nagar", "Uttar Pradesh"),
    "211": (25.4358, 81.8463, "Prayagraj", "Uttar Pradesh"),
    "221": (25.3176, 82.9739, "Varanasi", "Uttar Pradesh"),
    "224": (26.7922, 82.1998, "Ayodhya", "Uttar Pradesh"),
    "226": (26.8467, 80.9462, "Lucknow", "Uttar Pradesh"),
    "243": (28.3670, 79.4304, "Bareilly", "Uttar Pradesh"),
    "244": (28.8386, 78.7733, "Moradabad", "Uttar Pradesh"),
    "248": (30.3165, 78.0322, "Dehradun", "Uttarakhand"),
    "249": (29.9457, 78.1642, "Haridwar", "Uttarakhand"),
    "250": (28.9845, 77.7064, "Meerut", "Uttar Pradesh"),
    "273": (26.7606, 83.3732, "Gorakhpur", "Uttar Pradesh"),
    "281": (27.4924, 77.6737, "Mathura", "Uttar Pradesh"),
    "282": (27.1767, 78.0081, "Agra", "Uttar Pradesh"),
    "284": (25.4484, 78.5685, "Jhansi", "Uttar Pradesh"),
    # 30-34: Rajasthan
    "302": (26.9124, 75.7873, "Jaipur", "Rajasthan"),
    "305": (26.4499, 74.6399, "Ajmer", "Rajasthan"),
    "313": (24.5854, 73.7125, "Udaipur", "Rajasthan"),
    "324": (25.2138, 75.8648, "Kota", "Rajasthan"),
    "334": (28.0229, 73.3119, "Bikaner", "Rajasthan"),
    "332": (27.6094, 75.1398, "Sikar", "Rajasthan"),
    "342": (26.2389, 73.0243, "Jodhpur", "Rajasthan"),
    "345": (26.9157, 70.9083, "Jaisalmer", "Rajasthan"),
    # 36-39: Gujarat
    "380": (23.0225, 72.5714, "Ahmedabad", "Gujarat"),
    "382": (23.2156, 72.6369, "Gandhinagar", "Gujarat"),
    "384": (23.5880, 72.3693, "Mehsana", "Gujarat"),
    "388": (22.5645, 72.9289, "Anand", "Gujarat"),
    "390": (22.3072, 73.1812, "Vadodara", "Gujarat"),
    "395": (21.1702, 72.8311, "Surat", "Gujarat"),
    "360": (22.3039, 70.8022, "Rajkot", "Gujarat"),
    "361": (22.4707, 70.0577, "Jamnagar", "Gujarat"),
    "362": (21.5222, 70.4579, "Junagadh", "Gujarat"),
    "364": (21.7645, 72.1519, "Bhavnagar", "Gujarat"),
    "370": (23.2420, 69.6669, "Kutch", "Gujarat"),
    # 40-44: Maharashtra & Goa
    "400": (19.0760, 72.8777, "Mumbai", "Maharashtra"),
    "401": (19.2183, 72.9781, "Thane", "Maharashtra"),
    "403": (15.4909, 73.8278, "North Goa", "Goa"),
    "411": (18.5204, 73.8567, "Pune", "Maharashtra"),
    "413": (18.1517, 74.5772, "Pune", "Maharashtra"),
    "414": (19.0952, 74.7496, "Ahmednagar", "Maharashtra"),
    "415": (17.6805, 74.0183, "Satara", "Maharashtra"),
    "416": (16.7050, 74.2433, "Kolhapur", "Maharashtra"),
    "422": (19.9975, 73.7898, "Nashik", "Maharashtra"),
    "424": (20.9042, 74.7749, "Dhule", "Maharashtra"),
    "425": (21.0077, 75.5626, "Jalgaon", "Maharashtra"),
    "431": (19.8762, 75.3433, "Chhatrapati Sambhajinagar", "Maharashtra"),
    "440": (21.1458, 79.0882, "Nagpur", "Maharashtra"),
    "444": (20.7002, 77.0082, "Akola", "Maharashtra"),
    # 45-48: Madhya Pradesh & Chhattisgarh
    "452": (22.7196, 75.8577, "Indore", "Madhya Pradesh"),
    "456": (23.1765, 75.7885, "Ujjain", "Madhya Pradesh"),
    "462": (23.2599, 77.4126, "Bhopal", "Madhya Pradesh"),
    "474": (26.2183, 78.1828, "Gwalior", "Madhya Pradesh"),
    "482": (23.1815, 79.9864, "Jabalpur", "Madhya Pradesh"),
    "485": (24.5800, 80.8322, "Satna", "Madhya Pradesh"),
    "490": (21.1904, 81.2849, "Durg", "Chhattisgarh"),
    "492": (21.2514, 81.6296, "Raipur", "Chhattisgarh"),
    "495": (22.0797, 82.1409, "Bilaspur", "Chhattisgarh"),
    # 50-53: Andhra Pradesh & Telangana
    "500": (17.3850, 78.4867, "Hyderabad", "Telangana"),
    "503": (18.6725, 78.0941, "Nizamabad", "Telangana"),
    "505": (18.4386, 79.1288, "Karimnagar", "Telangana"),
    "506": (17.9689, 79.5941, "Warangal", "Telangana"),
    "507": (17.2473, 80.1514, "Khammam", "Telangana"),
    "515": (14.6819, 77.6006, "Anantapur", "Andhra Pradesh"),
    "517": (13.6288, 79.4192, "Tirupati", "Andhra Pradesh"),
    "518": (15.8281, 78.0373, "Kurnool", "Andhra Pradesh"),
    "520": (16.5062, 80.6480, "NTR", "Andhra Pradesh"),
    "522": (16.3067, 80.4365, "Guntur", "Andhra Pradesh"),
    "524": (14.4426, 79.9865, "SPSR Nellore", "Andhra Pradesh"),
    "530": (17.6868, 83.2185, "Visakhapatnam", "Andhra Pradesh"),
    "533": (16.9891, 82.2475, "Kakinada", "Andhra Pradesh"),
    # 56-59: Karnataka
    "560": (12.9716, 77.5946, "Bengaluru Urban", "Karnataka"),
    "562": (13.4325, 77.7275, "Chikkaballapur", "Karnataka"),
    "563": (13.1367, 78.1291, "Kolar", "Karnataka"),
    "570": (12.2958, 76.6394, "Mysuru", "Karnataka"),
    "571": (12.5218, 76.8951, "Mandya", "Karnataka"),
    "573": (13.0033, 76.1004, "Hassan", "Karnataka"),
    "575": (12.9141, 74.8560, "Dakshina Kannada", "Karnataka"),
    "576": (13.3409, 74.7421, "Udupi", "Karnataka"),
    "577": (13.9299, 75.5681, "Shivamogga", "Karnataka"),
    "580": (15.3647, 75.1240, "Dharwad", "Karnataka"),
    "583": (15.1394, 76.9214, "Ballari", "Karnataka"),
    "585": (17.3297, 76.8343, "Kalaburagi", "Karnataka"),
    "586": (16.8302, 75.7100, "Vijayapura", "Karnataka"),
    "590": (15.8497, 74.4977, "Belagavi", "Karnataka"),
    # 60-64: Tamil Nadu & Puducherry
    "600": (13.0827, 80.2707, "Chennai", "Tamil Nadu"),
    "605": (11.9416, 79.8083, "Puducherry", "Puducherry"),
    "620": (10.7905, 78.7047, "Tiruchirappalli", "Tamil Nadu"),
    "625": (9.9252, 78.1198, "Madurai", "Tamil Nadu"),
    "627": (8.7139, 77.7567, "Tirunelveli", "Tamil Nadu"),
    "629": (8.1833, 77.4119, "Kanyakumari", "Tamil Nadu"),
    "632": (12.9165, 79.1325, "Vellore", "Tamil Nadu"),
    "636": (11.6643, 78.1460, "Salem", "Tamil Nadu"),
    "638": (11.3410, 77.7172, "Erode", "Tamil Nadu"),
    "641": (11.0168, 76.9558, "Coimbatore", "Tamil Nadu"),
    "613": (10.7870, 79.1378, "Thanjavur", "Tamil Nadu"),
    # 67-69: Kerala & Lakshadweep
    "682": (9.9312, 76.2673, "Ernakulam", "Kerala"),
    "686": (9.5916, 76.5222, "Kottayam", "Kerala"),
    "688": (9.4981, 76.3388, "Alappuzha", "Kerala"),
    "680": (10.5276, 76.2144, "Thrissur", "Kerala"),
    "678": (10.7867, 76.6548, "Palakkad", "Kerala"),
    "673": (11.2588, 75.7804, "Kozhikode", "Kerala"),
    "670": (11.8745, 75.3704, "Kannur", "Kerala"),
    "691": (8.8932, 76.6141, "Kollam", "Kerala"),
    "695": (8.5241, 76.9366, "Thiruvananthapuram", "Kerala"),
    # 70-74: West Bengal & Sikkim
    "700": (22.5726, 88.3639, "Kolkata", "West Bengal"),
    "711": (22.5958, 88.2636, "Howrah", "West Bengal"),
    "713": (23.5204, 87.3119, "Paschim Bardhaman", "West Bengal"),
    "734": (26.7271, 88.3953, "Darjeeling", "West Bengal"),
    "737": (27.3389, 88.6065, "East Sikkim", "Sikkim"),
    # 75-77: Odisha
    "751": (20.2961, 85.8245, "Khordha", "Odisha"),
    "753": (20.4625, 85.8828, "Cuttack", "Odisha"),
    "760": (19.3150, 84.7941, "Ganjam", "Odisha"),
    "768": (21.4669, 83.9812, "Sambalpur", "Odisha"),
    "769": (22.2604, 84.8536, "Sundargarh", "Odisha"),
    # 78-79: Assam & Northeast
    "781": (26.1445, 91.7362, "Kamrup Metropolitan", "Assam"),
    "786": (27.4728, 94.9120, "Dibrugarh", "Assam"),
    "788": (24.8333, 92.7789, "Cachar", "Assam"),
    "793": (25.5788, 91.8933, "East Khasi Hills", "Meghalaya"),
    "795": (24.8170, 93.9368, "Imphal West", "Manipur"),
    "797": (25.6751, 94.1086, "Kohima", "Nagaland"),
    "799": (23.8315, 91.2868, "West Tripura", "Tripura"),
    # 80-85: Bihar & Jharkhand
    "800": (25.5941, 85.1376, "Patna", "Bihar"),
    "812": (25.2425, 86.9842, "Bhagalpur", "Bihar"),
    "823": (24.7914, 85.0002, "Gaya", "Bihar"),
    "826": (23.7957, 86.4304, "Dhanbad", "Jharkhand"),
    "827": (23.6693, 86.1511, "Bokaro", "Jharkhand"),
    "831": (22.8046, 86.2029, "East Singhbhum", "Jharkhand"),
    "834": (23.3441, 85.3096, "Ranchi", "Jharkhand"),
    "842": (26.1209, 85.3647, "Muzaffarpur", "Bihar"),
    "846": (26.1542, 85.8918, "Darbhanga", "Bihar"),
    "854": (25.7771, 87.4753, "Purnia", "Bihar"),
}


# ==============================================================================
# 3. INTERNATIONAL LOCATIONS BLOCKLIST (OUTSIDE INDIA)
# ==============================================================================
INTERNATIONAL_LOCATIONS: Set[str] = {
    "london", "uk", "united kingdom", "england", "britain",
    "new york", "ny", "nyc", "usa", "united states", "america", "california",
    "los angeles", "chicago", "san francisco", "seattle", "washington", "boston",
    "paris", "france", "berlin", "germany", "frankfurt", "munich",
    "tokyo", "japan", "osaka", "kyoto",
    "beijing", "china", "shanghai", "shenzhen", "guangzhou",
    "dubai", "uae", "abu dhabi", "sharjah", "doha", "qatar", "riyadh", "saudi arabia",
    "singapore", "sydney", "melbourne", "australia", "brisbane", "perth",
    "auckland", "new zealand", "wellington",
    "toronto", "canada", "vancouver", "montreal", "ottawa",
    "moscow", "russia", "saint petersburg",
    "rome", "italy", "milan", "madrid", "spain", "barcelona",
    "bangkok", "thailand", "kuala lumpur", "malaysia",
    "jakarta", "indonesia", "manila", "philippines", "hanoi", "vietnam",
    "dhaka", "bangladesh", "karachi", "lahore", "pakistan", "islamabad",
    "colombo", "sri lanka", "kathmandu", "nepal", "thimphu", "bhutan",
    "yangon", "myanmar", "burma", "cairo", "egypt", "johannesburg", "south africa",
    "nairobi", "kenya", "buenos aires", "argentina", "sao paulo", "brazil", "rio"
}


# ==============================================================================
# 4. MULTILINGUAL LOCATION DICTIONARY MAPPING ACROSS 13 INDIAN SCRIPTS
# ==============================================================================
MULTILINGUAL_PLACE_MAP: Dict[str, str] = {
    # Hindi (hi) / Marathi (mr)
    "नासिक": "nashik", "नाशिक": "nashik", "पुणे": "pune", "मुंबई": "mumbai",
    "बारामती": "baramati", "नागपुर": "nagpur", "नागपूर": "nagpur",
    "कोलार": "kolar", "संगरूर": "sangrur", "संगरुर": "sangrur",
    "शिवमोग्गा": "shivamogga", "शिमोगा": "shivamogga", "बेंगलुरु": "bengaluru",
    "बैंगलोर": "bengaluru", "तंजावुर": "thanjavur", "तंजौर": "thanjavur",
    "जयपुर": "jaipur", "जोधपुर": "jodhpur", "उदयपुर": "udaipur",
    "अहमदाबाद": "ahmedabad", "सूरत": "surat", "राजकोट": "rajkot",
    "भोपाल": "bhopal", "इंदौर": "indore", "जबलपुर": "jabalpur", "ग्वालियर": "gwalior",
    "रायपुर": "raipur", "बिलासपुर": "bilaspur", "दुर्ग": "durg",
    "कोलकाता": "kolkata", "कलकत्ता": "kolkata", "भुवनेश्वर": "bhubaneswar",
    "कटक": "cuttack", "राउरकेला": "rourkela", "पटना": "patna", "गया": "gaya",
    "भागलपुर": "bhagalpur", "मुजफ्फरपुर": "muzaffarpur", "रांची": "ranchi",
    "जमशेदपुर": "jamshedpur", "धनबाद": "dhanbad", "लखनऊ": "lucknow",
    "कानपुर": "kanpur", "वाराणसी": "varanasi", "काशी": "varanasi", "बनारस": "varanasi",
    "प्रयागराज": "prayagraj", "इलाहाबाद": "prayagraj", "आगरा": "agra",
    "मेरठ": "meerut", "बरेली": "bareilly", "अलीगढ़": "aligarh", "गोरखपुर": "gorakhpur",
    "झांसी": "jhansi", "अयोध्या": "ayodhya", "अमृतसर": "amritsar", "लुधियाना": "ludhiana",
    "पटियाला": "patiala", "जालंधर": "jalandhar", "बठिंडा": "bathinda",
    "चंडीगढ़": "chandigarh", "शिमला": "shimla", "देहरादून": "dehradun",
    "हरिद्वार": "haridwar", "श्रीनगर": "srinagar", "जम्मू": "jammu", "लेह": "leh",
    "लद्दाख": "leh", "गुवाहाटी": "guwahati", "शिलॉन्ग": "shillong",
    "हैदराबाद": "hyderabad", "वारंगल": "warangal", "विशाखापट्टनम": "visakhapatnam",
    "विजयवाड़ा": "vijayawada", "गुंटूर": "guntur", "कुरनूल": "kurnool",
    "चेन्नई": "chennai", "मद्रास": "chennai", "कोयंबटूर": "coimbatore",
    "मदुरै": "madurai", "तिरुचिरापल्ली": "tiruchirappalli", "सलेम": "salem",
    "कोच्चि": "kochi", "तिरुवनंतपुरम": "thiruvananthapuram", "कोझिकोड": "kozhikode",
    "त्रिशूर": "thrissur", "मैसूर": "mysuru", "हुबली": "hubballi", "बेलगाम": "belagavi",
    "चिकबल्लापुर": "chikkaballapur", "चिकबल्लापूर": "chikkaballapur", "मांड्या": "mandya", "हासन": "hassan",
    "दावणगेरे": "davanagere", "गुलबर्गा": "kalaburagi", "कलबुर्गी": "kalaburagi", "मंगलौर": "mangaluru",

    # Kannada (kn)
    "ಶಿವಮೊಗ್ಗ": "shivamogga", "ಶಿವಮೊಗ್ಗದಲ್ಲಿ": "shivamogga", "ಶಿವಮೊಗ್ಗದ": "shivamogga",
    "ಕೋಲಾರ": "kolar", "ಕೋಲಾರದಲ್ಲಿ": "kolar", "ಕೋಲಾರದ": "kolar",
    "ಬೆಂಗಳೂರು": "bengaluru", "ಬೆಂಗಳೂರಿನಲ್ಲಿ": "bengaluru", "ಬೆಂಗಳೂರಿನ": "bengaluru",
    "ಮೈಸೂರು": "mysuru", "ಮೈಸೂರಿನಲ್ಲಿ": "mysuru", "ಮೈಸೂರಿನ": "mysuru",
    "ಹುಬ್ಬಳ್ಳಿ": "hubballi", "ಹುಬ್ಬಳ್ಳಿಯಲ್ಲಿ": "hubballi", "ಧಾರವಾಡ": "dharwad",
    "ಬೆಳಗಾವಿ": "belagavi", "ಬೆಳಗಾವಿಯಲ್ಲಿ": "belagavi", "ಕಲಬುರಗಿ": "kalaburagi",
    "ಮಂಗಳೂರು": "mangaluru", "ದಾವಣಗೆರೆ": "davanagere", "ಬಳ್ಳಾರಿ": "ballari",
    "ವಿಜಯಪುರ": "vijayapura", "ತುಮಕೂರು": "tumakuru", "ರಾಯಚೂರು": "raichur",
    "ಬೀದರ್": "bidar", "ಉಡುಪಿ": "udupi", "ಚಿಕ್ಕಬಳ್ಳಾಪುರ": "chikkaballapur",
    "ಹಾಸನ": "hassan", "ಮಂಡ್ಯ": "mandya", "ಚಾಮರಾಜನಗರ": "chamarajanagar",
    "ಚಿಕ್ಕಮಗಳೂರು": "chikkamagaluru", "ರಾಮನಗರ": "ramanagara", "ಬಾಗಲಕೋಟೆ": "bagalkote",
    "ಹಾವೇರಿ": "haveri", "ಕೊಪ್ಪಳ": "koppal", "ಯಾದಗಿರಿ": "yadgir", "ಕೊಡಗು": "kodagu",
    "ಮಡಿಕೇರಿ": "madikeri", "ಸಂಗ್ರೂರು": "sangrur", "ತಂಜಾವೂರು": "thanjavur",
    "ನಾಸಿಕ್": "nashik", "ಪುಣೆ": "pune", "ಮುಂಬೈ": "mumbai", "ಬಾರಾಮತಿ": "baramati",
    "ಹೈದರಾಬಾದ್": "hyderabad", "ಚೆನ್ನೈ": "chennai", "ಕೊಯಮತ್ತೂರು": "coimbatore",
    "ಕೊಚ್ಚಿ": "kochi", "ತಿರುವನಂತಪುರಂ": "thiruvananthapuram", "ಜೈಪುರ": "jaipur",

    # Tamil (ta)
    "சென்னை": "chennai", "கோயம்புத்தூர்": "coimbatore", "கோவை": "coimbatore",
    "மதுரை": "madurai", "திருச்சிராப்பள்ளி": "tiruchirappalli", "திருச்சி": "tiruchirappalli",
    "சேலம்": "salem", "திருநெல்வேலி": "tirunelveli", "நெல்லை": "tirunelveli",
    "தஞ்சாவூர்": "thanjavur", "தஞ்சாவூர": "thanjavur", "தஞ்சாவூரில்": "thanjavur", "தஞ்சை": "thanjavur", "வேலூர்": "vellore",
    "ஈரோடு": "erode", "திண்டுக்கல்": "dindigul", "கன்னியாகுமரி": "kanyakumari",
    "கோலார்": "kolar", "பெங்களூரு": "bengaluru", "பெங்களூர்": "bengaluru",
    "ஷிவமொக்கா": "shivamogga", "மைசூர்": "mysuru", "சங்கரூர்": "sangrur",
    "நாசிக்": "nashik", "புனே": "pune", "மும்பை": "mumbai", "கொச்சி": "kochi",
    "ஹைதராபாத்": "hyderabad", "ஜெய்ப்பூர்": "jaipur", "டெல்லி": "delhi",

    # Telugu (te)
    "హైదరాబాద్": "hyderabad", "వరంగల్": "warangal", "నిజామాబాద్": "nizamabad",
    "కరీంనగర్": "karimnagar", "ఖమ్మం": "khammam", "విశాఖపట్నం": "visakhapatnam",
    "వైజాగ్": "visakhapatnam", "విజయవాడ": "vijayawada", "గుంటూరు": "guntur",
    "నెల్లూరు": "nellore", "కర్నూలు": "kurnool", "కర్నూల్": "kurnool",
    "తిరుపతి": "tirupati", "అనంతపురం": "anantapur", "కడప": "kadapa",
    "కాకినాడ": "kakinada", "రాజమండ్రి": "rajamahendravaram", "ఏలూరు": "eluru",
    "ఒంగోలు": "ongole", "కోలార్": "kolar", "బెంగళూరు": "bengaluru",
    "శివమొగ్గ": "shivamogga", "మైసూరు": "mysuru", "చెన్నై": "chennai",
    "తంజావూరు": "thanjavur", "నాసిక్": "nashik", "పూణే": "pune", "ముంబై": "mumbai",
    "సంగ్రూర్": "sangrur", "ఢిల్లీ": "delhi", "జైపూర్": "jaipur", "కొచ్చి": "kochi",

    # Bengali (bn)
    "কলকাতা": "kolkata", "হাওড়া": "howrah", "আসানসোল": "asansol",
    "শিলিগুড়ি": "siliguri", "দুর্গাপুর": "durgapur", "বর্ধমান": "bardhaman",
    "মালদা": "malda", "দার্জিলিং": "darjeeling", "কোলার": "kolar",
    "বেঙ্গালুরু": "bengaluru", "শিবমোগ্গা": "shivamogga", "পাটনা": "patna",
    "রাঁচি": "ranchi", "ভুবনেশ্বর": "bhubaneswar", "গুয়াহাটি": "guwahati",
    "দিল্লি": "delhi", "মুম্বাই": "mumbai", "পুনে": "pune", "নাসিক": "nashik",
    "জয়পুর": "jaipur", "চেন্নাই": "chennai", "হায়দ্রাবাদ": "hyderabad",

    # Gujarati (gu)
    "અમદાવાદ": "ahmedabad", "સુરત": "surat", "વડોદરા": "vadodara",
    "રાજકોટ": "rajkot", "ભાવનગર": "bhavnagar", "જામનગર": "jamnagar",
    "ગાંધીનગર": "gandhinagar", "મહેસાણા": "mehsana", "કોલાર": "kolar",
    "સંગરૂર": "sangrur", "બેંગલુરુ": "bengaluru", "શિવમોગ્ગા": "shivamogga",
    "મુંબઈ": "mumbai", "પુણે": "pune", "નાસિક": "nashik", "જયપુર": "jaipur",

    # Malayalam (ml)
    "തിരുവനന്തപുരം": "thiruvananthapuram", "കൊച്ചി": "kochi", "എറണാകുളം": "ernakulam",
    "കോഴിക്കോട്": "kozhikode", "തൃശ്ശൂർ": "thrissur", "കൊല്ലം": "kollam",
    "ആലപ്പുഴ": "alappuzha", "പാലക്കാട്": "palakkad", "കണ്ണൂർ": "kannur",
    "കോട്ടയം": "kottayam", "വയനാട്": "wayanad", "കോലാർ": "kolar",
    "ബെംഗളൂരു": "bengaluru", "ശിവമോഗ്ഗ": "shivamogga", "തഞ്ചാവൂർ": "thanjavur",
    "ചെന്നൈ": "chennai", "കോയമ്പത്തൂർ": "coimbatore", "മുംബൈ": "mumbai",
    "പൂനെ": "pune", "നാസിക്": "nashik", "ഡൽഹി": "delhi", "ഹൈദരാബാദ്": "hyderabad",

    # Punjabi (pa)
    "ਅੰਮ੍ਰਿਤਸਰ": "amritsar", "ਲੁਧਿਆਣਾ": "ludhiana", "ਜਲੰਧਰ": "jalandhar",
    "ਪਟਿਆਲਾ": "patiala", "ਬਠਿੰਡਾ": "bathinda", "ਸੰਗਰੂਰ": "sangrur",
    "ਹੁਸ਼ਿਆਰਪੁਰ": "hoshiarpur", "ਮੋਹਾਲੀ": "mohali", "ਚੰਡੀਗੜ੍ਹ": "chandigarh",
    "ਦਿੱਲੀ": "delhi", "ਕੋਲਾਰ": "kolar", "ਬੈਂਗਲੁਰੂ": "bengaluru", "ਮੁੰਬਈ": "mumbai",
    "ਪੁਣੇ": "pune", "ਨਾਸਿਕ": "nashik", "ਜੈਪੁਰ": "jaipur",

    # Odia (or)
    "ଭୁବନେଶ୍ୱର": "bhubaneswar", "କଟକ": "cuttack", "ରାଉରକେଲା": "rourkela",
    "ବ୍ରହ୍ମପୁର": "berhampur", "ସମ୍ବଲପୁର": "sambalpur", "ପୁରୀ": "puri",
    "ବାଲେଶ୍ୱର": "balasore", "କୋଲାର": "kolar", "ବେଙ୍ଗାଲୁରୁ": "bengaluru",
    "ଶିବମୋଗା": "shivamogga", "ସଙ୍ଗରୁର": "sangrur", "ମୁମ୍ବାଇ": "mumbai",
    "ପୁଣେ": "pune", "ନାସିକ": "nashik", "ଦିଲ୍ଲୀ": "delhi", "କୋଲକାତା": "kolkata",

    # Assamese (as)
    "গুৱাহাটী": "guwahati", "শিলচৰ": "silchar", "ডিব্ৰুগড়": "dibrugarh",
    "যোৰহাট": "jorhat", "তেজপুৰ": "tezpur", "নগাঁও": "nagaon",
    "কোলৰ": "kolar", "বেংগালুৰু": "bengaluru", "শিৱমোগা": "shivamogga",
    "দিল্লী": "delhi", "মুম্বাই": "mumbai", "পুনে": "pune", "নাছিক": "nashik",

    # Urdu (ur)
    "دہلی": "delhi", "نئی دہلی": "delhi", "ممبئی": "mumbai", "بمبئی": "mumbai",
    "پونے": "pune", "ناسک": "nashik", "بارامتی": "baramati", "حیدرآباد": "hyderabad",
    "بنگلورو": "bengaluru", "بنگلور": "bengaluru", "کولار": "kolar",
    "سنگرور": "sangrur", "شیواموگا": "shivamogga", "تنجاور": "thanjavur",
    "لکھنؤ": "lucknow", "کانپور": "kanpur", "وارانسی": "varanasi", "پٹنہ": "patna",
    "کولکتہ": "kolkata", "جے پور": "jaipur", "سری نگر": "srinagar", "جموں": "jammu",
    "لیہ": "leh", "لدّاخ": "leh", "امرتسر": "amritsar", "پٹیالہ": "patiala",
    "لدھیانہ": "ludhiana", "بھوپال": "bhopal", "اندور": "indore", "گوہاٹی": "guwahati",
    "کوچی": "kochi", "چنئی": "chennai", "کوئمبتور": "coimbatore",
}


# ==============================================================================
# 5. MAIN LOCATION RESOLUTION LOGIC
# ==============================================================================
def resolve_location(
    location_query: Optional[str] = None,
    query_text: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    station_id: Optional[str] = None
) -> LocationResolution:
    """
    Dynamically resolves any Indian location query (place name, district, state,
    PIN code, coordinate, or DWLR station) to geographical coordinates.

    STRICT RULES:
    1. If location is empty and no coords provided: is_resolved=False, error_message="Please enter a valid village, town, city, district, state, or 6-digit PIN code."
    2. If location is international: is_resolved=False, error_message="JalKrishi currently supports locations in India."
    3. If location is ambiguous: is_resolved=False, status="AMBIGUOUS", error_message="Multiple locations found. Please select your district and state."
    4. If location is unverified/gibberish: is_resolved=False, status="UNRESOLVED", error_message="We couldn't verify that location. Please enter a valid village, town, city, district, state, or 6-digit PIN code."
    5. Never return a hardcoded demonstration city or national centroid as a default fallback.
    """
    raw_input = (location_query or "").strip()
    full_text = (query_text or "").strip()

    text_to_search = raw_input if raw_input else full_text

    # --- Case 0: Empty input check or direct Station ID lookup ---
    if not text_to_search:
        if station_id and station_id.strip():
            st = station_repo.get_by_id(station_id.strip())
            if st:
                logger.info(f"[LOCATION RESOLVER SUCCESS] Matched station_id parameter '{station_id}' -> '{st.stationName}'")
                return LocationResolution(
                    is_resolved=True,
                    status="VERIFIED",
                    resolution_source="dwlr_station",
                    confidence=1.0,
                    name=st.stationName,
                    district=st.district,
                    state=st.state,
                    latitude=st.latitude,
                    longitude=st.longitude,
                    matched_station_id=st.id
                )
        if latitude is not None and longitude is not None:
            # Check bounding box for India: Lat 6.0N - 37.5N, Lon 68.0E - 97.5E
            if not (6.0 <= latitude <= 37.5 and 68.0 <= longitude <= 97.5):
                return LocationResolution(
                    is_resolved=False,
                    status="INTERNATIONAL",
                    name=None,
                    error_message="Coordinates are outside India. JalKrishi currently supports locations in India.",
                    is_international=True
                )
            import math
            nearest_st = station_repo.get_all()
            nearest = None
            min_d = 9999.0
            for st in nearest_st:
                dlat = math.radians(st.latitude - latitude)
                dlon = math.radians(st.longitude - longitude)
                a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(latitude)) * math.cos(math.radians(st.latitude)) * math.sin(dlon / 2.0)**2
                d = 6371.0 * (2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a)))
                if d < min_d:
                    min_d = d
                    nearest = st

            loc_name = f"Location ({latitude:.2f}N, {longitude:.2f}E)"
            return LocationResolution(
                is_resolved=True,
                status="VERIFIED",
                resolution_source="coordinates",
                confidence=0.90,
                name=loc_name if min_d > 15.0 else nearest.stationName,
                district=nearest.district if (nearest and min_d <= 50.0) else None,
                state=nearest.state if (nearest and min_d <= 50.0) else None,
                latitude=latitude,
                longitude=longitude,
                matched_station_id=nearest.id if (nearest and min_d <= 15.0) else None
            )

        return LocationResolution(
            is_resolved=False,
            status="UNRESOLVED",
            name=None,
            error_message="Please enter a valid village, town, city, district, state, or 6-digit PIN code."
        )

    clean_text = text_to_search.lower()
    clean_text_norm = re.sub(r"[^\w\s\u0900-\u0D7F\u0600-\u06FF]", " ", clean_text)
    words = clean_text_norm.split()

    # --- Case 1: Check for International Locations (Outside India) ---
    for w in words:
        if w in INTERNATIONAL_LOCATIONS:
            logger.info(f"[LOCATION RESOLVER] International location detected: '{w}'")
            return LocationResolution(
                is_resolved=False,
                status="INTERNATIONAL",
                name=w.capitalize(),
                error_message="JalKrishi currently supports locations in India.",
                is_international=True
            )
    for int_loc in INTERNATIONAL_LOCATIONS:
        if len(int_loc.split()) > 1 and int_loc in clean_text_norm:
            logger.info(f"[LOCATION RESOLVER] International location detected: '{int_loc}'")
            return LocationResolution(
                is_resolved=False,
                status="INTERNATIONAL",
                name=int_loc.title(),
                error_message="JalKrishi currently supports locations in India.",
                is_international=True
            )

    # --- Case 1.5: Ambiguous Location Check ---
    for amb_key, options in AMBIGUOUS_LOCATIONS_MAP.items():
        pattern = r"\b" + re.escape(amb_key) + r"\b"
        if re.search(pattern, clean_text_norm):
            has_qualifier = False
            for opt in options:
                st_kw = opt["state"].lower()
                dt_kw = opt["district"].lower()
                matched_state = re.search(r"\b" + re.escape(st_kw) + r"\b", clean_text_norm) if st_kw != amb_key else False
                matched_dist = re.search(r"\b" + re.escape(dt_kw) + r"\b", clean_text_norm) if dt_kw != amb_key else False
                if matched_state or matched_dist:
                    has_qualifier = True
                    return LocationResolution(
                        is_resolved=True,
                        status="VERIFIED",
                        resolution_source="disambiguated_gazetteer",
                        confidence=opt["confidence"],
                        name=f"{amb_key.title()}, {opt['district']}",
                        district=opt["district"],
                        state=opt["state"],
                        latitude=opt["latitude"],
                        longitude=opt["longitude"]
                    )
            if not has_qualifier:
                logger.info(f"[LOCATION RESOLVER AMBIGUOUS] Ambiguous location '{amb_key}' needs disambiguation")
                return LocationResolution(
                    is_resolved=False,
                    status="AMBIGUOUS",
                    name=amb_key.title(),
                    ambiguous_options=options,
                    error_message="Multiple locations found. Please select your district and state."
                )

    # --- Case 2: Check 6-digit Indian PIN codes ---
    pin_match = re.search(r"\b([1-9][0-9]{5})\b", clean_text)
    if pin_match:
        pin = pin_match.group(1)
        prefix_3 = pin[:3]
        prefix_2 = pin[:2]
        if prefix_3 in KNOWN_PIN_PREFIXES:
            coords = KNOWN_PIN_PREFIXES[prefix_3]
            logger.info(f"[LOCATION RESOLVER SUCCESS] Matched PIN code '{pin}' (prefix {prefix_3}) -> ({coords[2]}, {coords[3]})")
            return LocationResolution(
                is_resolved=True,
                status="VERIFIED",
                resolution_source="pin_code",
                confidence=0.95,
                name=f"PIN {pin} ({coords[2]}, {coords[3]})",
                district=coords[2],
                state=coords[3],
                latitude=coords[0],
                longitude=coords[1]
            )

    # --- Case 3: Check Multilingual Place Map ---
    for lang_key, target_place in MULTILINGUAL_PLACE_MAP.items():
        lk = lang_key.lower()
        if any(ord(c) > 127 for c in lk):
            is_match = (lk in clean_text_norm or lk in clean_text)
        else:
            pattern = r"\b" + re.escape(lk) + r"\b"
            is_match = bool(re.search(pattern, clean_text_norm))

        if is_match:
            coords = KNOWN_REFERENCE_LOCATIONS.get(target_place)
            if coords:
                lk_ascii = lang_key.encode('ascii', errors='backslashreplace').decode('ascii')
                logger.info(f"[LOCATION RESOLVER SUCCESS] Matched multilingual '{lk_ascii}' -> '{target_place}' ({coords[2]}, {coords[3]})")
                return LocationResolution(
                    is_resolved=True,
                    status="VERIFIED",
                    resolution_source="multilingual_gazetteer",
                    confidence=0.95,
                    name=coords[2],
                    district=coords[2],
                    state=coords[3],
                    latitude=coords[0],
                    longitude=coords[1]
                )

    # --- Case 4: Check Known Reference Locations (Prioritize Specific Cities/Districts over Whole States) ---
    def ref_key_priority(k: str):
        c = KNOWN_REFERENCE_LOCATIONS[k]
        is_state_level = (c[2].lower() == c[3].lower() or k.lower() == c[3].lower())
        return (1 if is_state_level else 0, -len(k.split()), -len(k))

    sorted_ref_keys = sorted(KNOWN_REFERENCE_LOCATIONS.keys(), key=ref_key_priority)
    for place_key in sorted_ref_keys:
        coords = KNOWN_REFERENCE_LOCATIONS[place_key]
        pattern = r"\b" + re.escape(place_key) + r"\b"
        if re.search(pattern, clean_text_norm):
            logger.info(f"[LOCATION RESOLVER SUCCESS] Matched key '{place_key}' -> ({coords[2]}, {coords[3]})")
            return LocationResolution(
                is_resolved=True,
                status="VERIFIED",
                resolution_source="gazetteer",
                confidence=0.98,
                name=coords[2],
                district=coords[2],
                state=coords[3],
                latitude=coords[0],
                longitude=coords[1]
            )

    # --- Case 5: Search DWLR Station Repository ---
    all_stations = station_repo.get_all()

    # 5A. Station ID or Code match (exact word boundary)
    for st in all_stations:
        st_id_clean = st.id.lower()
        st_code_clean = st.stationCode.lower() if st.stationCode else ""
        if (re.search(r"\b" + re.escape(st_id_clean) + r"\b", clean_text_norm) or
            (st_code_clean and re.search(r"\b" + re.escape(st_code_clean) + r"\b", clean_text_norm))):
            logger.info(f"[LOCATION RESOLVER SUCCESS] Matched station ID '{st.id}' -> '{st.stationName}'")
            return LocationResolution(
                is_resolved=True,
                status="VERIFIED",
                resolution_source="dwlr_station",
                confidence=1.0,
                name=st.stationName,
                district=st.district,
                state=st.state,
                latitude=st.latitude,
                longitude=st.longitude,
                matched_station_id=st.id
            )

    # 5B. District / Block / State match in repository (STRICT word boundary ONLY)
    for st in all_stations:
        d_clean = st.district.lower() if st.district else ""
        if len(d_clean) >= 3 and re.search(r"\b" + re.escape(d_clean) + r"\b", clean_text_norm):
            logger.info(f"[LOCATION RESOLVER SUCCESS] Matched DWLR district '{st.district}'")
            return LocationResolution(
                is_resolved=True,
                status="VERIFIED",
                resolution_source="dwlr_network",
                confidence=0.90,
                name=st.district,
                district=st.district,
                state=st.state,
                latitude=st.latitude,
                longitude=st.longitude
            )
        b_clean = st.block.lower() if st.block else ""
        if len(b_clean) >= 3 and re.search(r"\b" + re.escape(b_clean) + r"\b", clean_text_norm):
            logger.info(f"[LOCATION RESOLVER SUCCESS] Matched DWLR block '{st.block}'")
            return LocationResolution(
                is_resolved=True,
                status="VERIFIED",
                resolution_source="dwlr_network",
                confidence=0.88,
                name=f"{st.block}, {st.district}",
                district=st.district,
                state=st.state,
                latitude=st.latitude,
                longitude=st.longitude
            )
        s_clean = st.state.lower() if st.state else ""
        if len(s_clean) >= 4 and re.search(r"\b" + re.escape(s_clean) + r"\b", clean_text_norm):
            logger.info(f"[LOCATION RESOLVER SUCCESS] Matched DWLR state '{st.state}'")
            return LocationResolution(
                is_resolved=True,
                status="VERIFIED",
                resolution_source="dwlr_network",
                confidence=0.85,
                name=st.state,
                district=st.district,
                state=st.state,
                latitude=st.latitude,
                longitude=st.longitude
            )

    # --- Case 6: Fallback coordinate match ---
    if latitude is not None and longitude is not None:
        if 6.0 <= latitude <= 37.5 and 68.0 <= longitude <= 97.5:
            return LocationResolution(
                is_resolved=True,
                status="VERIFIED",
                resolution_source="coordinates",
                confidence=0.85,
                name=f"Location ({latitude:.2f}N, {longitude:.2f}E)",
                district=None,
                state=None,
                latitude=latitude,
                longitude=longitude
            )

    # --- Case 7: Unresolvable / Unknown location ---
    logger.warning(f"[LOCATION RESOLVER UNRESOLVED] Could not resolve Indian location from text: '{clean_text}'")
    return LocationResolution(
        is_resolved=False,
        status="UNRESOLVED",
        name=None,
        error_message="Location not recognized. Please enter a valid village, town, city, district, state, or 6-digit PIN code."
    )
