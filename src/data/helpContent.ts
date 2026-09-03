export interface FAQItem {
  id: string;
  category: 'General' | 'DWLR & Telemetry' | 'Forecasting' | 'Anomalies' | 'Crop Advisor' | 'Data & Telemetry';
  question: string;
  answer: string;
  farmerTakeaway?: string;
}

export interface FarmerWorkflowStep {
  step: number;
  title: string;
  description: string;
  iconName: string;
  ctaLabel: string;
  ctaPath: string;
}

export interface DataSourceReference {
  name: string;
  organization: string;
  description: string;
  url?: string;
  type: 'Reference Standard' | 'Public Telemetry Portal' | 'Research Dataset';
}

export const FAQ_DATA: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'General',
    question: '1. What is JalKrishi AI?',
    answer:
      'JalKrishi AI is a groundwater intelligence and agro-hydrology decision-support platform. It turns telemetry data from Digital Water Level Recorders (DWLR) into real-time monitoring, multi-horizon forecasting, automated anomaly detection, and groundwater-smart crop recommendations.',
    farmerTakeaway: 'It helps you know your local water depth before you sow so your tube-wells do not run dry midway through the crop cycle.',
  },
  {
    id: 'faq-2',
    category: 'DWLR & Telemetry',
    question: '2. What is a DWLR (Digital Water Level Recorder)?',
    answer:
      'A Digital Water Level Recorder (DWLR) is an automated hydrostatic pressure transducer installed inside a piezometric monitoring well. It measures the water column height above the sensor at scheduled intervals (e.g. every 6 hours) and transmits readings via cellular GSM/GPRS telemetry to central data servers.',
    farmerTakeaway: 'It is a digital sensor in a government well that measures how deep the water is without manual rope dipping.',
  },
  {
    id: 'faq-3',
    category: 'DWLR & Telemetry',
    question: '3. What does groundwater level (depth in mbgl) mean?',
    answer:
      'Groundwater depth is measured in meters below ground level (mbgl). A higher number means the water table is deeper under the ground surface (i.e. less water is available), whereas a lower number means the water table is closer to the surface (i.e. shallow and abundant).',
    farmerTakeaway: '10 mbgl means water is 10 meters down (good). 35 mbgl means water is very deep and hard to pump.',
  },
  {
    id: 'faq-4',
    category: 'DWLR & Telemetry',
    question: '4. What do Healthy, Moderate, Warning, and Critical status levels mean?',
    answer:
      '• Healthy (🟢): Water table is shallow (<15 mbgl) with stable recharge.\n• Moderate (🟡): Standard seasonal depth (15–22 mbgl) requiring routine water monitoring.\n• Warning (🟠): Significant seasonal drawdown (22–28 mbgl) with falling trajectory.\n• Critical (🔴): Severe aquifer depletion (>28 mbgl or <30 days to critical pump cutoff limit).',
    farmerTakeaway: 'Green means safe to irrigate; Red means acute water stress where heavy water crops like flooded paddy will fail.',
  },
  {
    id: 'faq-5',
    category: 'Forecasting',
    question: '5. What is "Days-to-Critical"?',
    answer:
      'The "Days-to-Critical" indicator estimates the number of days remaining before the local water table drops below the critical depth threshold at current extraction velocities. It is calculated by dividing remaining head by the net daily drawdown velocity, factoring in seasonal rainfall infiltration.',
    farmerTakeaway: 'If it shows "42 days", it means tube-wells in your block could run out of pumping water in about 6 weeks without rain or reduced pumping.',
  },
  {
    id: 'faq-6',
    category: 'Forecasting',
    question: '6. How are groundwater forecasts generated?',
    answer:
      'Forecasts are generated using hydrogeological time-series models that integrate historical seasonal drawdowns, 30-day precipitation forecasts from IMD models, and recharge lag factors. Projections include confidence envelopes (upper/lower uncertainty bounds).',
    farmerTakeaway: 'Forecasts combine your past water history with expected weather to project where water levels will be over 7, 30, 60, and 90 days.',
  },
  {
    id: 'faq-7',
    category: 'Anomalies',
    question: '7. What is an anomaly in groundwater telemetry?',
    answer:
      'An anomaly is a sudden statistical deviation (Z-score > 2.5) where the observed sensor reading differs sharply from historical baselines or physical aquifer recharge constraints.',
    farmerTakeaway: 'An unexpected spike or sudden drop that doesn’t match normal daily water movement.',
  },
  {
    id: 'faq-8',
    category: 'Anomalies',
    question: '8. What is "Possible Abnormal Extraction"?',
    answer:
      'Possible abnormal extraction is flagged when an observation well records multi-day continuous drawdown with zero diurnal recovery at night. This pattern typically corresponds to heavy localized tube-well pumping clusters.',
    farmerTakeaway: 'Continuous pumping in the area that is pulling down the water table faster than normal without letting the well recover overnight.',
  },
  {
    id: 'faq-9',
    category: 'Anomalies',
    question: '9. Does an anomaly flag mean something is definitely wrong or broken?',
    answer:
      'No. An anomaly flag is a decision-support alert indicating "Requires Verification". It could represent an extreme local pumping event, sudden canal recharge, or a transducer telemetry glitch. It prompts verification rather than confirming failure.',
    farmerTakeaway: 'It means the system noticed something unusual that should be checked before making major decisions.',
  },
  {
    id: 'faq-10',
    category: 'Crop Advisor',
    question: '10. How does the Crop Advisor work?',
    answer:
      'The Crop Advisor scores crop suitability using a multi-factor weighting model: Soil Compatibility (25%), Water Availability Match (25%), Cropping Season (15%), Expected Rainfall (15%), and Groundwater Level & Depletion Trend (20%).',
    farmerTakeaway: 'It looks at your soil, season, and how much water is under your ground to recommend crops that will produce good yield without drying up your well.',
  },
  {
    id: 'faq-11',
    category: 'Crop Advisor',
    question: '11. Why is a particular crop (like sugarcane or puddled paddy) not recommended?',
    answer:
      'Crops requiring continuous flood irrigation (such as puddled paddy at 1,400mm or sugarcane at 2,200mm) receive sharp penalty scores in water-stressed blocks because their high extraction rates risk pump cavitation and crop failure before harvest.',
    farmerTakeaway: 'High-water crops are not recommended in stressed blocks because your tube-well could stop pumping before the crop is mature.',
  },
  {
    id: 'faq-12',
    category: 'Data & Telemetry',
    question: '12. Is the current data live government data or simulated?',
    answer:
      'The current platform interface uses 5,260 deterministic simulated DWLR stations across 28 Indian states to evaluate complete architectural workflows (map clustering, forecasting, anomaly triage, crop advisory, and PDF/XLSX export).',
    farmerTakeaway: 'The app shows realistic simulation data representing 5,260 monitoring stations across India.',
  },
  {
    id: 'faq-13',
    category: 'General',
    question: '13. Can I find my nearest DWLR station?',
    answer:
      'Yes. On both the Interactive Map (/map) and Crop Advisor (/crops), you can click "Use My Location" to automatically identify the nearest monitoring well using browser GPS and Haversine distance calculation.',
    farmerTakeaway: 'Click "Use My Location" on the map or crop page to find your closest groundwater monitoring well instantly.',
  },
  {
    id: 'faq-14',
    category: 'Data & Telemetry',
    question: '14. Can I download analytics reports for my district or state?',
    answer:
      'Yes. On the Regional Analytics page (/analytics), you can export multi-sheet Excel (.xlsx) workbooks or structured printable PDF reports reflecting your active state, district, status, and timeframe filters.',
    farmerTakeaway: 'Go to Regional Analytics to download complete Excel sheets or PDF summary reports for your state or district.',
  },
  {
    id: 'faq-15',
    category: 'General',
    question: '15. How can I provide feedback or report a data discrepancy?',
    answer:
      'Use the Feedback & Report Data Issue forms at the bottom of this Help page. You can submit suggestions, report sensor inaccuracies, or request new observation wells.',
    farmerTakeaway: 'Scroll down to the feedback form to send suggestions or report an issue with a monitoring well.',
  },
];

export const FARMER_WORKFLOW_STEPS: FarmerWorkflowStep[] = [
  {
    step: 1,
    title: 'Find Your Farm Location',
    description: 'Use the interactive India map or GPS auto-detect to locate your nearest DWLR monitoring well.',
    iconName: 'MapPin',
    ctaLabel: 'Open Groundwater Map',
    ctaPath: '/map',
  },
  {
    step: 2,
    title: 'Check Water Table Depth',
    description: 'See whether your local aquifer status is Healthy, Moderate, Warning, or Critical.',
    iconName: 'Droplets',
    ctaLabel: 'Check Water Dashboard',
    ctaPath: '/',
  },
  {
    step: 3,
    title: 'Inspect Future Drawdown',
    description: 'View 30-day and 90-day forecast curves and check your block’s Days-to-Critical countdown.',
    iconName: 'TrendingDown',
    ctaLabel: 'View Forecast Center',
    ctaPath: '/forecast',
  },
  {
    step: 4,
    title: 'Verify Unusual Pumping Spikes',
    description: 'Check active anomaly alerts to see if heavy neighborhood extraction is dropping local water tables.',
    iconName: 'AlertTriangle',
    ctaLabel: 'View Groundwater Alerts',
    ctaPath: '/anomalies',
  },
  {
    step: 5,
    title: 'Generate Water-Smart Crop Plan',
    description: 'Get tailored Top 3 Recommended Crops matched to your soil type, season, and available groundwater.',
    iconName: 'Sprout',
    ctaLabel: 'Open Smart Crop Advisor',
    ctaPath: '/crops',
  },
  {
    step: 6,
    title: 'Download Regional Reports',
    description: 'Export PDF summaries or Excel sheets to share with village panchayats and water user associations.',
    iconName: 'Download',
    ctaLabel: 'Open Regional Analytics',
    ctaPath: '/analytics',
  },
];

export const DATA_SOURCE_REFERENCES: DataSourceReference[] = [
  {
    name: 'India-WRIS (Water Resources Information System)',
    organization: 'Ministry of Jal Shakti, Government of India',
    description: 'National centralized repository for hydrological data, telemetric DWLR sensor observations, and river basin telemetry.',
    url: 'https://indiawris.gov.in/',
    type: 'Public Telemetry Portal',
  },
  {
    name: 'Central Ground Water Board (CGWB)',
    organization: 'Department of Water Resources, RD & GR',
    description: 'Groundwater monitoring network guidelines, piezometer lithological profiles, aquifer mapping (NAQUIM), and recharge assessments.',
    url: 'http://cgwb.gov.in/',
    type: 'Reference Standard',
  },
  {
    name: 'DWLR Telemetry Sensor Benchmark Dataset',
    organization: 'Kaggle Public Open Datasets & Hydrogeological Repositories',
    description: 'Reference DWLR sensor time-series datasets used for modeling transducer signal noise, diurnal extraction cycles, and Z-score anomaly baselines.',
    url: 'https://www.kaggle.com/',
    type: 'Research Dataset',
  },
];
