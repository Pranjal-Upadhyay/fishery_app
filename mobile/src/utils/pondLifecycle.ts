/**
 * Pond Lifecycle & Species Intelligence
 *
 * Covers culture periods, water quality targets, and feeding guides
 * for every cultivable species in the app — differentiated by farming system.
 *
 * Sources: ICAR-CIFA, Bihar Fisheries Dept, MPEDA, research.pdf
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type FarmingSystem = 'EARTHEN' | 'BIOFLOC' | 'RAS' | 'CAGES' | 'PENS';

export type CultureProfile = {
  /** Common display name */
  label: string;
  /** Culture period in days for this system */
  days: number;
  /** Minimum harvest weight in grams */
  harvestWeightGMin: number;
  /** Maximum harvest weight in grams */
  harvestWeightGMax: number;
  /** Crops possible per year */
  cropsPerYear: number;
  /** Brief note shown to farmer */
  note: string;
};

export type WaterQualityTargets = {
  tempMin: number;
  tempMax: number;
  tempOptMin: number;
  tempOptMax: number;
  doMin: number;       // mg/L — minimum safe
  doOpt: number;       // mg/L — optimal
  phMin: number;
  phMax: number;
  phOpt: number;
  ammoniaMax: number;  // mg/L — danger threshold
  /** Warning shown when temp drops below this (cold-sensitive species) */
  coldWarningBelow?: number;
  /** Warning shown when temp rises above this (heat-sensitive species) */
  heatWarningAbove?: number;
};

export type FeedingGuide = {
  feedType: string;
  proteinPercent: string;
  /** Body weight % per day — early stage (fingerling) */
  bwPercentEarly: string;
  /** Body weight % per day — grow-out stage */
  bwPercentGrowOut: string;
  /** Times per day */
  frequencyPerDay: number;
  /** Best feeding times */
  feedingTimes: string[];
  /** Key tips */
  tips: string[];
};

export type SpeciesProfile = {
  scientificName: string;
  commonName: string;
  localName: string;
  category: string;
  /** Culture periods keyed by system type */
  culturePeriods: Partial<Record<FarmingSystem, CultureProfile>>;
  /** Default system if pond system not specified */
  defaultSystem: FarmingSystem;
  waterQuality: WaterQualityTargets;
  feeding: FeedingGuide;
  /** Weekly growth stage milestones: day → milestone label */
  milestones: Array<{ dayFrom: number; dayTo: number; stage: string; action: string }>;
};

// ─── Species Database ─────────────────────────────────────────────────────────

export const SPECIES_PROFILES: Record<string, SpeciesProfile> = {

  // ── ROHU ──────────────────────────────────────────────────────────────────
  'Labeo rohita': {
    scientificName: 'Labeo rohita',
    commonName: 'Rohu',
    localName: 'रोहू',
    category: 'INDIAN_MAJOR_CARP',
    defaultSystem: 'EARTHEN',
    culturePeriods: {
      EARTHEN: { label: 'Rohu', days: 300, harvestWeightGMin: 800, harvestWeightGMax: 1200, cropsPerYear: 1, note: 'Harvest at 800g–1.2kg. Polyculture with Catla and Mrigal.' },
      CAGES:   { label: 'Rohu', days: 240, harvestWeightGMin: 700, harvestWeightGMax: 1000, cropsPerYear: 1, note: 'Cage culture in reservoirs. Harvest at 700g–1kg.' },
    },
    waterQuality: { tempMin: 20, tempMax: 38, tempOptMin: 25, tempOptMax: 32, doMin: 4, doOpt: 6, phMin: 7.0, phMax: 8.5, phOpt: 7.5, ammoniaMax: 0.5, coldWarningBelow: 20, heatWarningAbove: 36 },
    feeding: {
      feedType: 'Floating pellets or rice bran + mustard cake mix',
      proteinPercent: '28–32%',
      bwPercentEarly: '5–8%',
      bwPercentGrowOut: '2–3%',
      frequencyPerDay: 2,
      feedingTimes: ['7:00 AM', '4:00 PM'],
      tips: ['Feed at fixed spots using feeding trays', 'Reduce feed by 50% when DO < 5 mg/L', 'Stop feeding when water temp < 20°C', 'Use floating pellets to monitor feed consumption'],
    },
    milestones: [
      { dayFrom: 0,   dayTo: 30,  stage: 'Fingerling Establishment', action: 'Check for stress, monitor DO daily, feed 5–8% BW twice daily' },
      { dayFrom: 30,  dayTo: 90,  stage: 'Early Grow-out',           action: 'Increase feed gradually, apply lime if pH < 7, check for parasites' },
      { dayFrom: 90,  dayTo: 180, stage: 'Mid Grow-out',             action: 'Reduce feed to 2–3% BW, check weight monthly, maintain DO > 5' },
      { dayFrom: 180, dayTo: 270, stage: 'Late Grow-out',            action: 'Pre-harvest weight check, reduce feed 2 weeks before harvest' },
      { dayFrom: 270, dayTo: 300, stage: 'Harvest Window',           action: 'Harvest when fish reach 800g+. Drain pond partially, use seine net' },
    ],
  },

  // ── CATLA ─────────────────────────────────────────────────────────────────
  'Catla catla': {
    scientificName: 'Catla catla',
    commonName: 'Catla',
    localName: 'कतला / भाकुर',
    category: 'INDIAN_MAJOR_CARP',
    defaultSystem: 'EARTHEN',
    culturePeriods: {
      EARTHEN: { label: 'Catla', days: 300, harvestWeightGMin: 1000, harvestWeightGMax: 1500, cropsPerYear: 1, note: 'Surface feeder. Harvest at 1–1.5kg. Polyculture essential.' },
      CAGES:   { label: 'Catla', days: 240, harvestWeightGMin: 800,  harvestWeightGMax: 1200, cropsPerYear: 1, note: 'Cage culture. Harvest at 800g–1.2kg.' },
    },
    waterQuality: { tempMin: 20, tempMax: 35, tempOptMin: 25, tempOptMax: 32, doMin: 5, doOpt: 7, phMin: 6.5, phMax: 8.5, phOpt: 7.5, ammoniaMax: 0.5, coldWarningBelow: 20 },
    feeding: {
      feedType: 'Floating pellets — surface feeder, do not use sinking feed',
      proteinPercent: '28–32%',
      bwPercentEarly: '5–7%',
      bwPercentGrowOut: '2–3%',
      frequencyPerDay: 2,
      feedingTimes: ['7:00 AM', '4:00 PM'],
      tips: ['Catla feeds at surface — use floating pellets only', 'Maintain plankton bloom for natural food', 'Reduce feed on cloudy days (low DO risk)', 'Do not overstock — Catla competes with Silver Carp'],
    },
    milestones: [
      { dayFrom: 0,   dayTo: 30,  stage: 'Fingerling Establishment', action: 'Monitor surface feeding behavior, check plankton bloom' },
      { dayFrom: 30,  dayTo: 120, stage: 'Early Grow-out',           action: 'Maintain plankton, feed 5% BW twice daily' },
      { dayFrom: 120, dayTo: 240, stage: 'Mid Grow-out',             action: 'Monthly weight check, reduce feed to 2–3% BW' },
      { dayFrom: 240, dayTo: 300, stage: 'Harvest Window',           action: 'Harvest at 1kg+. Partial harvest possible at 800g' },
    ],
  },

  // ── MRIGAL ────────────────────────────────────────────────────────────────
  'Cirrhinus mrigala': {
    scientificName: 'Cirrhinus mrigala',
    commonName: 'Mrigal',
    localName: 'मृगल / नैन',
    category: 'INDIAN_MAJOR_CARP',
    defaultSystem: 'EARTHEN',
    culturePeriods: {
      EARTHEN: { label: 'Mrigal', days: 300, harvestWeightGMin: 700, harvestWeightGMax: 1000, cropsPerYear: 1, note: 'Bottom feeder. Harvest at 700g–1kg. Essential in polyculture.' },
    },
    waterQuality: { tempMin: 18, tempMax: 38, tempOptMin: 22, tempOptMax: 32, doMin: 4, doOpt: 6, phMin: 6.5, phMax: 8.5, phOpt: 7.5, ammoniaMax: 0.5, coldWarningBelow: 18 },
    feeding: {
      feedType: 'Sinking pellets or rice bran + groundnut cake',
      proteinPercent: '25–30%',
      bwPercentEarly: '5–7%',
      bwPercentGrowOut: '2–3%',
      frequencyPerDay: 2,
      feedingTimes: ['7:00 AM', '4:00 PM'],
      tips: ['Mrigal feeds at bottom — use sinking pellets', 'Cleans pond bottom, reducing sludge buildup', 'Most salinity-tolerant of the 3 major carps', 'Reduce feed when pond bottom has excess sludge'],
    },
    milestones: [
      { dayFrom: 0,   dayTo: 60,  stage: 'Fingerling Establishment', action: 'Check bottom feeding activity, apply lime to pond floor' },
      { dayFrom: 60,  dayTo: 180, stage: 'Grow-out',                 action: 'Monthly weight check, maintain pond bottom hygiene' },
      { dayFrom: 180, dayTo: 300, stage: 'Harvest Window',           action: 'Harvest at 700g+. Drain pond and use seine net' },
    ],
  },

  // ── PANGASIUS ─────────────────────────────────────────────────────────────
  'Pangasianodon hypophthalmus': {
    scientificName: 'Pangasianodon hypophthalmus',
    commonName: 'Pangasius / Basa',
    localName: 'पंगास / बासा',
    category: 'CATFISH',
    defaultSystem: 'EARTHEN',
    culturePeriods: {
      EARTHEN: { label: 'Pangasius', days: 210, harvestWeightGMin: 800,  harvestWeightGMax: 1200, cropsPerYear: 1, note: 'Harvest before October. Cold below 15°C causes distress.' },
      BIOFLOC: { label: 'Pangasius', days: 180, harvestWeightGMin: 500,  harvestWeightGMax: 700,  cropsPerYear: 2, note: 'Biofloc: 1,350 fish/tank, harvest at 500g in 6 months.' },
      RAS:     { label: 'Pangasius', days: 180, harvestWeightGMin: 400,  harvestWeightGMax: 500,  cropsPerYear: 2, note: 'RAS: 4,500 fish/unit, harvest at 450g in 6 months.' },
      CAGES:   { label: 'Pangasius', days: 180, harvestWeightGMin: 800,  harvestWeightGMax: 1000, cropsPerYear: 2, note: 'Cage culture in reservoirs. Very popular in UP.' },
    },
    waterQuality: { tempMin: 15, tempMax: 35, tempOptMin: 26, tempOptMax: 30, doMin: 3, doOpt: 6, phMin: 6.5, phMax: 7.5, phOpt: 7.0, ammoniaMax: 0.5, coldWarningBelow: 20, heatWarningAbove: 34 },
    feeding: {
      feedType: 'Floating pellets ONLY — never wet or soaked feed',
      proteinPercent: '28–32% (fingerling), 24–28% (grow-out)',
      bwPercentEarly: '5–7%',
      bwPercentGrowOut: '1–5%',
      frequencyPerDay: 4,
      feedingTimes: ['7:00 AM', '11:00 AM', '3:00 PM', '6:00 PM'],
      tips: ['NEVER use wet or soaked feed — causes gut disease', 'Feed 4–5 times daily for best FCR', 'Harvest before October — cold kills Pangasius', 'Pangasius eats biofloc — reduces feed cost in Biofloc system', 'Stop feeding when water temp < 20°C'],
    },
    milestones: [
      { dayFrom: 0,   dayTo: 30,  stage: 'Fingerling Establishment', action: 'Acclimatize fingerlings slowly. Feed 5–7% BW 4x daily. Check for Red Spot disease.' },
      { dayFrom: 30,  dayTo: 90,  stage: 'Early Grow-out',           action: 'Increase feed, monitor ammonia daily in Biofloc/RAS. Check floc volume (15–20 ml/L).' },
      { dayFrom: 90,  dayTo: 150, stage: 'Mid Grow-out',             action: 'Reduce feed to 2–3% BW. Monthly weight check. Watch for Bacillary Necrosis in cold weather.' },
      { dayFrom: 150, dayTo: 180, stage: 'Pre-Harvest',              action: 'Stop feeding 2 days before harvest. Harvest before October to avoid cold stress.' },
    ],
  },

  // ── TILAPIA ───────────────────────────────────────────────────────────────
  'Oreochromis niloticus': {
    scientificName: 'Oreochromis niloticus',
    commonName: 'GIFT Tilapia',
    localName: 'तिलापिया',
    category: 'CICHLID',
    defaultSystem: 'BIOFLOC',
    culturePeriods: {
      EARTHEN: { label: 'Tilapia', days: 180, harvestWeightGMin: 400, harvestWeightGMax: 600, cropsPerYear: 2, note: 'Use monosex (all-male) seed only to prevent breeding.' },
      BIOFLOC: { label: 'Tilapia', days: 150, harvestWeightGMin: 400, harvestWeightGMax: 600, cropsPerYear: 2, note: 'Biofloc ideal for Tilapia — eats floc, low feed cost.' },
      RAS:     { label: 'Tilapia', days: 150, harvestWeightGMin: 400, harvestWeightGMax: 600, cropsPerYear: 2, note: 'RAS: 4,500 fish/unit. Harvest at 450g in 5–6 months.' },
    },
    waterQuality: { tempMin: 20, tempMax: 38, tempOptMin: 25, tempOptMax: 32, doMin: 3, doOpt: 6, phMin: 6.5, phMax: 8.5, phOpt: 7.5, ammoniaMax: 0.5, coldWarningBelow: 20 },
    feeding: {
      feedType: 'Floating pellets — Tilapia also eats biofloc and algae',
      proteinPercent: '28–32% (fingerling), 24–28% (grow-out)',
      bwPercentEarly: '5–8%',
      bwPercentGrowOut: '2–4%',
      frequencyPerDay: 3,
      feedingTimes: ['7:00 AM', '12:00 PM', '5:00 PM'],
      tips: ['Use ONLY monosex (all-male) seed — mixed sex causes uncontrolled breeding', 'Tilapia thrives in Biofloc — reduces feed cost by 30%', 'Hardy species — tolerates low DO better than carps', 'Reduce feed when water temp < 22°C'],
    },
    milestones: [
      { dayFrom: 0,   dayTo: 30,  stage: 'Fingerling Establishment', action: 'Verify monosex seed. Feed 5–8% BW 3x daily. Establish biofloc if applicable.' },
      { dayFrom: 30,  dayTo: 90,  stage: 'Early Grow-out',           action: 'Maintain floc volume 15–20 ml/L. Monthly weight check.' },
      { dayFrom: 90,  dayTo: 150, stage: 'Harvest Window',           action: 'Harvest at 400g+. Partial harvest possible. Restock immediately for 2nd crop.' },
    ],
  },

  // ── MAGUR (Desi Catfish) ──────────────────────────────────────────────────
  'Clarias magur': {
    scientificName: 'Clarias magur',
    commonName: 'Desi Magur',
    localName: 'देशी मगुर',
    category: 'CATFISH',
    defaultSystem: 'BIOFLOC',
    culturePeriods: {
      EARTHEN: { label: 'Magur', days: 180, harvestWeightGMin: 200, harvestWeightGMax: 400, cropsPerYear: 2, note: 'High-value air-breathing catfish. Harvest at 200–400g.' },
      BIOFLOC: { label: 'Magur', days: 150, harvestWeightGMin: 200, harvestWeightGMax: 300, cropsPerYear: 2, note: 'Biofloc: 4,500 fish/tank, harvest at 250g in 5 months.' },
    },
    waterQuality: { tempMin: 18, tempMax: 35, tempOptMin: 24, tempOptMax: 30, doMin: 2, doOpt: 5, phMin: 6.5, phMax: 8.0, phOpt: 7.0, ammoniaMax: 0.5, coldWarningBelow: 18 },
    feeding: {
      feedType: 'Sinking pellets or trash fish + rice bran mix',
      proteinPercent: '35–40%',
      bwPercentEarly: '5–8%',
      bwPercentGrowOut: '3–5%',
      frequencyPerDay: 2,
      feedingTimes: ['6:00 AM', '6:00 PM'],
      tips: ['Air-breathing — can survive in low-DO water', 'Feed in evening — Magur is nocturnal', 'High protein feed (35%+) needed for good growth', 'Banned in some states — verify local regulations', 'Integrates well with makhana ponds in North Bihar'],
    },
    milestones: [
      { dayFrom: 0,   dayTo: 30,  stage: 'Fingerling Establishment', action: 'Ensure tank has hiding spots. Feed high-protein pellets 2x daily.' },
      { dayFrom: 30,  dayTo: 90,  stage: 'Grow-out',                 action: 'Monthly weight check. Maintain 24/7 aeration in Biofloc.' },
      { dayFrom: 90,  dayTo: 150, stage: 'Harvest Window',           action: 'Harvest at 200g+. Premium price in local markets.' },
    ],
  },

  // ── SINGHI ────────────────────────────────────────────────────────────────
  'Heteropneustes fossilis': {
    scientificName: 'Heteropneustes fossilis',
    commonName: 'Singhi / Stinging Catfish',
    localName: 'सिंघी',
    category: 'CATFISH',
    defaultSystem: 'BIOFLOC',
    culturePeriods: {
      EARTHEN: { label: 'Singhi', days: 180, harvestWeightGMin: 150, harvestWeightGMax: 300, cropsPerYear: 2, note: 'High medicinal value. Harvest at 150–300g.' },
      BIOFLOC: { label: 'Singhi', days: 150, harvestWeightGMin: 150, harvestWeightGMax: 250, cropsPerYear: 2, note: 'Biofloc: 4,500 fish/tank, harvest at 200g in 5 months.' },
    },
    waterQuality: { tempMin: 18, tempMax: 35, tempOptMin: 24, tempOptMax: 30, doMin: 2, doOpt: 5, phMin: 6.5, phMax: 8.0, phOpt: 7.0, ammoniaMax: 0.5, coldWarningBelow: 18 },
    feeding: {
      feedType: 'Sinking pellets — high protein',
      proteinPercent: '35–40%',
      bwPercentEarly: '5–8%',
      bwPercentGrowOut: '3–5%',
      frequencyPerDay: 2,
      feedingTimes: ['6:00 AM', '6:00 PM'],
      tips: ['Handle with care — pectoral spine causes painful sting', 'Air-breathing — tolerates low DO', 'Very high demand in Bihar/Bengal for medicinal use', 'Feed in evening — nocturnal feeder'],
    },
    milestones: [
      { dayFrom: 0,   dayTo: 30,  stage: 'Fingerling Establishment', action: 'Handle carefully. Feed high-protein sinking pellets 2x daily.' },
      { dayFrom: 30,  dayTo: 120, stage: 'Grow-out',                 action: 'Monthly weight check. Maintain water quality.' },
      { dayFrom: 120, dayTo: 150, stage: 'Harvest Window',           action: 'Harvest at 150g+. Use thick gloves — spine is sharp.' },
    ],
  },

  // ── PABDA ─────────────────────────────────────────────────────────────────
  'Ompok pabda': {
    scientificName: 'Ompok pabda',
    commonName: 'Pabda / Butter Catfish',
    localName: 'पाबदा',
    category: 'CATFISH',
    defaultSystem: 'EARTHEN',
    culturePeriods: {
      EARTHEN: { label: 'Pabda', days: 180, harvestWeightGMin: 40,  harvestWeightGMax: 100, cropsPerYear: 2, note: 'High-value small catfish. Harvest at 40–100g.' },
      BIOFLOC: { label: 'Pabda', days: 150, harvestWeightGMin: 40,  harvestWeightGMax: 80,  cropsPerYear: 2, note: 'Biofloc suitable. Harvest at 40–80g.' },
      RAS:     { label: 'Pabda', days: 180, harvestWeightGMin: 50,  harvestWeightGMax: 100, cropsPerYear: 2, note: 'RAS: intensive culture possible. Harvest at 50–100g.' },
    },
    waterQuality: { tempMin: 18, tempMax: 32, tempOptMin: 22, tempOptMax: 28, doMin: 3, doOpt: 6, phMin: 6.5, phMax: 8.0, phOpt: 7.0, ammoniaMax: 0.5, coldWarningBelow: 18 },
    feeding: {
      feedType: 'Sinking pellets — small particle size (2mm)',
      proteinPercent: '35–40%',
      bwPercentEarly: '5–8%',
      bwPercentGrowOut: '3–5%',
      frequencyPerDay: 3,
      feedingTimes: ['7:00 AM', '1:00 PM', '6:00 PM'],
      tips: ['Use small 2mm pellets — Pabda has small mouth', 'Threatened in wild — farmed Pabda commands premium price', 'Nocturnal — feed in evening for best results', 'Seed availability from hatcheries is the main constraint'],
    },
    milestones: [
      { dayFrom: 0,   dayTo: 30,  stage: 'Fingerling Establishment', action: 'Use small 2mm pellets. Feed 3x daily. Monitor for fungal infection.' },
      { dayFrom: 30,  dayTo: 120, stage: 'Grow-out',                 action: 'Monthly weight check. Maintain clean water.' },
      { dayFrom: 120, dayTo: 180, stage: 'Harvest Window',           action: 'Harvest at 40g+. Premium price — Rs 200–400/kg.' },
    ],
  },

  // ── VANNAMEI SHRIMP ───────────────────────────────────────────────────────
  'Litopenaeus vannamei': {
    scientificName: 'Litopenaeus vannamei',
    commonName: 'Vannamei Shrimp',
    localName: 'वनामेई झींगा',
    category: 'SHRIMP',
    defaultSystem: 'EARTHEN',
    culturePeriods: {
      EARTHEN: { label: 'Vannamei', days: 120, harvestWeightGMin: 15, harvestWeightGMax: 25, cropsPerYear: 2, note: 'UP inland saline groundwater farming. Harvest at 15–25g (count 40–60/kg).' },
    },
    waterQuality: { tempMin: 23, tempMax: 32, tempOptMin: 26, tempOptMax: 30, doMin: 4, doOpt: 7, phMin: 7.5, phMax: 8.5, phOpt: 8.0, ammoniaMax: 0.1, coldWarningBelow: 23, heatWarningAbove: 33 },
    feeding: {
      feedType: 'Shrimp-specific sinking pellets (1–2mm)',
      proteinPercent: '35–40%',
      bwPercentEarly: '8–10%',
      bwPercentGrowOut: '3–5%',
      frequencyPerDay: 4,
      feedingTimes: ['6:00 AM', '10:00 AM', '2:00 PM', '6:00 PM'],
      tips: ['Use feeding trays to monitor feed consumption', 'Reduce feed immediately if shrimp stop eating', 'Maintain salinity 5–15 ppt using saline groundwater', 'PCR-screened seed is mandatory — White Spot kills entire crop', 'Strict biosecurity — no wild crabs or birds near pond'],
    },
    milestones: [
      { dayFrom: 0,   dayTo: 15,  stage: 'Post-Larvae Establishment', action: 'Acclimatize PL slowly to pond salinity. Feed 8–10% BW 4x daily. Check DO every morning.' },
      { dayFrom: 15,  dayTo: 45,  stage: 'Juvenile Stage',            action: 'Increase feed gradually. Check for White Spot symptoms daily. Maintain salinity 5–15 ppt.' },
      { dayFrom: 45,  dayTo: 90,  stage: 'Grow-out',                  action: 'Weekly sampling for size. Reduce feed if shrimp stop eating. Maintain DO > 5 mg/L.' },
      { dayFrom: 90,  dayTo: 120, stage: 'Harvest Window',            action: 'Harvest at 15g+ (count 60/kg). Partial harvest possible. Drain pond at night.' },
    ],
  },

  // ── SCAMPI (Giant Freshwater Prawn) ───────────────────────────────────────
  'Macrobrachium rosenbergii': {
    scientificName: 'Macrobrachium rosenbergii',
    commonName: 'Scampi / Giant Freshwater Prawn',
    localName: 'स्कैम्पी / झींगा',
    category: 'PRAWN',
    defaultSystem: 'EARTHEN',
    culturePeriods: {
      EARTHEN: { label: 'Scampi', days: 240, harvestWeightGMin: 50, harvestWeightGMax: 150, cropsPerYear: 1, note: 'Polyculture with carps. 10,000–15,000 PL/ha. Harvest at 50–150g.' },
    },
    waterQuality: { tempMin: 24, tempMax: 32, tempOptMin: 26, tempOptMax: 30, doMin: 4, doOpt: 6, phMin: 7.0, phMax: 8.5, phOpt: 7.5, ammoniaMax: 0.3, coldWarningBelow: 24 },
    feeding: {
      feedType: 'Prawn pellets (sinking) + supplementary rice bran',
      proteinPercent: '30–35%',
      bwPercentEarly: '8–10%',
      bwPercentGrowOut: '3–5%',
      frequencyPerDay: 2,
      feedingTimes: ['6:00 AM', '6:00 PM'],
      tips: ['Scampi is territorial — provide hiding structures (bamboo, tiles)', 'Larvae need brackish water (12 ppt) — buy post-larvae from hatchery', 'Grow-out is in freshwater', 'Harvest large males first (selective harvest) to reduce cannibalism'],
    },
    milestones: [
      { dayFrom: 0,   dayTo: 30,  stage: 'Post-Larvae Establishment', action: 'Stock 10,000–15,000 PL/ha. Provide hiding structures. Feed 8–10% BW 2x daily.' },
      { dayFrom: 30,  dayTo: 120, stage: 'Juvenile Grow-out',         action: 'Monthly sampling. Selective harvest of large males to reduce cannibalism.' },
      { dayFrom: 120, dayTo: 240, stage: 'Harvest Window',            action: 'Harvest at 50g+. Selective harvest every 30 days. Final harvest at 240 days.' },
    ],
  },

  // ── LABEO CALBASU ─────────────────────────────────────────────────────────
  'Labeo calbasu': {
    scientificName: 'Labeo calbasu',
    commonName: 'Kalbasu / Orangefin Labeo',
    localName: 'करौंचर / बसराही',
    category: 'MINOR_CARP',
    defaultSystem: 'EARTHEN',
    culturePeriods: {
      EARTHEN: { label: 'Kalbasu', days: 300, harvestWeightGMin: 500, harvestWeightGMax: 900, cropsPerYear: 1, note: 'Polyculture with IMC. Harvest at 500–900g.' },
    },
    waterQuality: { tempMin: 20, tempMax: 35, tempOptMin: 24, tempOptMax: 32, doMin: 4, doOpt: 6, phMin: 6.5, phMax: 8.5, phOpt: 7.5, ammoniaMax: 0.5 },
    feeding: {
      feedType: 'Sinking pellets or rice bran + mustard cake',
      proteinPercent: '25–30%',
      bwPercentEarly: '5–7%',
      bwPercentGrowOut: '2–3%',
      frequencyPerDay: 2,
      feedingTimes: ['7:00 AM', '4:00 PM'],
      tips: ['Bottom-mid feeder — use sinking pellets', 'Grows well in polyculture with Rohu and Catla', 'Tolerates mild turbidity'],
    },
    milestones: [
      { dayFrom: 0,   dayTo: 60,  stage: 'Fingerling Establishment', action: 'Stock with IMC. Feed sinking pellets 2x daily.' },
      { dayFrom: 60,  dayTo: 240, stage: 'Grow-out',                 action: 'Monthly weight check. Maintain pond hygiene.' },
      { dayFrom: 240, dayTo: 300, stage: 'Harvest Window',           action: 'Harvest at 500g+. Drain pond with IMC.' },
    ],
  },

  // ── CIRRHINUS REBA ────────────────────────────────────────────────────────
  'Cirrhinus reba': {
    scientificName: 'Cirrhinus reba',
    commonName: 'Reba Carp',
    localName: 'रेवा / राया',
    category: 'MINOR_CARP',
    defaultSystem: 'EARTHEN',
    culturePeriods: {
      EARTHEN: { label: 'Reba Carp', days: 300, harvestWeightGMin: 400, harvestWeightGMax: 700, cropsPerYear: 1, note: 'Minor carp polyculture. Harvest at 400–700g.' },
    },
    waterQuality: { tempMin: 20, tempMax: 35, tempOptMin: 24, tempOptMax: 32, doMin: 4, doOpt: 6, phMin: 6.5, phMax: 8.5, phOpt: 7.5, ammoniaMax: 0.5 },
    feeding: {
      feedType: 'Sinking pellets or rice bran',
      proteinPercent: '25–28%',
      bwPercentEarly: '5–7%',
      bwPercentGrowOut: '2–3%',
      frequencyPerDay: 2,
      feedingTimes: ['7:00 AM', '4:00 PM'],
      tips: ['Fills mid-water niche in composite carp culture', 'Hardy and tolerant of mild turbidity'],
    },
    milestones: [
      { dayFrom: 0,   dayTo: 60,  stage: 'Fingerling Establishment', action: 'Stock with IMC. Feed 2x daily.' },
      { dayFrom: 60,  dayTo: 300, stage: 'Grow-out to Harvest',      action: 'Monthly weight check. Harvest at 400g+.' },
    ],
  },

  // ── CHANNA STRIATA (Murrel) ───────────────────────────────────────────────
  'Channa striata': {
    scientificName: 'Channa striata',
    commonName: 'Striped Snakehead / Saura',
    localName: 'सौरा / शोल',
    category: 'MURREL',
    defaultSystem: 'EARTHEN',
    culturePeriods: {
      EARTHEN: { label: 'Saura', days: 270, harvestWeightGMin: 500, harvestWeightGMax: 1000, cropsPerYear: 1, note: 'Predatory. Monoculture or integrated. Harvest at 500g–1kg.' },
    },
    waterQuality: { tempMin: 20, tempMax: 35, tempOptMin: 25, tempOptMax: 30, doMin: 2, doOpt: 5, phMin: 6.5, phMax: 8.0, phOpt: 7.0, ammoniaMax: 0.5, coldWarningBelow: 20 },
    feeding: {
      feedType: 'Trash fish or high-protein sinking pellets (40%+ protein)',
      proteinPercent: '40–45%',
      bwPercentEarly: '5–8%',
      bwPercentGrowOut: '3–5%',
      frequencyPerDay: 2,
      feedingTimes: ['7:00 AM', '5:00 PM'],
      tips: ['Air-breathing — can survive in low-DO water', 'Predatory — do NOT mix with smaller fish', 'High market value — Rs 200–400/kg', 'Monoculture recommended for commercial farming'],
    },
    milestones: [
      { dayFrom: 0,   dayTo: 30,  stage: 'Fingerling Establishment', action: 'Monoculture only. Feed trash fish or high-protein pellets 2x daily.' },
      { dayFrom: 30,  dayTo: 180, stage: 'Grow-out',                 action: 'Monthly weight check. Maintain water quality.' },
      { dayFrom: 180, dayTo: 270, stage: 'Harvest Window',           action: 'Harvest at 500g+. High market value.' },
    ],
  },

  // ── WALLAGO ATTU ──────────────────────────────────────────────────────────
  'Wallago attu': {
    scientificName: 'Wallago attu',
    commonName: 'Wallago / Boal',
    localName: 'पधान / बोआल',
    category: 'CATFISH',
    defaultSystem: 'EARTHEN',
    culturePeriods: {
      EARTHEN: { label: 'Wallago', days: 365, harvestWeightGMin: 1000, harvestWeightGMax: 3000, cropsPerYear: 1, note: 'Large predatory catfish. Seed availability is the main constraint.' },
    },
    waterQuality: { tempMin: 20, tempMax: 35, tempOptMin: 24, tempOptMax: 30, doMin: 4, doOpt: 6, phMin: 6.5, phMax: 8.5, phOpt: 7.5, ammoniaMax: 0.5 },
    feeding: {
      feedType: 'Trash fish or large sinking pellets (40%+ protein)',
      proteinPercent: '40–45%',
      bwPercentEarly: '5–8%',
      bwPercentGrowOut: '2–4%',
      frequencyPerDay: 1,
      feedingTimes: ['6:00 PM'],
      tips: ['Nocturnal predator — feed in evening', 'Monoculture only — will eat all other fish', 'Seed from wild collection — hatchery seed scarce', 'High market value in Bihar/UP rivers'],
    },
    milestones: [
      { dayFrom: 0,   dayTo: 60,  stage: 'Fingerling Establishment', action: 'Monoculture only. Feed trash fish 1x daily in evening.' },
      { dayFrom: 60,  dayTo: 240, stage: 'Grow-out',                 action: 'Monthly weight check. Maintain water quality.' },
      { dayFrom: 240, dayTo: 365, stage: 'Harvest Window',           action: 'Harvest at 1kg+. High market value.' },
    ],
  },

  // ── SPERATA SEENGHALA ─────────────────────────────────────────────────────
  'Mystus seenghala (Sperata seenghala)': {
    scientificName: 'Mystus seenghala (Sperata seenghala)',
    commonName: 'Giant River Catfish / Seenghala',
    localName: 'सींघाला / टेंगरा',
    category: 'CATFISH',
    defaultSystem: 'EARTHEN',
    culturePeriods: {
      EARTHEN: { label: 'Seenghala', days: 365, harvestWeightGMin: 800, harvestWeightGMax: 2000, cropsPerYear: 1, note: 'Large catfish. Culture gaining interest. Harvest at 800g–2kg.' },
    },
    waterQuality: { tempMin: 20, tempMax: 35, tempOptMin: 24, tempOptMax: 30, doMin: 4, doOpt: 6, phMin: 6.5, phMax: 8.5, phOpt: 7.5, ammoniaMax: 0.5 },
    feeding: {
      feedType: 'Sinking pellets or trash fish',
      proteinPercent: '35–40%',
      bwPercentEarly: '5–7%',
      bwPercentGrowOut: '2–4%',
      frequencyPerDay: 2,
      feedingTimes: ['7:00 AM', '5:00 PM'],
      tips: ['High market value in Bihar/UP', 'Predatory — monoculture or with large carps only', 'ICAR-CIFA research ongoing for culture protocols'],
    },
    milestones: [
      { dayFrom: 0,   dayTo: 60,  stage: 'Fingerling Establishment', action: 'Feed high-protein sinking pellets 2x daily.' },
      { dayFrom: 60,  dayTo: 300, stage: 'Grow-out',                 action: 'Monthly weight check. Maintain water quality.' },
      { dayFrom: 300, dayTo: 365, stage: 'Harvest Window',           action: 'Harvest at 800g+. High market value.' },
    ],
  },

  // ── GRASS CARP ────────────────────────────────────────────────────────────
  'Ctenopharyngodon idella': {
    scientificName: 'Ctenopharyngodon idella',
    commonName: 'Grass Carp',
    localName: 'ग्रास कार्प',
    category: 'EXOTIC_CARP',
    defaultSystem: 'EARTHEN',
    culturePeriods: {
      EARTHEN: { label: 'Grass Carp', days: 300, harvestWeightGMin: 1000, harvestWeightGMax: 2000, cropsPerYear: 1, note: 'Weed control + food fish. Harvest at 1–2kg.' },
    },
    waterQuality: { tempMin: 20, tempMax: 35, tempOptMin: 24, tempOptMax: 30, doMin: 4, doOpt: 6, phMin: 6.5, phMax: 8.5, phOpt: 7.5, ammoniaMax: 0.5 },
    feeding: {
      feedType: 'Aquatic weeds + grass + supplementary pellets',
      proteinPercent: '20–25%',
      bwPercentEarly: '5–8%',
      bwPercentGrowOut: '2–4%',
      frequencyPerDay: 2,
      feedingTimes: ['7:00 AM', '4:00 PM'],
      tips: ['Primary food is aquatic weeds and grass — reduces feed cost', 'Excellent for weed control in ponds', 'Do not overstock — competes with Catla for surface food', 'Supplement with pellets when weeds are scarce'],
    },
    milestones: [
      { dayFrom: 0,   dayTo: 60,  stage: 'Fingerling Establishment', action: 'Provide aquatic weeds. Supplement with pellets.' },
      { dayFrom: 60,  dayTo: 240, stage: 'Grow-out',                 action: 'Maintain weed supply. Monthly weight check.' },
      { dayFrom: 240, dayTo: 300, stage: 'Harvest Window',           action: 'Harvest at 1kg+. Drain pond with IMC.' },
    ],
  },

  // ── SILVER CARP ───────────────────────────────────────────────────────────
  'Hypophthalmichthys molitrix': {
    scientificName: 'Hypophthalmichthys molitrix',
    commonName: 'Silver Carp',
    localName: 'सिल्वर कार्प',
    category: 'EXOTIC_CARP',
    defaultSystem: 'EARTHEN',
    culturePeriods: {
      EARTHEN: { label: 'Silver Carp', days: 300, harvestWeightGMin: 800, harvestWeightGMax: 1500, cropsPerYear: 1, note: 'Phytoplankton feeder. Do not overstock — competes with Catla.' },
    },
    waterQuality: { tempMin: 20, tempMax: 35, tempOptMin: 24, tempOptMax: 30, doMin: 4, doOpt: 6, phMin: 6.5, phMax: 8.5, phOpt: 7.5, ammoniaMax: 0.5 },
    feeding: {
      feedType: 'Phytoplankton (natural) + supplementary rice bran',
      proteinPercent: '20–25%',
      bwPercentEarly: '3–5%',
      bwPercentGrowOut: '1–2%',
      frequencyPerDay: 1,
      feedingTimes: ['7:00 AM'],
      tips: ['Feeds on phytoplankton — maintain green water bloom', 'Do not overstock — competes with Catla', 'Supplement with rice bran when plankton is low', 'Helps control algal blooms in ponds'],
    },
    milestones: [
      { dayFrom: 0,   dayTo: 60,  stage: 'Fingerling Establishment', action: 'Maintain plankton bloom. Supplement with rice bran.' },
      { dayFrom: 60,  dayTo: 300, stage: 'Grow-out to Harvest',      action: 'Monthly weight check. Harvest at 800g+.' },
    ],
  },

  // ── COMMON CARP ───────────────────────────────────────────────────────────
  'Cyprinus carpio': {
    scientificName: 'Cyprinus carpio',
    commonName: 'Common Carp / Gulfam',
    localName: 'गुलफाम / कॉमन कार्प',
    category: 'EXOTIC_CARP',
    defaultSystem: 'EARTHEN',
    culturePeriods: {
      EARTHEN: { label: 'Common Carp', days: 240, harvestWeightGMin: 500, harvestWeightGMax: 1000, cropsPerYear: 1, note: 'Prolific breeder. Use monosex or triploid seed to prevent breeding.' },
    },
    waterQuality: { tempMin: 15, tempMax: 35, tempOptMin: 22, tempOptMax: 30, doMin: 4, doOpt: 6, phMin: 6.5, phMax: 8.5, phOpt: 7.5, ammoniaMax: 0.5 },
    feeding: {
      feedType: 'Sinking pellets or rice bran + mustard cake',
      proteinPercent: '25–30%',
      bwPercentEarly: '5–7%',
      bwPercentGrowOut: '2–3%',
      frequencyPerDay: 2,
      feedingTimes: ['7:00 AM', '4:00 PM'],
      tips: ['Bottom feeder — use sinking pellets', 'Prolific breeder — control breeding to prevent overpopulation', 'Hardy and adaptable to various conditions', 'Good for integrated rice-fish farming'],
    },
    milestones: [
      { dayFrom: 0,   dayTo: 60,  stage: 'Fingerling Establishment', action: 'Feed sinking pellets 2x daily. Monitor for breeding.' },
      { dayFrom: 60,  dayTo: 240, stage: 'Grow-out to Harvest',      action: 'Monthly weight check. Harvest at 500g+.' },
    ],
  },

  // ── AMUR CARP ─────────────────────────────────────────────────────────────
  'Cyprinus carpio haematopterus': {
    scientificName: 'Cyprinus carpio haematopterus',
    commonName: 'Amur Carp',
    localName: 'अमुर कार्प',
    category: 'EXOTIC_CARP',
    defaultSystem: 'EARTHEN',
    culturePeriods: {
      EARTHEN: { label: 'Amur Carp', days: 240, harvestWeightGMin: 600, harvestWeightGMax: 1200, cropsPerYear: 1, note: 'Hungarian strain of common carp. Grows 30-40% faster and matures later.' },
    },
    waterQuality: { tempMin: 15, tempMax: 32, tempOptMin: 22, tempOptMax: 30, doMin: 4, doOpt: 6, phMin: 6.5, phMax: 9.0, phOpt: 7.5, ammoniaMax: 0.5 },
    feeding: {
      feedType: 'Sinking or slow-sinking pellets',
      proteinPercent: '28–32%',
      bwPercentEarly: '5–7%',
      bwPercentGrowOut: '2–3%',
      frequencyPerDay: 2,
      feedingTimes: ['7:00 AM', '4:00 PM'],
      tips: ['Highly efficient feed conversion', 'Delayed maturity channels energy into somatic growth', 'Ideal for low-input polyculture'],
    },
    milestones: [
      { dayFrom: 0,   dayTo: 45,  stage: 'Fingerling Establishment', action: 'Feed 5-7% body weight. Monitor water quality.' },
      { dayFrom: 45,  dayTo: 240, stage: 'Grow-out Phase',      action: 'Monthly weight check. High growth rate. Harvest at 600g+.' },
    ],
  },
};

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/** Get species profile by scientific name (case-insensitive partial match) */
export function getSpeciesProfile(scientificName?: string | null): SpeciesProfile | null {
  if (!scientificName) return null;
  const key = scientificName.trim();
  // Exact match first
  if (SPECIES_PROFILES[key]) return SPECIES_PROFILES[key];
  // Partial match (handles "Clarias magur / Clarias batrachus" compound names)
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(SPECIES_PROFILES)) {
    if (lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower.split(' ').slice(0, 2).join(' '))) {
      return v;
    }
  }
  return null;
}

/** Get culture period for a species + system combination */
export function getCultureProfile(
  speciesScientificName?: string | null,
  system?: FarmingSystem | string | null,
): CultureProfile {
  const profile = getSpeciesProfile(speciesScientificName);
  if (!profile) return DEFAULT_CULTURE;

  const sys = (system as FarmingSystem) || profile.defaultSystem;
  return profile.culturePeriods[sys] || profile.culturePeriods[profile.defaultSystem] || DEFAULT_CULTURE;
}

export const DEFAULT_CULTURE: CultureProfile = {
  label: 'Fish',
  days: 180,
  harvestWeightGMin: 200,
  harvestWeightGMax: 500,
  cropsPerYear: 2,
  note: 'Standard culture period. Add species for precise tracking.',
};

/** Get water quality targets for a species */
export function getWaterQualityTargets(scientificName?: string | null): WaterQualityTargets {
  return getSpeciesProfile(scientificName)?.waterQuality ?? DEFAULT_WATER_QUALITY;
}

export const DEFAULT_WATER_QUALITY: WaterQualityTargets = {
  tempMin: 20, tempMax: 35, tempOptMin: 24, tempOptMax: 30,
  doMin: 4, doOpt: 6,
  phMin: 6.5, phMax: 8.5, phOpt: 7.5,
  ammoniaMax: 0.5,
};

/** Get feeding guide for a species */
export function getFeedingGuide(scientificName?: string | null): FeedingGuide | null {
  return getSpeciesProfile(scientificName)?.feeding ?? null;
}

/** Get current growth stage milestone for a pond */
export function getCurrentMilestone(params: {
  stockingDate?: number | null;
  speciesScientificName?: string | null;
  system?: string | null;
}): { stage: string; action: string; daysElapsed: number; daysRemaining: number; progress: number; isReady: boolean; expectedHarvestAt: number | null } {
  const culture = getCultureProfile(params.speciesScientificName, params.system);
  const profile = getSpeciesProfile(params.speciesScientificName);
  const stockingMs = params.stockingDate ?? 0;
  const now = Date.now();
  const daysElapsed = Math.max(0, Math.floor((now - stockingMs) / 86400000));
  const daysRemaining = Math.max(0, culture.days - daysElapsed);
  const progress = Math.min(1, daysElapsed / culture.days);
  const isReady = daysRemaining === 0;
  const expectedHarvestAt = stockingMs ? stockingMs + culture.days * 86400000 : null;

  // Find current milestone
  const milestones = profile?.milestones ?? [];
  const current = milestones.find(m => daysElapsed >= m.dayFrom && daysElapsed < m.dayTo)
    ?? milestones[milestones.length - 1]
    ?? { stage: 'Grow-out', action: 'Monitor water quality and feeding daily.' };

  return { stage: current.stage, action: current.action, daysElapsed, daysRemaining, progress, isReady, expectedHarvestAt };
}

/** Legacy export — kept for backward compatibility */
export function getHarvestMetrics(params: {
  stockingDate?: number | null;
  speciesScientificName?: string | null;
}) {
  return getCurrentMilestone(params);
}
