"""
JalKrishi AI — Dynamic Location Resolver Module
------------------------------------------------
Resolves arbitrary location queries (cities, districts, blocks, states, regional place names)
to geographical coordinates (latitude, longitude) and administrative metadata.

Resolves place names in 13 Indian regional languages:
- English, Hindi, Kannada, Tamil, Telugu, Bengali, Gujarati, Marathi, Malayalam, Punjabi, Odia, Assamese, Urdu.

Does NOT fake geocoding results or default silently to an arbitrary station.
If a location cannot be resolved by repository reference data or state/district centers,
returns is_resolved=False with a clear limitation message.
"""

from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass
from app.pipeline.dwlr_ingest import station_repo


@dataclass
class LocationResolution:
    is_resolved: bool
    name: str
    district: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    matched_station_id: Optional[str] = None
    error_message: Optional[str] = None


# Known Reference Indian Cities, Districts, and Remote Locations with exact coordinates
KNOWN_REFERENCE_LOCATIONS: Dict[str, Tuple[float, float, str, str]] = {
    # Format: "place_key": (latitude, longitude, district, state)
    "kolar": (13.1367, 78.1291, "Kolar", "Karnataka"),
    "sangrur": (30.2450, 75.8420, "Sangrur", "Punjab"),
    "thanjavur": (10.7870, 79.1378, "Thanjavur", "Tamil Nadu"),
    "mehsana": (23.5880, 72.3693, "Mehsana", "Gujarat"),
    "amritsar": (31.6340, 74.8723, "Amritsar", "Punjab"),
    "pune": (18.5204, 73.8567, "Pune", "Maharashtra"),
    "mysore": (12.2958, 76.6394, "Mysuru", "Karnataka"),
    "bengaluru": (12.9716, 77.5946, "Bengaluru Urban", "Karnataka"),
    "bangalore": (12.9716, 77.5946, "Bengaluru Urban", "Karnataka"),
    "jaipur": (26.9124, 75.7873, "Jaipur", "Rajasthan"),
    "jodhpur": (26.2389, 73.0243, "Jodhpur", "Rajasthan"),
    "lucknow": (26.8467, 80.9462, "Lucknow", "Uttar Pradesh"),
    "varanasi": (25.3176, 82.9739, "Varanasi", "Uttar Pradesh"),
    "patna": (25.5941, 85.1376, "Patna", "Bihar"),
    "kolkata": (22.5726, 88.3639, "Kolkata", "West Bengal"),
    "chennai": (13.0827, 80.2707, "Chennai", "Tamil Nadu"),
    "hyderabad": (17.3850, 78.4867, "Hyderabad", "Telangana"),
    "coimbatore": (11.0168, 76.9558, "Coimbatore", "Tamil Nadu"),
    "madurai": (9.9252, 78.1198, "Madurai", "Tamil Nadu"),
    "shimla": (31.1048, 77.1734, "Shimla", "Himachal Pradesh"),
    "leh": (34.1526, 77.5771, "Leh", "Ladakh"),
    "ladakh": (34.1526, 77.5771, "Leh", "Ladakh"),
    "gangtok": (27.3389, 88.6065, "Gangtok", "Sikkim"),
    "itanagar": (27.0844, 93.6053, "Papum Pare", "Arunachal Pradesh"),
    "jaisalmer": (26.9157, 70.9083, "Jaisalmer", "Rajasthan"),
    "barmer": (25.7532, 71.4181, "Barmer", "Rajasthan"),
    "wayanad": (11.6854, 76.1320, "Wayanad", "Kerala"),
    "kanyakumari": (8.0883, 77.5385, "Kanyakumari", "Tamil Nadu"),
    "mumbai": (19.0760, 72.8777, "Mumbai", "Maharashtra"),
    "bombay": (19.0760, 72.8777, "Mumbai", "Maharashtra"),
    "delhi": (28.6139, 77.2090, "Delhi", "Delhi"),
    "new delhi": (28.6139, 77.2090, "Delhi", "Delhi"),
}

# Multilingual Location Dictionary Mapping across 13 Indian regional scripts
MULTILINGUAL_PLACE_MAP: Dict[str, str] = {
    # English
    "bengaluru": "bengaluru",
    "bangalore": "bengaluru",
    "thanjavur": "thanjavur",
    "tanjore": "thanjavur",
    "kolar": "kolar",
    "sangrur": "sangrur",
    "mehsana": "mehsana",
    "amritsar": "amritsar",
    "pune": "pune",
    "mysore": "mysore",
    "mysuru": "mysore",
    "mumbai": "mumbai",
    "bombay": "mumbai",
    "delhi": "delhi",
    "leh": "leh",
    "ladakh": "leh",
    # Kannada (kn)
    "ಕೋಲಾರ": "kolar",
    "ಕೋಲಾರದಲ್ಲಿ": "kolar",
    "ಸಂಗ್ರೂರು": "sangrur",
    "ತಂಜಾವೂರು": "thanjavur",
    "ತಂಜಾವೂರಿನಲ್ಲಿ": "thanjavur",
    "ಮೆಹಸಾನಾ": "mehsana",
    "ಅಮೃತಸರ": "amritsar",
    "ಬೆಂಗಳೂರು": "bengaluru",
    "ಬೆಂಗಳೂರಿನಲ್ಲಿ": "bengaluru",
    "ಬೆಂಗಳೂರಿನ": "bengaluru",
    "ಮೈಸೂರು": "mysore",
    "ಮುಂಬೈ": "mumbai",
    "ದೆಹಲಿ": "delhi",
    "ಪುಣೆ": "pune",
    "ಲೇಹ್": "leh",
    "ಲಡಾಖ್": "leh",
    # Hindi (hi)
    "कोलार": "kolar",
    "संगरूर": "sangrur",
    "तंजौर": "thanjavur",
    "तंजावुर": "thanjavur",
    "थंजावुर": "thanjavur",
    "थंजावूर": "thanjavur",
    "मेहसाना": "mehsana",
    "अमृतसर": "amritsar",
    "पुणे": "pune",
    "मैसूर": "mysore",
    "बेंगलुरु": "bengaluru",
    "बैंगलोर": "bengaluru",
    "बेंगलोर": "bengaluru",
    "मुंबई": "mumbai",
    "दिल्ली": "delhi",
    "लेह": "leh",
    "लद्दाख": "leh",
    # Tamil (ta)
    "கோலார்": "kolar",
    "கோலாரில்": "kolar",
    "தஞ்சாவூர்": "thanjavur",
    "தஞ்சாவூரில்": "thanjavur",
    "தஞ்சாவூரின்": "thanjavur",
    "சங்ரூர்": "sangrur",
    "மெஹசானா": "mehsana",
    "பெங்களூர்": "bengaluru",
    "பெங்களூரில்": "bengaluru",
    "பெங்களூரின்": "bengaluru",
    "மும்பை": "mumbai",
    "டெல்லி": "delhi",
    "லே": "leh",
    "லடாக்": "leh",
    # Telugu (te)
    "కోలార్": "kolar",
    "కోలార్లో": "kolar",
    "కోలార్ లో": "kolar",
    "తంజావూరు": "thanjavur",
    "తంజావూరులో": "thanjavur",
    "సంగ్రూర్": "sangrur",
    "మెహసానా": "mehsana",
    "బెంగళూరు": "bengaluru",
    "బెంగళూరులో": "bengaluru",
    "ముంబై": "mumbai",
    "ఢిల్లీ": "delhi",
    "లేహ్": "leh",
    "లడఖ్": "leh",
    # Bengali (bn)
    "কোলারে": "kolar",
    "কোলার": "kolar",
    "সংরুর": "sangrur",
    "তাঞ্জাভুর": "thanjavur",
    "থাঞ্জাভুরে": "thanjavur",
    "মেহসানা": "mehsana",
    "বেঙ্গালুরু": "bengaluru",
    "বেঙ্গালুরুতে": "bengaluru",
    "বেঙ্গালুরুর": "bengaluru",
    "মুম্বাই": "mumbai",
    "দিল্লি": "delhi",
    "লেহ": "leh",
    "লাদাখ": "leh",
    # Gujarati (gu)
    "કોલાર": "kolar",
    "મહેસાણા": "mehsana",
    "મુંબઈ": "mumbai",
    "દિલ્હી": "delhi",
    "બેંગલુરુ": "bengaluru",
    "બેંગલુરુનું": "bengaluru",
    "તંજાવુર": "thanjavur",
    "લેહ": "leh",
    # Marathi (mr)
    "कोलार": "kolar",
    "पुणे": "pune",
    "मुंबई": "mumbai",
    "दिल्ली": "delhi",
    "बेंगळुरू": "bengaluru",
    "बेंगळुरूची": "bengaluru",
    "तंजावूर": "thanjavur",
    "लेह": "leh",
    # Punjabi (pa)
    "ਸੰਗਰੂਰ": "sangrur",
    "ਅੰਮ੍ਰਿਤਸਰ": "amritsar",
    "ਮੁੰਬਈ": "mumbai",
    "ਦਿੱਲੀ": "delhi",
    "ਬੈਂਗਲੁਰੂ": "bengaluru",
    "ਤੰਜਾਵੁਰ": "thanjavur",
    "ਲੇਹ": "leh",
    # Malayalam (ml)
    "കോലാർ": "kolar",
    "വയനാട്": "wayanad",
    "മുംബൈ": "mumbai",
    "ദില്ലി": "delhi",
    "ബെംഗളൂരു": "bengaluru",
    "ബെംഗളൂരുവിലെ": "bengaluru",
    "തഞ്ചാവൂർ": "thanjavur",
    "ലേ": "leh",
    # Odia (or)
    "କୋଲାର": "kolar",
    "ମୁମ୍ବାଇ": "mumbai",
    "ଦିଲ୍ଲୀ": "delhi",
    "ବେଙ୍ଗାଲୁରୁ": "bengaluru",
    "ବେଙ୍ଗାଲୁରୁର": "bengaluru",
    "ତଞ୍ଜାଭୁର": "thanjavur",
    "ଲେହ": "leh",
    # Assamese (as)
    "কোলৰ": "kolar",
    "মুম্বাই": "mumbai",
    "দিল্লী": "delhi",
    "বেংগালুৰু": "bengaluru",
    "বেংগালুৰুৰ": "bengaluru",
    "তঞ্জাভুৰ": "thanjavur",
    "লেহ": "leh",
    # Urdu (ur)
    "کولار": "kolar",
    "سنگرور": "sangrur",
    "تھنجاور": "thanjavur",
    "مہسانا": "mehsana",
    "ممبئی": "mumbai",
    "دہلی": "delhi",
    "بنگلورو": "bengaluru",
    "لیہ": "leh",
    "لداخ": "leh",
}


def resolve_location(
    location_query: Optional[str] = None,
    query_text: Optional[str] = None
) -> LocationResolution:
    """
    Dynamically resolves place names to geographic coordinates.
    Priority:
    1. Direct match on location_query or query_text in MULTILINGUAL_PLACE_MAP & KNOWN_REFERENCE_LOCATIONS
    2. Station ID / station Code match in DWLR repository
    3. District / Block / State match in DWLR repository
    4. Return is_resolved=False with clean limitation error message.
    """
    import logging
    logger = logging.getLogger("app.location_resolver")

    raw_input = (location_query or "").strip()
    full_text = (query_text or "").strip()

    text_to_search = raw_input if raw_input else full_text
    if not text_to_search:
        return LocationResolution(
            is_resolved=False,
            name="Unknown",
            error_message="Location could not be resolved. Please provide a district, state, or select a location on the map."
        )

    clean_text = text_to_search.lower()

    # 1. Check multilingual place map
    for lang_key, target_place in MULTILINGUAL_PLACE_MAP.items():
        if lang_key.lower() in clean_text:
            coords = KNOWN_REFERENCE_LOCATIONS.get(target_place)
            if coords:
                lk_ascii = lang_key.encode('ascii', errors='backslashreplace').decode('ascii')
                logger.info(f"[LOCATION RESOLVER SUCCESS] Matched '{lk_ascii}' -> '{target_place}' ({coords[2]}, {coords[3]}) at ({coords[0]}, {coords[1]})")
                return LocationResolution(
                    is_resolved=True,
                    name=coords[2],
                    district=coords[2],
                    state=coords[3],
                    latitude=coords[0],
                    longitude=coords[1]
                )

    # 2. Check known reference location dictionary
    for place_key, coords in KNOWN_REFERENCE_LOCATIONS.items():
        if place_key in clean_text:
            logger.info(f"[LOCATION RESOLVER SUCCESS] Matched key '{place_key}' -> ({coords[2]}, {coords[3]}) at ({coords[0]}, {coords[1]})")
            return LocationResolution(
                is_resolved=True,
                name=coords[2],
                district=coords[2],
                state=coords[3],
                latitude=coords[0],
                longitude=coords[1]
            )

    # 3. Search DWLR station repository
    all_stations = station_repo.get_all()
    
    # Station ID or Code match
    for st in all_stations:
        if st.id.lower() in clean_text or st.stationCode.lower() in clean_text:
            logger.info(f"[LOCATION RESOLVER SUCCESS] Matched station ID '{st.id}' -> '{st.stationName}'")
            return LocationResolution(
                is_resolved=True,
                name=st.stationName,
                district=st.district,
                state=st.state,
                latitude=st.latitude,
                longitude=st.longitude,
                matched_station_id=st.id
            )

    # District or Block match (requiring min length to avoid false substring matches)
    for st in all_stations:
        d_clean = st.district.lower()
        if len(d_clean) >= 3 and d_clean in clean_text:
            logger.info(f"[LOCATION RESOLVER SUCCESS] Matched DWLR district '{st.district}'")
            return LocationResolution(
                is_resolved=True,
                name=st.district,
                district=st.district,
                state=st.state,
                latitude=st.latitude,
                longitude=st.longitude
            )
        b_clean = st.block.lower()
        if len(b_clean) >= 3 and b_clean in clean_text:
            logger.info(f"[LOCATION RESOLVER SUCCESS] Matched DWLR block '{st.block}'")
            return LocationResolution(
                is_resolved=True,
                name=f"{st.block}, {st.district}",
                district=st.district,
                state=st.state,
                latitude=st.latitude,
                longitude=st.longitude
            )
        s_clean = st.state.lower()
        if len(s_clean) >= 4 and s_clean in clean_text:
            logger.info(f"[LOCATION RESOLVER SUCCESS] Matched DWLR state '{st.state}'")
            return LocationResolution(
                is_resolved=True,
                name=st.state,
                district=st.district,
                state=st.state,
                latitude=st.latitude,
                longitude=st.longitude
            )

    # 4. If unresolvable, return clean limitation message without faking coordinates
    logger.warning(f"[LOCATION RESOLVER UNRESOLVED] Could not resolve location from text: '{clean_text}'")
    return LocationResolution(
        is_resolved=False,
        name=None,
        error_message="Location could not be resolved. Please provide a district, state, or select a location on the map."
    )
