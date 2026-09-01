import type { DWLRStation, StationStatus, TrendDirection } from '../types';
import { mockStations } from './mockStations';

// Seeded deterministic pseudo-random number generator (Mulberry32)
function createSeededRandom(seed: number) {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface StateDistrictConfig {
  state: string;
  districts: {
    name: string;
    latRange: [number, number];
    lngRange: [number, number];
    blocks: string[];
    criticalWeight: number; // Probability weight of critical/warning
    soil: string[];
    aquifer: string[];
  }[];
  targetCount: number;
}

const STATE_CONFIGS: StateDistrictConfig[] = [
  {
    state: 'Punjab',
    targetCount: 420,
    districts: [
      {
        name: 'Sangrur',
        latRange: [30.15, 30.40],
        lngRange: [75.70, 76.05],
        blocks: ['Sunam', 'Lehragaga', 'Dhuri', 'Malerkotla', 'Moonak'],
        criticalWeight: 0.65,
        soil: ['Alluvial Loam', 'Clayey Alluvium'],
        aquifer: ['Deep Unconfined Alluvial Sand', 'Multi-layered Alluvial Aquifer'],
      },
      {
        name: 'Bathinda',
        latRange: [30.05, 30.35],
        lngRange: [74.80, 75.20],
        blocks: ['Talwandi Sabo', 'Rampura Phul', 'Maur', 'Bhagta Bhaika'],
        criticalWeight: 0.60,
        soil: ['Sandy Loam', 'Silty Sand'],
        aquifer: ['Deep Sand/Gravel Aquifer', 'Semi-confined Alluvium'],
      },
      {
        name: 'Ludhiana',
        latRange: [30.75, 31.05],
        lngRange: [75.65, 76.10],
        blocks: ['Jagraon', 'Samrala', 'Khanna', 'Doraha'],
        criticalWeight: 0.45,
        soil: ['Alluvial Silt Loam', 'Sandy Clay Loam'],
        aquifer: ['Unconfined Alluvium', 'Piezometric Alluvium'],
      },
      {
        name: 'Patiala',
        latRange: [30.15, 30.50],
        lngRange: [76.20, 76.60],
        blocks: ['Nabha', 'Rajpura', 'Samana', 'Patran'],
        criticalWeight: 0.50,
        soil: ['Alluvial Loam'],
        aquifer: ['Alluvial Sand / Silt'],
      },
      {
        name: 'Mansa',
        latRange: [29.85, 30.15],
        lngRange: [75.25, 75.60],
        blocks: ['Budhlada', 'Sardulgarh', 'Jhunir'],
        criticalWeight: 0.55,
        soil: ['Sandy Loam', 'Saline Silt'],
        aquifer: ['Deep Sand Layer'],
      },
      {
        name: 'Amritsar',
        latRange: [31.50, 31.85],
        lngRange: [74.70, 75.15],
        blocks: ['Ajnala', 'Majitha', 'Verka', 'Rayya'],
        criticalWeight: 0.35,
        soil: ['Fertile Alluvium'],
        aquifer: ['Upper Bari Doab Alluvium'],
      },
    ],
  },
  {
    state: 'Rajasthan',
    targetCount: 680,
    districts: [
      {
        name: 'Jodhpur',
        latRange: [26.05, 26.65],
        lngRange: [72.75, 73.45],
        blocks: ['Mandore', 'Bilara', 'Bhopalgarh', 'Luni', 'Osian', 'Phalodi'],
        criticalWeight: 0.70,
        soil: ['Desert Sand', 'Arid Sandy Loam'],
        aquifer: ['Sandstone & Fractured Limestone', 'Deep Desert Aquifer'],
      },
      {
        name: 'Jaipur',
        latRange: [26.70, 27.25],
        lngRange: [75.50, 76.10],
        blocks: ['Sanganer', 'Amber', 'Chomu', 'Phulera', 'Bassi', 'Kotputli'],
        criticalWeight: 0.55,
        soil: ['Sandy Loam', 'Calcareous Soil'],
        aquifer: ['Alluvial Sand & Quartzite', 'Hard Rock Fractured Gneiss'],
      },
      {
        name: 'Bikaner',
        latRange: [27.70, 28.35],
        lngRange: [72.90, 73.65],
        blocks: ['Nokha', 'Kolayat', 'Lunkaransar', 'Khajuwala'],
        criticalWeight: 0.65,
        soil: ['Thar Desert Dune Sand'],
        aquifer: ['Tertiary Sandstone', 'Deep Confined Saline Aquifer'],
      },
      {
        name: 'Nagaur',
        latRange: [26.80, 27.40],
        lngRange: [73.80, 74.45],
        blocks: ['Merta', 'Degana', 'Didwana', 'Ladnun', 'Makrana'],
        criticalWeight: 0.60,
        soil: ['Sandy Loam', 'Gypsiferous Soil'],
        aquifer: ['Limestone / Marbles & Sandstone'],
      },
      {
        name: 'Barmer',
        latRange: [25.50, 26.15],
        lngRange: [71.10, 71.75],
        blocks: ['Balotra', 'Gudamalani', 'Siwana', 'Baytu'],
        criticalWeight: 0.60,
        soil: ['Desert Sand'],
        aquifer: ['Sedimentary Sandstone & Conglomerate'],
      },
      {
        name: 'Sikar',
        latRange: [27.35, 27.85],
        lngRange: [74.95, 75.45],
        blocks: ['Fatehpur', 'Laxmangarh', 'Danta Ramgarh', 'Neem Ka Thana'],
        criticalWeight: 0.50,
        soil: ['Light Sandy Loam'],
        aquifer: ['Quartzite / Schist & Alluvial Sand'],
      },
    ],
  },
  {
    state: 'Maharashtra',
    targetCount: 720,
    districts: [
      {
        name: 'Aurangabad',
        latRange: [19.70, 20.15],
        lngRange: [75.10, 75.60],
        blocks: ['Gangapur', 'Vaijapur', 'Paithan', 'Kannad', 'Sillod'],
        criticalWeight: 0.40,
        soil: ['Black Cotton Soil (Regur)', 'Medium Black Soil'],
        aquifer: ['Deccan Basalt Vesicular Lava Flows', 'Weathered Deccan Trap'],
      },
      {
        name: 'Nashik',
        latRange: [19.80, 20.30],
        lngRange: [73.65, 74.20],
        blocks: ['Niphad', 'Dindori', 'Sinnar', 'Yeola', 'Malegaon'],
        criticalWeight: 0.35,
        soil: ['Black Clayey Loam', 'Red Laterite Loam'],
        aquifer: ['Basaltic Lava Flow & Jointed Rock'],
      },
      {
        name: 'Pune',
        latRange: [18.35, 18.85],
        lngRange: [73.70, 74.30],
        blocks: ['Baramati', 'Indapur', 'Shirur', 'Daund', 'Haveli', 'Junner'],
        criticalWeight: 0.35,
        soil: ['Medium to Deep Black Soil'],
        aquifer: ['Fractured Deccan Basalt Aquifer'],
      },
      {
        name: 'Ahmednagar',
        latRange: [19.00, 19.55],
        lngRange: [74.50, 75.10],
        blocks: ['Rahata', 'Sangamner', 'Shrirampur', 'Kopargaon', 'Newasa', 'Parner'],
        criticalWeight: 0.45,
        soil: ['Black Cotton Soil', 'Shallow Clay Loam'],
        aquifer: ['Weathered Basalt Trap Layer'],
      },
      {
        name: 'Solapur',
        latRange: [17.50, 18.05],
        lngRange: [75.65, 76.25],
        blocks: ['Pandharpur', 'Barshi', 'Karmala', 'Madha', 'Sangola'],
        criticalWeight: 0.40,
        soil: ['Shallow Rocky Black Soil'],
        aquifer: ['Deccan Trap Basaltic Aquifer'],
      },
      {
        name: 'Jalna',
        latRange: [19.65, 20.05],
        lngRange: [75.75, 76.20],
        blocks: ['Ambad', 'Partur', 'Bhokardan', 'Badnapur'],
        criticalWeight: 0.38,
        soil: ['Medium Black Loam'],
        aquifer: ['Vesicular Zeolitic Basalt'],
      },
    ],
  },
  {
    state: 'Karnataka',
    targetCount: 540,
    districts: [
      {
        name: 'Kolar',
        latRange: [13.00, 13.35],
        lngRange: [78.00, 78.35],
        blocks: ['Mulbagal', 'Bangarapet', 'Srinivaspur', 'Malur'],
        criticalWeight: 0.55,
        soil: ['Red Sandy Loam', 'Lateritic Red Soil'],
        aquifer: ['Deep Fractured Granitic Gneiss', 'Hard Rock Crystalline Aquifer'],
      },
      {
        name: 'Belagavi',
        latRange: [15.70, 16.30],
        lngRange: [74.40, 75.05],
        blocks: ['Gokak', 'Bailhongal', 'Chikkodi', 'Athani', 'Hukkeri', 'Savadatti'],
        criticalWeight: 0.25,
        soil: ['Deep Black Cotton Soil', 'Red Sandy Soil'],
        aquifer: ['Deccan Basalt & Crystalline Limestone'],
      },
      {
        name: 'Tumakuru',
        latRange: [13.20, 13.70],
        lngRange: [76.90, 77.30],
        blocks: ['Tiptur', 'Sira', 'Madhugiri', 'Kunigal', 'Gubbi'],
        criticalWeight: 0.35,
        soil: ['Red Loam', 'Mixed Sandy Soil'],
        aquifer: ['Peninsular Gneissic Complex'],
      },
      {
        name: 'Chitradurga',
        latRange: [14.05, 14.45],
        lngRange: [76.20, 76.70],
        blocks: ['Hiriyur', 'Challakere', 'Hosadurga', 'Holalkere'],
        criticalWeight: 0.45,
        soil: ['Red Loamy Sand', 'Black Clay'],
        aquifer: ['Granite & Schist Hard Rock'],
      },
      {
        name: 'Mandya',
        latRange: [12.40, 12.80],
        lngRange: [76.70, 77.10],
        blocks: ['Maddur', 'Malavalli', 'Pandavapura', 'Srirangapatna'],
        criticalWeight: 0.15,
        soil: ['Fertile Red Loam', 'Canal Irrigated Alluvium'],
        aquifer: ['Shallow Crystalline Aquifer'],
      },
      {
        name: 'Ballari',
        latRange: [14.95, 15.45],
        lngRange: [76.75, 77.20],
        blocks: ['Hospet', 'Siruguppa', 'Sandur', 'Kampli'],
        criticalWeight: 0.30,
        soil: ['Deep Black Soil'],
        aquifer: ['Basalt & Fractured Quartzite'],
      },
    ],
  },
  {
    state: 'Uttar Pradesh',
    targetCount: 850,
    districts: [
      {
        name: 'Varanasi',
        latRange: [25.20, 25.50],
        lngRange: [82.85, 83.15],
        blocks: ['Kashi', 'Pindra', 'Sevapuri', 'Araziline', 'Cholapur'],
        criticalWeight: 0.12,
        soil: ['Gangetic Alluvial Silt Loam', 'Fine Sandy Alluvium'],
        aquifer: ['Gangetic Unconfined Sand Aquifer', 'Deep Alluvial Sand Layer'],
      },
      {
        name: 'Prayagraj',
        latRange: [25.30, 25.65],
        lngRange: [81.70, 82.10],
        blocks: ['Phulpur', 'Handia', 'Karchhana', 'Soraon', 'Meja'],
        criticalWeight: 0.15,
        soil: ['Gangetic Alluvium', 'Loamy Silt'],
        aquifer: ['Confluence Alluvial Aquifer'],
      },
      {
        name: 'Lucknow',
        latRange: [26.70, 27.05],
        lngRange: [80.80, 81.15],
        blocks: ['Mohanlalganj', 'Bakshi Ka Talab', 'Malihabad', 'Kakori', 'Gosainganj'],
        criticalWeight: 0.20,
        soil: ['Alluvial Loam'],
        aquifer: ['Gomti Basin Multi-tier Alluvium'],
      },
      {
        name: 'Bareilly',
        latRange: [28.25, 28.60],
        lngRange: [79.25, 79.65],
        blocks: ['Faridpur', 'Aonla', 'Baheri', 'Mirganj', 'Nawabganj'],
        criticalWeight: 0.10,
        soil: ['Terai Silt Loam', 'Clayey Alluvium'],
        aquifer: ['High Permeability Sand / Gravel'],
      },
      {
        name: 'Meerut',
        latRange: [28.85, 29.20],
        lngRange: [77.55, 77.95],
        blocks: ['Mawana', 'Sardhana', 'Hastinapur', 'Daurala'],
        criticalWeight: 0.35,
        soil: ['Upper Doab Alluvial Loam'],
        aquifer: ['Ganga-Yamuna Interfluve Sand Layer'],
      },
      {
        name: 'Gorakhpur',
        latRange: [26.65, 27.00],
        lngRange: [83.25, 83.60],
        blocks: ['Sahjanwa', 'Bansgaon', 'Campierganj', 'Chauri Chaura', 'Pipraich'],
        criticalWeight: 0.08,
        soil: ['Rapti Alluvial Silt'],
        aquifer: ['Shallow High-Yield Alluvium'],
      },
    ],
  },
  {
    state: 'Gujarat',
    targetCount: 460,
    districts: [
      {
        name: 'Mehsana',
        latRange: [23.45, 23.85],
        lngRange: [72.25, 72.65],
        blocks: ['Kadi', 'Visnagar', 'Vijapur', 'Unjha', 'Becharaji', 'Kheralu'],
        criticalWeight: 0.50,
        soil: ['Sandy Loam', 'Calcareous Silt'],
        aquifer: ['Deep Mesozoic Sandstone', 'Alluvial Sand & Gravel'],
      },
      {
        name: 'Ahmedabad',
        latRange: [22.85, 23.25],
        lngRange: [72.40, 72.85],
        blocks: ['Sanand', 'Dholka', 'Bavla', 'Viramgam', 'Daskroi'],
        criticalWeight: 0.35,
        soil: ['Clayey Silt', 'Coastal Saline Alluvium'],
        aquifer: ['Sabarmati Basin Alluvium'],
      },
      {
        name: 'Rajkot',
        latRange: [22.15, 22.55],
        lngRange: [70.65, 71.05],
        blocks: ['Gondal', 'Jasdan', 'Jetpur', 'Dhoraji', 'Kotda Sangani'],
        criticalWeight: 0.30,
        soil: ['Medium Black Cotton Soil'],
        aquifer: ['Saurashtra Basalt Trap'],
      },
      {
        name: 'Banaskantha',
        latRange: [24.05, 24.50],
        lngRange: [72.10, 72.60],
        blocks: ['Palanpur', 'Deesa', 'Tharad', 'Dhanera', 'Vav'],
        criticalWeight: 0.55,
        soil: ['Arid Sandy Soil'],
        aquifer: ['Desert Boundary Sandstone & Alluvium'],
      },
    ],
  },
  {
    state: 'Haryana',
    targetCount: 380,
    districts: [
      {
        name: 'Kurukshetra',
        latRange: [29.85, 30.15],
        lngRange: [76.70, 77.05],
        blocks: ['Pehowa', 'Shahbad', 'Thanesar', 'Ladwa', 'Babain'],
        criticalWeight: 0.45,
        soil: ['Alluvial Loam', 'Sandy Silt Loam'],
        aquifer: ['Ghaggar Alluvial Aquifer', 'Deep Sand Gravel Layer'],
      },
      {
        name: 'Karnal',
        latRange: [29.55, 29.85],
        lngRange: [76.85, 77.20],
        blocks: ['Gharaunda', 'Indri', 'Nilokheri', 'Assandh'],
        criticalWeight: 0.40,
        soil: ['Fertile Alluvial Loam'],
        aquifer: ['Yamuna Alluvial Plain Sand Layer'],
      },
      {
        name: 'Sirsa',
        latRange: [29.40, 29.75],
        lngRange: [74.90, 75.30],
        blocks: ['Ellenabad', 'Rania', 'Dabwali', 'Kalanwali'],
        criticalWeight: 0.45,
        soil: ['Sandy Loam', 'Light Alluvium'],
        aquifer: ['Indo-Gangetic Basin Deep Aquifer'],
      },
      {
        name: 'Hisar',
        latRange: [29.00, 29.35],
        lngRange: [75.60, 76.00],
        blocks: ['Hansi', 'Adampur', 'Barwala', 'Uklana'],
        criticalWeight: 0.35,
        soil: ['Arid Loamy Sand'],
        aquifer: ['Saline & Fresh Water Transition Zone'],
      },
    ],
  },
  {
    state: 'Tamil Nadu',
    targetCount: 510,
    districts: [
      {
        name: 'Thanjavur',
        latRange: [10.65, 10.95],
        lngRange: [79.05, 79.35],
        blocks: ['Kumbakonam', 'Papanasam', 'Pattukkottai', 'Orathanadu', 'Thiruvaiyaru'],
        criticalWeight: 0.15,
        soil: ['Cauvery Delta Alluvial Clay', 'Sandy Deltaic Alluvium'],
        aquifer: ['Tertiary Cuddalore Sandstone', 'Deltaic Silt/Sand'],
      },
      {
        name: 'Madurai',
        latRange: [9.80, 10.10],
        lngRange: [78.00, 78.30],
        blocks: ['Melur', 'Usilampatti', 'Vadipatti', 'Thirumangalam'],
        criticalWeight: 0.25,
        soil: ['Red Loam', 'Black Soil'],
        aquifer: ['Crystalline Charnockite & Gneiss'],
      },
      {
        name: 'Coimbatore',
        latRange: [10.85, 11.20],
        lngRange: [76.85, 77.15],
        blocks: ['Pollachi', 'Sulur', 'Mettupalayam', 'Annur'],
        criticalWeight: 0.35,
        soil: ['Red Gravelly Soil', 'Black Clay'],
        aquifer: ['Hard Rock Weathered Gneiss Layer'],
      },
      {
        name: 'Salem',
        latRange: [11.55, 11.85],
        lngRange: [78.05, 78.35],
        blocks: ['Attur', 'Mettur', 'Omalur', 'Sankari'],
        criticalWeight: 0.30,
        soil: ['Red Sandy Soil'],
        aquifer: ['Fissured Hard Rock System'],
      },
    ],
  },
  {
    state: 'Madhya Pradesh',
    targetCount: 490,
    districts: [
      {
        name: 'Narmadapuram',
        latRange: [22.65, 22.95],
        lngRange: [77.65, 78.05],
        blocks: ['Itarsi', 'Pipariya', 'Sohagpur', 'Babai', 'Seoni Malwa'],
        criticalWeight: 0.10,
        soil: ['Deep Black Alluvial Clay', 'Narmada Basin Loam'],
        aquifer: ['Narmada Alluvial Valley Sand/Gravel', 'Gondwana Sandstone'],
      },
      {
        name: 'Indore',
        latRange: [22.60, 22.90],
        lngRange: [75.75, 76.05],
        blocks: ['Mhow', 'Depalpur', 'Sanwer'],
        criticalWeight: 0.25,
        soil: ['Deep Black Cotton Soil'],
        aquifer: ['Malwa Plateau Basaltic Lava Flow'],
      },
      {
        name: 'Ujjain',
        latRange: [23.10, 23.40],
        lngRange: [75.65, 75.95],
        blocks: ['Nagda', 'Mahidpur', 'Badnagar', 'Tarana'],
        criticalWeight: 0.25,
        soil: ['Medium Black Clay Loam'],
        aquifer: ['Vesicular Jointed Basalt'],
      },
      {
        name: 'Bhopal',
        latRange: [23.15, 23.40],
        lngRange: [77.30, 77.55],
        blocks: ['Berasia', 'Phanda'],
        criticalWeight: 0.18,
        soil: ['Black Cotton Soil', 'Lateritic Red Silt'],
        aquifer: ['Vindhyan Sandstone & Basalt'],
      },
    ],
  },
  {
    state: 'Andhra Pradesh',
    targetCount: 350,
    districts: [
      {
        name: 'Anantapur',
        latRange: [14.55, 14.85],
        lngRange: [77.50, 77.80],
        blocks: ['Dharmavaram', 'Hindupur', 'Kadiri', 'Guntakal', 'Tadpatri'],
        criticalWeight: 0.45,
        soil: ['Red Gravelly Sandy Loam', 'Black Soil'],
        aquifer: ['Rayalaseema Crystalline Granite & Schist'],
      },
      {
        name: 'Kurnool',
        latRange: [15.65, 15.95],
        lngRange: [77.95, 78.20],
        blocks: ['Nandyal', 'Adoni', 'Yemmiganur', 'Dhone'],
        criticalWeight: 0.30,
        soil: ['Black Cotton Soil', 'Red Loamy Soil'],
        aquifer: ['Cuddapah Limestone & Quartzite'],
      },
      {
        name: 'Guntur',
        latRange: [16.20, 16.50],
        lngRange: [80.35, 80.60],
        blocks: ['Tenali', 'Narasaraopet', 'Bapatla', 'Sattenapalle'],
        criticalWeight: 0.15,
        soil: ['Krishna Delta Deep Alluvial Clay'],
        aquifer: ['Coastal Alluvium & Weathered Gneiss'],
      },
    ],
  },
  {
    state: 'Telangana',
    targetCount: 280,
    districts: [
      {
        name: 'Medak',
        latRange: [17.95, 18.25],
        lngRange: [78.15, 78.45],
        blocks: ['Sangareddy', 'Siddipet', 'Narsapur', 'Zahirabad', 'Gajwel'],
        criticalWeight: 0.30,
        soil: ['Red Chalkas (Sandy Loam)', 'Black Soil'],
        aquifer: ['Deccan Peninsular Granitic Gneiss'],
      },
      {
        name: 'Nalgonda',
        latRange: [16.95, 17.25],
        lngRange: [79.15, 79.45],
        blocks: ['Suryapet', 'Miryalaguda', 'Devarakonda', 'Kodad'],
        criticalWeight: 0.35,
        soil: ['Red Sandy Soil', 'Black Clay'],
        aquifer: ['Granite & Dolerite Dykes'],
      },
    ],
  },
  {
    state: 'Bihar',
    targetCount: 210,
    districts: [
      {
        name: 'Patna',
        latRange: [25.50, 25.75],
        lngRange: [85.05, 85.35],
        blocks: ['Danapur', 'Phulwari Sharif', 'Barh', 'Bikram', 'Masaurhi'],
        criticalWeight: 0.05,
        soil: ['Gangetic Deep Silt Loam', 'Clayey Alluvium'],
        aquifer: ['Middle Ganga Multi-aquifer Sand System'],
      },
      {
        name: 'Gaya',
        latRange: [24.65, 24.95],
        lngRange: [84.90, 85.15],
        blocks: ['Bodh Gaya', 'Sherghati', 'Tekari', 'Wazirganj'],
        criticalWeight: 0.18,
        soil: ['Sandy Loam', 'Rocky Red Soil'],
        aquifer: ['Falgu River Alluvium & Gneiss'],
      },
    ],
  },
  {
    state: 'West Bengal',
    targetCount: 180,
    districts: [
      {
        name: 'Burdwan',
        latRange: [23.15, 23.40],
        lngRange: [87.75, 88.05],
        blocks: ['Kalna', 'Katwa', 'Memari', 'Galsi', 'Bhatar'],
        criticalWeight: 0.08,
        soil: ['Damodar Alluvial Clay Silt', 'Red Laterite'],
        aquifer: ['Bengal Delta Multi-tier Deep Sand Aquifer'],
      },
      {
        name: 'Murshidabad',
        latRange: [24.05, 24.30],
        lngRange: [88.15, 88.40],
        blocks: ['Berhampore', 'Kandi', 'Jangipur', 'Lalgola'],
        criticalWeight: 0.06,
        soil: ['Ganga Alluvial Silt'],
        aquifer: ['High Permeability Sand System'],
      },
    ],
  },
];

let cachedStationDataset: DWLRStation[] | null = null;

/**
 * Deterministically generates all 5,260 DWLR stations across India.
 * Seed is constant so coordinates and readings are stable across renders.
 */
export function generate5260Stations(): DWLRStation[] {
  if (cachedStationDataset) {
    return cachedStationDataset;
  }

  const rng = createSeededRandom(42);
  const stations: DWLRStation[] = [...mockStations]; // Include hand-crafted anchor stations first
  const existingIds = new Set(mockStations.map((s) => s.id));

  // Determine state counts
  for (const config of STATE_CONFIGS) {
    const needed = config.targetCount;
    let createdForState = stations.filter((s) => s.state === config.state).length;

    while (createdForState < needed) {
      // Pick district cyclically or based on weight
      const districtIdx = Math.floor(rng() * config.districts.length);
      const dist = config.districts[districtIdx];
      const block = dist.blocks[Math.floor(rng() * dist.blocks.length)];
      const soil = dist.soil[Math.floor(rng() * dist.soil.length)];
      const aquifer = dist.aquifer[Math.floor(rng() * dist.aquifer.length)];

      // Deterministic coordinate within district bounds
      const lat = dist.latRange[0] + rng() * (dist.latRange[1] - dist.latRange[0]);
      const lng = dist.lngRange[0] + rng() * (dist.lngRange[1] - dist.lngRange[0]);

      // Status determination based on district critical weight
      const roll = rng();
      let status: StationStatus = 'healthy';
      let riskScore = 0.25;
      let trend: TrendDirection = 'stable';
      let trendRate = 0.05;
      let daysToCritical: number | null = null;
      let waterLevel = 8.5 + rng() * 12.0; // mbgl
      let criticalThreshold = waterLevel + 6.0 + rng() * 8.0;

      if (roll < dist.criticalWeight * 0.4) {
        status = 'critical';
        riskScore = 0.78 + rng() * 0.2;
        trend = 'falling';
        trendRate = -(0.2 + rng() * 0.18);
        waterLevel = 22.0 + rng() * 26.0;
        criticalThreshold = waterLevel + 1.5 + rng() * 3.0;
        daysToCritical = Math.round(15 + rng() * 45);
      } else if (roll < dist.criticalWeight * 0.8) {
        status = 'warning';
        riskScore = 0.55 + rng() * 0.22;
        trend = rng() > 0.3 ? 'falling' : 'stable';
        trendRate = -(0.1 + rng() * 0.12);
        waterLevel = 16.0 + rng() * 18.0;
        criticalThreshold = waterLevel + 4.0 + rng() * 5.0;
        daysToCritical = Math.round(45 + rng() * 90);
      } else if (roll < dist.criticalWeight + 0.35) {
        status = 'moderate';
        riskScore = 0.35 + rng() * 0.18;
        trend = rng() > 0.5 ? 'stable' : rng() > 0.25 ? 'falling' : 'rising';
        trendRate = (rng() - 0.5) * 0.1;
        waterLevel = 11.0 + rng() * 12.0;
        criticalThreshold = waterLevel + 8.0 + rng() * 8.0;
        daysToCritical = null;
      } else {
        status = 'healthy';
        riskScore = 0.15 + rng() * 0.18;
        trend = rng() > 0.4 ? 'rising' : 'stable';
        trendRate = 0.05 + rng() * 0.15;
        waterLevel = 4.5 + rng() * 9.5;
        criticalThreshold = waterLevel + 12.0 + rng() * 10.0;
        daysToCritical = null;
      }

      const seqNumber = stations.length + 1;
      const stateCode = config.state.substring(0, 2).toUpperCase();
      const distCode = dist.name.substring(0, 3).toUpperCase();
      const stationId = `DWLR-${stateCode}-${String(seqNumber).padStart(4, '0')}`;

      if (!existingIds.has(stationId)) {
        existingIds.add(stationId);

        const minutesAgo = Math.round(5 + rng() * 55);
        const stationCode = `${stateCode}-${distCode}-${String(createdForState + 1).padStart(3, '0')}`;
        const battery = Math.round(82 + rng() * 18);

        let farmerSummary = '';
        let actionableAdvice = '';

        if (status === 'critical') {
          farmerSummary = `Water table is critically depleted at ${waterLevel.toFixed(1)}m depth. Extraction heavily outpaces recharge.`;
          actionableAdvice = 'Prioritize drought-resilient crops (millets/pulses). Avoid flood irrigation; deploy drip/sprinklers.';
        } else if (status === 'warning') {
          farmerSummary = `Water level is steadily declining at ${(Math.abs(trendRate) * 100).toFixed(0)}cm/month in this block.`;
          actionableAdvice = 'Schedule irrigation during evening or early morning. Consider micro-irrigation subsidies.';
        } else if (status === 'moderate') {
          farmerSummary = `Aquifer conditions are stable with manageable seasonal drawdown.`;
          actionableAdvice = 'Maintain balanced water use. Good conditions for standard kharif/rabi rotations.';
        } else {
          farmerSummary = `Water table is healthy and shallow at ${waterLevel.toFixed(1)}m depth with active recharge.`;
          actionableAdvice = 'Favorable soil moisture for diversified cropping. Practice recharge maintenance.';
        }

        stations.push({
          id: stationId,
          stationCode,
          stationName: `${dist.name} ${block} DWLR Node #${createdForState + 1}`,
          state: config.state,
          district: dist.name,
          block,
          latitude: Math.round(lat * 10000) / 10000,
          longitude: Math.round(lng * 10000) / 10000,
          waterLevel: Math.round(waterLevel * 10) / 10,
          previousWaterLevel: Math.round((waterLevel - trendRate) * 10) / 10,
          seasonalAverage: Math.round((waterLevel * 0.95) * 10) / 10,
          criticalThreshold: Math.round(criticalThreshold * 10) / 10,
          riskScore: Math.round(riskScore * 100) / 100,
          status,
          trend,
          trendRateMetersPerMonth: Math.round(trendRate * 100) / 100,
          daysToCritical,
          batteryLevel: battery,
          telemetryStatus: 'online',
          lastUpdated: `${minutesAgo} mins ago`,
          soilType: soil,
          aquiferType: aquifer,
          farmerSummary,
          actionableAdvice,
        });

        createdForState++;
      }
    }
  }

  // If we are slightly under 5,260, fill the remainder across existing states
  const totalTarget = 5260;
  while (stations.length < totalTarget) {
    const config = STATE_CONFIGS[Math.floor(rng() * STATE_CONFIGS.length)];
    const dist = config.districts[Math.floor(rng() * config.districts.length)];
    const lat = dist.latRange[0] + rng() * (dist.latRange[1] - dist.latRange[0]);
    const lng = dist.lngRange[0] + rng() * (dist.lngRange[1] - dist.lngRange[0]);
    const seq = stations.length + 1;
    const stateCode = config.state.substring(0, 2).toUpperCase();

    stations.push({
      id: `DWLR-${stateCode}-${String(seq).padStart(4, '0')}`,
      stationCode: `${stateCode}-${dist.name.substring(0, 3).toUpperCase()}-${String(seq % 1000).padStart(3, '0')}`,
      stationName: `${dist.name} Regional Node #${seq % 500}`,
      state: config.state,
      district: dist.name,
      block: dist.blocks[0],
      latitude: Math.round(lat * 10000) / 10000,
      longitude: Math.round(lng * 10000) / 10000,
      waterLevel: Math.round((10 + rng() * 15) * 10) / 10,
      previousWaterLevel: 12.5,
      seasonalAverage: 11.8,
      criticalThreshold: 25.0,
      riskScore: 0.35,
      status: 'moderate',
      trend: 'stable',
      trendRateMetersPerMonth: 0.02,
      daysToCritical: null,
      batteryLevel: 91,
      telemetryStatus: 'online',
      lastUpdated: '12 mins ago',
      soilType: dist.soil[0],
      aquiferType: dist.aquifer[0],
      farmerSummary: 'Groundwater table is stable.',
      actionableAdvice: 'Standard seasonal irrigation.',
    });
  }

  cachedStationDataset = stations.slice(0, 5260);
  return cachedStationDataset;
}
