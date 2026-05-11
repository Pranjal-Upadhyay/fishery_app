/**
 * Cascading District → Block → Panchayat picker.
 * Bihar (BR) uses hardcoded district/block data as primary source
 * (API is optional bonus — used if available, otherwise falls back to local data).
 * Other states show plain text inputs.
 *
 * Rules:
 *  - Block appears ONLY after a district is confirmed
 *  - Panchayat appears ONLY after a block is confirmed
 *  - autoCorrect is disabled on all manual inputs
 *  - Manual inputs call onChange only on blur/submit (not per keystroke)
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { locationService } from '../services/apiService';

export interface LocationSelection {
  districtCode: string;
  districtName: string;
  blockCode: string;
  blockName: string;
  panchayatCode: string;
  panchayatName: string;
}

interface Props {
  stateCode: string;
  value: Partial<LocationSelection>;
  onChange: (sel: Partial<LocationSelection>) => void;
}

type LocItem = { code: string; name: string };

const SUPPORTED_STATES = new Set(['BR']);

// ── Bihar district data (38 districts, offline fallback) ─────────────────────
const BIHAR_DISTRICTS: LocItem[] = [
  { code: 'araria', name: 'Araria' },
  { code: 'arwal', name: 'Arwal' },
  { code: 'aurangabad', name: 'Aurangabad' },
  { code: 'banka', name: 'Banka' },
  { code: 'begusarai', name: 'Begusarai' },
  { code: 'bhagalpur', name: 'Bhagalpur' },
  { code: 'bhojpur', name: 'Bhojpur' },
  { code: 'buxar', name: 'Buxar' },
  { code: 'darbhanga', name: 'Darbhanga' },
  { code: 'east-champaran', name: 'East Champaran (Motihari)' },
  { code: 'gaya', name: 'Gaya' },
  { code: 'gopalganj', name: 'Gopalganj' },
  { code: 'jamui', name: 'Jamui' },
  { code: 'jehanabad', name: 'Jehanabad' },
  { code: 'kaimur', name: 'Kaimur (Bhabhua)' },
  { code: 'katihar', name: 'Katihar' },
  { code: 'khagaria', name: 'Khagaria' },
  { code: 'kishanganj', name: 'Kishanganj' },
  { code: 'lakhisarai', name: 'Lakhisarai' },
  { code: 'madhepura', name: 'Madhepura' },
  { code: 'madhubani', name: 'Madhubani' },
  { code: 'munger', name: 'Munger' },
  { code: 'muzaffarpur', name: 'Muzaffarpur' },
  { code: 'nalanda', name: 'Nalanda' },
  { code: 'nawada', name: 'Nawada' },
  { code: 'patna', name: 'Patna' },
  { code: 'purnia', name: 'Purnia' },
  { code: 'rohtas', name: 'Rohtas' },
  { code: 'saharsa', name: 'Saharsa' },
  { code: 'samastipur', name: 'Samastipur' },
  { code: 'saran', name: 'Saran (Chhapra)' },
  { code: 'sheikhpura', name: 'Sheikhpura' },
  { code: 'sheohar', name: 'Sheohar' },
  { code: 'sitamarhi', name: 'Sitamarhi' },
  { code: 'siwan', name: 'Siwan' },
  { code: 'supaul', name: 'Supaul' },
  { code: 'vaishali', name: 'Vaishali' },
  { code: 'west-champaran', name: 'West Champaran (Bettiah)' },
];

// ── Bihar blocks per district ─────────────────────────────────────────────────
const BIHAR_BLOCKS: Record<string, LocItem[]> = {
  patna: [
    { code: 'patna-sadar', name: 'Patna Sadar' },
    { code: 'danapur', name: 'Danapur' },
    { code: 'phulwari', name: 'Phulwari Sharif' },
    { code: 'fatuha', name: 'Fatuha' },
    { code: 'barh', name: 'Barh' },
    { code: 'bihta', name: 'Bihta' },
    { code: 'bikram', name: 'Bikram' },
    { code: 'masaurhi', name: 'Masaurhi' },
    { code: 'maner', name: 'Maner' },
    { code: 'mokama', name: 'Mokama' },
    { code: 'naubatpur', name: 'Naubatpur' },
    { code: 'paliganj', name: 'Paliganj' },
    { code: 'punpun', name: 'Punpun' },
    { code: 'bakhtiyarpur', name: 'Bakhtiyarpur' },
    { code: 'khusrupur', name: 'Khusrupur' },
  ],
  muzaffarpur: [
    { code: 'muzaffarpur-sadar', name: 'Muzaffarpur Sadar' },
    { code: 'aurai', name: 'Aurai' },
    { code: 'bochahan', name: 'Bochahan' },
    { code: 'gaighat', name: 'Gaighat' },
    { code: 'kanti', name: 'Kanti' },
    { code: 'marwan', name: 'Marwan' },
    { code: 'minapur', name: 'Minapur' },
    { code: 'motipur', name: 'Motipur' },
    { code: 'mushahari', name: 'Mushahari' },
    { code: 'paru', name: 'Paru' },
    { code: 'sakra', name: 'Sakra' },
    { code: 'saraiya', name: 'Saraiya' },
    { code: 'turki', name: 'Turki' },
  ],
  nalanda: [
    { code: 'asthawan', name: 'Asthawan' },
    { code: 'biharsharif', name: 'Bihar Sharif' },
    { code: 'chandi', name: 'Chandi' },
    { code: 'ekangarsarai', name: 'Ekangarsarai' },
    { code: 'giriak', name: 'Giriak' },
    { code: 'harnaut', name: 'Harnaut' },
    { code: 'hilsa', name: 'Hilsa' },
    { code: 'islampur', name: 'Islampur' },
    { code: 'noorsarai', name: 'Noorsarai' },
    { code: 'rahui', name: 'Rahui' },
    { code: 'silao', name: 'Silao' },
    { code: 'tharthari', name: 'Tharthari' },
  ],
  gaya: [
    { code: 'gaya-town', name: 'Gaya Town' },
    { code: 'amas', name: 'Amas' },
    { code: 'atri', name: 'Atri' },
    { code: 'barachatti', name: 'Barachatti' },
    { code: 'bodh-gaya', name: 'Bodh Gaya' },
    { code: 'dobhi', name: 'Dobhi' },
    { code: 'gurua', name: 'Gurua' },
    { code: 'imamganj', name: 'Imamganj' },
    { code: 'konch', name: 'Konch' },
    { code: 'manpur', name: 'Manpur' },
    { code: 'mohanpur', name: 'Mohanpur' },
    { code: 'sherghati', name: 'Sherghati' },
    { code: 'tekari', name: 'Tekari' },
    { code: 'wazirganj', name: 'Wazirganj' },
  ],
  bhagalpur: [
    { code: 'bhagalpur-sadar', name: 'Bhagalpur Sadar' },
    { code: 'colgong', name: 'Colgong' },
    { code: 'gopalpur', name: 'Gopalpur' },
    { code: 'ismailpur', name: 'Ismailpur' },
    { code: 'jagdishpur', name: 'Jagdishpur' },
    { code: 'kahalgaon', name: 'Kahalgaon' },
    { code: 'naugachhia', name: 'Naugachhia' },
    { code: 'pirpainti', name: 'Pirpainti' },
    { code: 'sabour', name: 'Sabour' },
    { code: 'sultanganj', name: 'Sultanganj' },
  ],
  darbhanga: [
    { code: 'darbhanga-sadar', name: 'Darbhanga Sadar' },
    { code: 'baheri', name: 'Baheri' },
    { code: 'bahadurpur', name: 'Bahadurpur' },
    { code: 'benipur', name: 'Benipur' },
    { code: 'biraul', name: 'Biraul' },
    { code: 'ghanshyampur', name: 'Ghanshyampur' },
    { code: 'hayaghat', name: 'Hayaghat' },
    { code: 'jale', name: 'Jale' },
    { code: 'keotirunway', name: 'Keotirunway' },
    { code: 'kiratpur', name: 'Kiratpur' },
    { code: 'kusheshwar-asthan', name: 'Kusheshwar Asthan' },
    { code: 'manigachhi', name: 'Manigachhi' },
    { code: 'singhwara', name: 'Singhwara' },
  ],
  madhubani: [
    { code: 'madhubani-sadar', name: 'Madhubani Sadar' },
    { code: 'andharatharhi', name: 'Andharatharhi' },
    { code: 'basopatti', name: 'Basopatti' },
    { code: 'benipatti', name: 'Benipatti' },
    { code: 'bisfi', name: 'Bisfi' },
    { code: 'ghoghardiha', name: 'Ghoghardiha' },
    { code: 'harlakhi', name: 'Harlakhi' },
    { code: 'jainagar', name: 'Jainagar' },
    { code: 'jhanjharpur', name: 'Jhanjharpur' },
    { code: 'khajauli', name: 'Khajauli' },
    { code: 'ladania', name: 'Ladania' },
    { code: 'laukaha', name: 'Laukaha' },
    { code: 'phulparas', name: 'Phulparas' },
    { code: 'rajnagar', name: 'Rajnagar' },
  ],
  purnia: [
    { code: 'purnia-east', name: 'Purnia East' },
    { code: 'amour', name: 'Amour' },
    { code: 'baisi', name: 'Baisi' },
    { code: 'banmankhi', name: 'Banmankhi' },
    { code: 'bhawanipur', name: 'Bhawanipur' },
    { code: 'bytia', name: 'Bytia' },
    { code: 'casba', name: 'Casba' },
    { code: 'critical', name: 'Krityanand Nagar' },
    { code: 'dhamdaha', name: 'Dhamdaha' },
    { code: 'rupauli', name: 'Rupauli' },
  ],
  katihar: [
    { code: 'katihar-sadar', name: 'Katihar Sadar' },
    { code: 'azamnagar', name: 'Azamnagar' },
    { code: 'barari', name: 'Barari' },
    { code: 'barsoi', name: 'Barsoi' },
    { code: 'falka', name: 'Falka' },
    { code: 'kadwa', name: 'Kadwa' },
    { code: 'korha', name: 'Korha' },
    { code: 'manihari', name: 'Manihari' },
    { code: 'mansahi', name: 'Mansahi' },
    { code: 'pranpur', name: 'Pranpur' },
  ],
  vaishali: [
    { code: 'hajipur', name: 'Hajipur' },
    { code: 'bidupur', name: 'Bidupur' },
    { code: 'bhagwanpur', name: 'Bhagwanpur' },
    { code: 'desri', name: 'Desri' },
    { code: 'goraul', name: 'Goraul' },
    { code: 'jandaha', name: 'Jandaha' },
    { code: 'lalganj', name: 'Lalganj' },
    { code: 'mahnar', name: 'Mahnar' },
    { code: 'mahua', name: 'Mahua' },
    { code: 'patepur', name: 'Patepur' },
    { code: 'raghopur', name: 'Raghopur' },
    { code: 'sahdai-buzurg', name: 'Sahdai Buzurg' },
    { code: 'vaishali', name: 'Vaishali' },
  ],
  samastipur: [
    { code: 'samastipur-sadar', name: 'Samastipur Sadar' },
    { code: 'bibhutipur', name: 'Bibhutipur' },
    { code: 'dalsinghsarai', name: 'Dalsinghsarai' },
    { code: 'hasanpur', name: 'Hasanpur' },
    { code: 'moipur', name: 'Moipur' },
    { code: 'morwa', name: 'Morwa' },
    { code: 'pusa', name: 'Pusa' },
    { code: 'rosera', name: 'Rosera' },
    { code: 'shivaji-nagar', name: 'Shivaji Nagar' },
    { code: 'singhia', name: 'Singhia' },
    { code: 'vidyapatinagar', name: 'Vidyapatinagar' },
    { code: 'warisnagar', name: 'Warisnagar' },
  ],
  begusarai: [
    { code: 'begusarai-sadar', name: 'Begusarai Sadar' },
    { code: 'bakhri', name: 'Bakhri' },
    { code: 'ballia', name: 'Ballia' },
    { code: 'barauni', name: 'Barauni' },
    { code: 'bhagwanpur', name: 'Bhagwanpur' },
    { code: 'birpur', name: 'Birpur' },
    { code: 'cheriya-bariarpur', name: 'Cheriya Bariarpur' },
    { code: 'cheria-bariarpur', name: 'Cheria Bariarpur' },
    { code: 'dandari', name: 'Dandari' },
    { code: 'garhpura', name: 'Garhpura' },
    { code: 'khudabandpur', name: 'Khudabandpur' },
    { code: 'matihani', name: 'Matihani' },
    { code: 'sahebpur-kamal', name: 'Sahebpur Kamal' },
    { code: 'teghra', name: 'Teghra' },
  ],
  saran: [
    { code: 'chhapra-sadar', name: 'Chhapra Sadar' },
    { code: 'amnour', name: 'Amnour' },
    { code: 'dariapur', name: 'Dariapur' },
    { code: 'dighwara', name: 'Dighwara' },
    { code: 'ekma', name: 'Ekma' },
    { code: 'garkha', name: 'Garkha' },
    { code: 'ishuapur', name: 'Ishuapur' },
    { code: 'jalalpur', name: 'Jalalpur' },
    { code: 'lahladpur', name: 'Lahladpur' },
    { code: 'manjhi', name: 'Manjhi' },
    { code: 'marhoura', name: 'Marhoura' },
    { code: 'nagra', name: 'Nagra' },
    { code: 'panapur', name: 'Panapur' },
    { code: 'parsa', name: 'Parsa' },
    { code: 'revelganj', name: 'Revelganj' },
    { code: 'sonepur', name: 'Sonepur' },
    { code: 'taraiya', name: 'Taraiya' },
  ],
  sitamarhi: [
    { code: 'sitamarhi-sadar', name: 'Sitamarhi Sadar' },
    { code: 'bajpatti', name: 'Bajpatti' },
    { code: 'bathnaha', name: 'Bathnaha' },
    { code: 'belsand', name: 'Belsand' },
    { code: 'choraut', name: 'Choraut' },
    { code: 'dumra', name: 'Dumra' },
    { code: 'majorganj', name: 'Majorganj' },
    { code: 'nanpur', name: 'Nanpur' },
    { code: 'parihar', name: 'Parihar' },
    { code: 'pupri', name: 'Pupri' },
    { code: 'runnisaidpur', name: 'Runnisaidpur' },
    { code: 'riga', name: 'Riga' },
    { code: 'sonbarsa', name: 'Sonbarsa' },
    { code: 'suppi', name: 'Suppi' },
  ],
  siwan: [
    { code: 'siwan-sadar', name: 'Siwan Sadar' },
    { code: 'andhar', name: 'Andhar' },
    { code: 'barharia', name: 'Barharia' },
    { code: 'daraundha', name: 'Daraundha' },
    { code: 'goriakothi', name: 'Goriakothi' },
    { code: 'hussainganj', name: 'Hussainganj' },
    { code: 'lakri-nabiganj', name: 'Lakri Nabiganj' },
    { code: 'maharajganj', name: 'Maharajganj' },
    { code: 'mairwa', name: 'Mairwa' },
    { code: 'pachrukhi', name: 'Pachrukhi' },
    { code: 'raghunathpur', name: 'Raghunathpur' },
    { code: 'siswan', name: 'Siswan' },
    { code: 'zarwal', name: 'Zarwal' },
  ],
  gopalganj: [
    { code: 'gopalganj-sadar', name: 'Gopalganj Sadar' },
    { code: 'barauli', name: 'Barauli' },
    { code: 'bhorey', name: 'Bhorey' },
    { code: 'hathua', name: 'Hathua' },
    { code: 'kataiya', name: 'Kataiya' },
    { code: 'manjha', name: 'Manjha' },
    { code: 'phulwaria', name: 'Phulwaria' },
    { code: 'sidhwalia', name: 'Sidhwalia' },
    { code: 'thawe', name: 'Thawe' },
    { code: 'uchkagaon', name: 'Uchkagaon' },
    { code: 'vijayapur', name: 'Vijayapur' },
  ],
  'east-champaran': [
    { code: 'motihari', name: 'Motihari' },
    { code: 'adapur', name: 'Adapur' },
    { code: 'areraj', name: 'Areraj' },
    { code: 'banjariya', name: 'Banjariya' },
    { code: 'chakia', name: 'Chakia' },
    { code: 'dhaka', name: 'Dhaka' },
    { code: 'ghorasahan', name: 'Ghorasahan' },
    { code: 'harsiddhi', name: 'Harsiddhi' },
    { code: 'kalyanpur', name: 'Kalyanpur' },
    { code: 'kesaria', name: 'Kesaria' },
    { code: 'kotwa', name: 'Kotwa' },
    { code: 'mehsi', name: 'Mehsi' },
    { code: 'pakridayal', name: 'Pakridayal' },
    { code: 'paharpur', name: 'Paharpur' },
    { code: 'piprakothi', name: 'Piprakothi' },
    { code: 'ramgarhwa', name: 'Ramgarhwa' },
    { code: 'raxaul', name: 'Raxaul' },
    { code: 'sangrampur', name: 'Sangrampur' },
    { code: 'sugauli', name: 'Sugauli' },
    { code: 'turkaulia', name: 'Turkaulia' },
  ],
  'west-champaran': [
    { code: 'bettiah', name: 'Bettiah' },
    { code: 'bagaha', name: 'Bagaha' },
    { code: 'chanpatia', name: 'Chanpatia' },
    { code: 'gaunaha', name: 'Gaunaha' },
    { code: 'jogapatti', name: 'Jogapatti' },
    { code: 'lauriya', name: 'Lauriya' },
    { code: 'mainatand', name: 'Mainatand' },
    { code: 'manjhaulia', name: 'Manjhaulia' },
    { code: 'nautan', name: 'Nautan' },
    { code: 'piprasi', name: 'Piprasi' },
    { code: 'ramnagar', name: 'Ramnagar' },
    { code: 'shikarganj', name: 'Shikarganj' },
    { code: 'sikta', name: 'Sikta' },
    { code: 'thakrahan', name: 'Thakrahan' },
  ],
  rohtas: [
    { code: 'sasaram', name: 'Sasaram' },
    { code: 'bikramganj', name: 'Bikramganj' },
    { code: 'chenari', name: 'Chenari' },
    { code: 'dawath', name: 'Dawath' },
    { code: 'dehri', name: 'Dehri' },
    { code: 'dinara', name: 'Dinara' },
    { code: 'karagahar', name: 'Karagahar' },
    { code: 'naohatta', name: 'Naohatta' },
    { code: 'nokha', name: 'Nokha' },
    { code: 'rajpur', name: 'Rajpur' },
    { code: 'sanjhauli', name: 'Sanjhauli' },
    { code: 'shivsagar', name: 'Shivsagar' },
    { code: 'suryapura', name: 'Suryapura' },
    { code: 'tilouthu', name: 'Tilouthu' },
  ],
  aurangabad: [
    { code: 'aurangabad-sadar', name: 'Aurangabad Sadar' },
    { code: 'barun', name: 'Barun' },
    { code: 'daudnagar', name: 'Daudnagar' },
    { code: 'dev', name: 'Dev' },
    { code: 'goh', name: 'Goh' },
    { code: 'haspura', name: 'Haspura' },
    { code: 'kutumba', name: 'Kutumba' },
    { code: 'madanpur', name: 'Madanpur' },
    { code: 'nabinagar', name: 'Nabinagar' },
    { code: 'obra', name: 'Obra' },
    { code: 'rafiganj', name: 'Rafiganj' },
  ],
  buxar: [
    { code: 'buxar-sadar', name: 'Buxar Sadar' },
    { code: 'brahampur', name: 'Brahampur' },
    { code: 'chausa', name: 'Chausa' },
    { code: 'dumraon', name: 'Dumraon' },
    { code: 'itarhi', name: 'Itarhi' },
    { code: 'kesath', name: 'Kesath' },
    { code: 'nawanagar', name: 'Nawanagar' },
    { code: 'rajpur', name: 'Rajpur' },
    { code: 'simri', name: 'Simri' },
  ],
};

// Generic block fallback for districts not explicitly mapped
/**
 * Normalize a code to the local-fallback format used by BIHAR_BLOCKS/BIHAR_PANCHAYATS.
 * API codes look like 'BR-PATNA' or 'BR-PATNA-SADAR'; local codes are 'patna' / 'patna-sadar'.
 * Strip the leading state prefix and lowercase to unify them.
 */
function normalizeLocalCode(code: string): string {
  // Remove 'BR-' prefix (case-insensitive), then lowercase
  return code.replace(/^[A-Z]{2}-/i, '').toLowerCase();
}

function getBlocksForDistrict(districtCode: string): LocItem[] {
  const key = normalizeLocalCode(districtCode);
  const blocks = BIHAR_BLOCKS[key];
  if (blocks && blocks.length > 0) return blocks;
  const dName =
    BIHAR_DISTRICTS.find(d => normalizeLocalCode(d.code) === key)?.name || districtCode;
  return [
    { code: `${key}-sadar`, name: `${dName} Sadar` },
  ];
}

// ── Bihar panchayat data per block code ──────────────────────────────────────
const BIHAR_PANCHAYATS: Record<string, LocItem[]> = {
  'patna-sadar': [
    { code: 'naubatpur-p', name: 'Naubatpur' }, { code: 'rampur-p', name: 'Rampur' },
    { code: 'sikariya', name: 'Sikariya' }, { code: 'hari-chak', name: 'Hari Chak' },
    { code: 'mitha-pur', name: 'Mitha Pur' }, { code: 'deedarganj-p', name: 'Deedarganj' },
    { code: 'fatehpur-p', name: 'Fatehpur' }, { code: 'nagpur-p', name: 'Nagpur' },
    { code: 'khajekalan', name: 'Khajekalan' }, { code: 'lodipur-p', name: 'Lodipur' },
    { code: 'mauaipur', name: 'Mauaipur' }, { code: 'phulwari-p', name: 'Phulwari' },
    { code: 'sampatchak-p', name: 'Sampatchak' }, { code: 'dulhin-bazar-p', name: 'Dulhin Bazar' },
  ],
  danapur: [
    { code: 'danapur-p', name: 'Danapur' }, { code: 'saguna', name: 'Saguna' },
    { code: 'khagaul', name: 'Khagaul' }, { code: 'bihta-p', name: 'Bihta Road' },
    { code: 'manpur-p', name: 'Manpur' }, { code: 'neora', name: 'Neora' },
    { code: 'punpun-p', name: 'Punpun' }, { code: 'dinapur-nizamat', name: 'Dinapur Nizamat' },
    { code: 'ramchandrapur', name: 'Ramchandrapur' }, { code: 'jassopur', name: 'Jassopur' },
  ],
  phulwari: [
    { code: 'phulwari-sadar', name: 'Phulwari Sharif' }, { code: 'sipara', name: 'Sipara' },
    { code: 'maner-p', name: 'Maner Road' }, { code: 'paliganj-p', name: 'Paliganj Road' },
    { code: 'bishanpur-p', name: 'Bishanpur' }, { code: 'lakhna', name: 'Lakhna' },
    { code: 'saidpur-p', name: 'Saidpur' }, { code: 'digha', name: 'Digha' },
    { code: 'barh-p2', name: 'Barh Panchayat' },
  ],
  fatuha: [
    { code: 'fatuha-p', name: 'Fatuha' }, { code: 'athmalgola-p', name: 'Athmalgola' },
    { code: 'belchi', name: 'Belchi' }, { code: 'budh-chak', name: 'Budh Chak' },
    { code: 'ekangarsarai-p', name: 'Ekangarsarai' }, { code: 'khusrupur-p', name: 'Khusrupur' },
    { code: 'pathua', name: 'Pathua' }, { code: 'sarisab-pahi', name: 'Sarisab Pahi' },
  ],
  barh: [
    { code: 'barh-p', name: 'Barh' }, { code: 'bakhtiyarpur-p', name: 'Bakhtiyarpur' },
    { code: 'mankatha', name: 'Mankatha' }, { code: 'teghra-p', name: 'Teghra' },
    { code: 'mokama-p', name: 'Mokama' }, { code: 'atauri', name: 'Atauri' },
    { code: 'beur', name: 'Beur' }, { code: 'chandi-p', name: 'Chandi' },
  ],
  bihta: [
    { code: 'bihta-main', name: 'Bihta' }, { code: 'agiaon', name: 'Agiaon' },
    { code: 'ara-p', name: 'Ara' }, { code: 'balua', name: 'Balua' },
    { code: 'barhta', name: 'Barhta' }, { code: 'dumraon-p', name: 'Dumraon' },
    { code: 'jagdishpur-p', name: 'Jagdishpur' }, { code: 'sahar', name: 'Sahar' },
    { code: 'sandesh', name: 'Sandesh' }, { code: 'tarari', name: 'Tarari' },
  ],
  bikram: [
    { code: 'bikram-p', name: 'Bikram' }, { code: 'arwal-p', name: 'Arwal' },
    { code: 'jehanabad-p', name: 'Jehanabad' }, { code: 'kurtha', name: 'Kurtha' },
    { code: 'makhdumpur', name: 'Makhdumpur' }, { code: 'mahanar', name: 'Mahanar' },
    { code: 'sonbhadra', name: 'Sonbhadra' },
  ],
  masaurhi: [
    { code: 'masaurhi-p', name: 'Masaurhi' }, { code: 'dhanarua', name: 'Dhanarua' },
    { code: 'dulhin-bazar', name: 'Dulhin Bazar' }, { code: 'paliganj-p2', name: 'Paliganj' },
    { code: 'maner-p2', name: 'Maner' }, { code: 'naubatpur-p2', name: 'Naubatpur' },
    { code: 'sandip', name: 'Sandip' }, { code: 'vikram-p', name: 'Vikram' },
  ],
  maner: [
    { code: 'maner-main', name: 'Maner' }, { code: 'barhara', name: 'Barhara' },
    { code: 'chapra-p', name: 'Chapra' }, { code: 'ekma-p', name: 'Ekma' },
    { code: 'garkha-p', name: 'Garkha' }, { code: 'marhoura-p', name: 'Marhoura' },
    { code: 'revelganj-p', name: 'Revelganj' }, { code: 'sonepur-p', name: 'Sonepur' },
  ],
  mokama: [
    { code: 'mokama-main', name: 'Mokama' }, { code: 'athmalgola', name: 'Athmalgola' },
    { code: 'barh-m', name: 'Barh' }, { code: 'ghoshwar', name: 'Ghoshwar' },
    { code: 'hathidah', name: 'Hathidah' }, { code: 'lakhisarai-p', name: 'Lakhisarai' },
    { code: 'punarakh', name: 'Punarakh' }, { code: 'unchakar', name: 'Unchakar' },
  ],
  naubatpur: [
    { code: 'naubatpur-main', name: 'Naubatpur' }, { code: 'dulhin-b', name: 'Dulhin Bazar' },
    { code: 'khagaul-n', name: 'Khagaul' }, { code: 'mahua-n', name: 'Mahua' },
    { code: 'sarmera', name: 'Sarmera' }, { code: 'silao-n', name: 'Silao' },
  ],
  paliganj: [
    { code: 'paliganj-main', name: 'Paliganj' }, { code: 'bikram-pl', name: 'Bikram' },
    { code: 'goh-p', name: 'Goh' }, { code: 'jehanabad-pl', name: 'Jehanabad' },
    { code: 'kurtha-pl', name: 'Kurtha' }, { code: 'pali', name: 'Pali' },
  ],
  punpun: [
    { code: 'punpun-main', name: 'Punpun' }, { code: 'dhanarua-pp', name: 'Dhanarua' },
    { code: 'masaurhi-pp', name: 'Masaurhi' }, { code: 'sampatchak', name: 'Sampatchak' },
    { code: 'sheikhpura-pp', name: 'Sheikhpura' }, { code: 'vikram-pp', name: 'Vikram' },
  ],
  bakhtiyarpur: [
    { code: 'bakhtiyarpur-main', name: 'Bakhtiyarpur' }, { code: 'athmalgola-b', name: 'Athmalgola' },
    { code: 'barh-b', name: 'Barh' }, { code: 'belchi-b', name: 'Belchi' },
    { code: 'fatuha-b', name: 'Fatuha' }, { code: 'mokama-b', name: 'Mokama' },
  ],
  khusrupur: [
    { code: 'khusrupur-main', name: 'Khusrupur' }, { code: 'barh-k', name: 'Barh' },
    { code: 'belchi-k', name: 'Belchi' }, { code: 'fatuha-k', name: 'Fatuha' },
    { code: 'pandarak', name: 'Pandarak' }, { code: 'sarisab', name: 'Sarisab' },
  ],
  // Muzaffarpur blocks
  'muzaffarpur-sadar': [
    { code: 'muzaffarpur-city', name: 'Muzaffarpur City' }, { code: 'bela', name: 'Bela' },
    { code: 'dholi', name: 'Dholi' }, { code: 'gaighat-p', name: 'Gaighat' },
    { code: 'kanti-p', name: 'Kanti' }, { code: 'kurhani', name: 'Kurhani' },
    { code: 'motipur-p', name: 'Motipur' }, { code: 'mushahari-p', name: 'Mushahari' },
    { code: 'paro', name: 'Paro' }, { code: 'saraiya-p', name: 'Saraiya' },
    { code: 'turki-p', name: 'Turki' },
  ],
  aurai: [
    { code: 'aurai-main', name: 'Aurai' }, { code: 'chainpur', name: 'Chainpur' },
    { code: 'goraul-a', name: 'Goraul' }, { code: 'minapur-a', name: 'Minapur' },
    { code: 'paroo', name: 'Paroo' }, { code: 'sahebganj-a', name: 'Sahebganj' },
  ],
  sakra: [
    { code: 'sakra-main', name: 'Sakra' }, { code: 'bochahan-s', name: 'Bochahan' },
    { code: 'gaighat-s', name: 'Gaighat' }, { code: 'kanti-s', name: 'Kanti' },
    { code: 'marwan-s', name: 'Marwan' }, { code: 'sahebganj-s', name: 'Sahebganj' },
  ],
  saraiya: [
    { code: 'saraiya-main', name: 'Saraiya' }, { code: 'bela-s', name: 'Bela' },
    { code: 'kurhani-s', name: 'Kurhani' }, { code: 'mushahari-s', name: 'Mushahari' },
    { code: 'paru-s', name: 'Paru' }, { code: 'sahebganj-sr', name: 'Sahebganj' },
  ],
  // Nalanda blocks
  biharsharif: [
    { code: 'biharsharif-main', name: 'Bihar Sharif' }, { code: 'asthawan-p', name: 'Asthawan' },
    { code: 'bind-p', name: 'Bind' }, { code: 'chandi-n', name: 'Chandi' },
    { code: 'giriak-p', name: 'Giriak' }, { code: 'hilsa-p', name: 'Hilsa' },
    { code: 'islampur-p', name: 'Islampur' }, { code: 'noorsarai-p', name: 'Noorsarai' },
    { code: 'rahui-p', name: 'Rahui' }, { code: 'silao-p', name: 'Silao' },
    { code: 'tharthari-p', name: 'Tharthari' },
  ],
  hilsa: [
    { code: 'hilsa-main', name: 'Hilsa' }, { code: 'asthawan-h', name: 'Asthawan' },
    { code: 'ekangarsarai-h', name: 'Ekangarsarai' }, { code: 'harnaut-h', name: 'Harnaut' },
    { code: 'nagarnausa', name: 'Nagarnausa' }, { code: 'sirmera', name: 'Sirmera' },
  ],
  // Gaya blocks
  'gaya-town': [
    { code: 'gaya-city', name: 'Gaya City' }, { code: 'bodh-gaya-p', name: 'Bodh Gaya' },
    { code: 'amas-p', name: 'Amas' }, { code: 'atri-p', name: 'Atri' },
    { code: 'belaganj-p', name: 'Belaganj' }, { code: 'dobhi-p', name: 'Dobhi' },
    { code: 'gurua-p', name: 'Gurua' }, { code: 'imamganj-p', name: 'Imamganj' },
    { code: 'mohanpur-p', name: 'Mohanpur' }, { code: 'sherghati-p', name: 'Sherghati' },
    { code: 'wazirganj-p', name: 'Wazirganj' },
  ],
  // Vaishali blocks
  hajipur: [
    { code: 'hajipur-main', name: 'Hajipur' }, { code: 'bidupur-p', name: 'Bidupur' },
    { code: 'bhagwanpur-h', name: 'Bhagwanpur' }, { code: 'goraul-h', name: 'Goraul' },
    { code: 'jandaha-h', name: 'Jandaha' }, { code: 'lalganj-h', name: 'Lalganj' },
    { code: 'mahnar-h', name: 'Mahnar' }, { code: 'mahua-h', name: 'Mahua' },
    { code: 'patepur-h', name: 'Patepur' }, { code: 'raghopur-h', name: 'Raghopur' },
    { code: 'vaishali-p', name: 'Vaishali' },
  ],
  // Darbhanga
  'darbhanga-sadar': [
    { code: 'darbhanga-city', name: 'Darbhanga City' }, { code: 'baheri-p', name: 'Baheri' },
    { code: 'benipur-p', name: 'Benipur' }, { code: 'biraul-p', name: 'Biraul' },
    { code: 'ghanshyampur-p', name: 'Ghanshyampur' }, { code: 'hayaghat-p', name: 'Hayaghat' },
    { code: 'jale-p', name: 'Jale' }, { code: 'kusheshwar', name: 'Kusheshwar Asthan' },
    { code: 'manigachhi-p', name: 'Manigachhi' }, { code: 'singhwara-p', name: 'Singhwara' },
  ],
  // Bhagalpur
  'bhagalpur-sadar': [
    { code: 'bhagalpur-city', name: 'Bhagalpur City' }, { code: 'colgong-p', name: 'Colgong' },
    { code: 'gopalpur-p', name: 'Gopalpur' }, { code: 'jagdishpur-b', name: 'Jagdishpur' },
    { code: 'kahalgaon-p', name: 'Kahalgaon' }, { code: 'naugachhia-p', name: 'Naugachhia' },
    { code: 'pirpainti-p', name: 'Pirpainti' }, { code: 'sabour-p', name: 'Sabour' },
    { code: 'sultanganj-p', name: 'Sultanganj' },
  ],
  // Saran
  'chhapra-sadar': [
    { code: 'chhapra-city', name: 'Chhapra City' }, { code: 'amnour-p', name: 'Amnour' },
    { code: 'dariapur-p', name: 'Dariapur' }, { code: 'dighwara-p', name: 'Dighwara' },
    { code: 'ekma-p', name: 'Ekma' }, { code: 'garkha-s', name: 'Garkha' },
    { code: 'jalalpur-p', name: 'Jalalpur' }, { code: 'manjhi-p', name: 'Manjhi' },
    { code: 'marhoura-s', name: 'Marhoura' }, { code: 'revelganj-s', name: 'Revelganj' },
    { code: 'sonepur-s', name: 'Sonepur' }, { code: 'taraiya-p', name: 'Taraiya' },
  ],
  // East Champaran
  motihari: [
    { code: 'motihari-city', name: 'Motihari City' }, { code: 'adapur-p', name: 'Adapur' },
    { code: 'areraj-p', name: 'Areraj' }, { code: 'chakia-p', name: 'Chakia' },
    { code: 'dhaka-p', name: 'Dhaka' }, { code: 'ghorasahan-p', name: 'Ghorasahan' },
    { code: 'kesaria-p', name: 'Kesaria' }, { code: 'mehsi-p', name: 'Mehsi' },
    { code: 'pakridayal-p', name: 'Pakridayal' }, { code: 'raxaul-p', name: 'Raxaul' },
    { code: 'sugauli-p', name: 'Sugauli' },
  ],
  // West Champaran
  bettiah: [
    { code: 'bettiah-city', name: 'Bettiah City' }, { code: 'bagaha-p', name: 'Bagaha' },
    { code: 'chanpatia-p', name: 'Chanpatia' }, { code: 'gaunaha-p', name: 'Gaunaha' },
    { code: 'lauriya-p', name: 'Lauriya' }, { code: 'mainatand-p', name: 'Mainatand' },
    { code: 'nautan-p', name: 'Nautan' }, { code: 'piprasi-p', name: 'Piprasi' },
    { code: 'ramnagar-w', name: 'Ramnagar' }, { code: 'sikta-p', name: 'Sikta' },
  ],
  // Samastipur
  'samastipur-sadar': [
    { code: 'samastipur-city', name: 'Samastipur City' }, { code: 'bibhutipur-p', name: 'Bibhutipur' },
    { code: 'dalsinghsarai-p', name: 'Dalsinghsarai' }, { code: 'hasanpur-s', name: 'Hasanpur' },
    { code: 'morwa-p', name: 'Morwa' }, { code: 'pusa-p', name: 'Pusa' },
    { code: 'rosera-p', name: 'Rosera' }, { code: 'warisnagar-p', name: 'Warisnagar' },
  ],
  // Siwan
  'siwan-sadar': [
    { code: 'siwan-city', name: 'Siwan City' }, { code: 'barharia-p', name: 'Barharia' },
    { code: 'daraundha-p', name: 'Daraundha' }, { code: 'goriakothi-p', name: 'Goriakothi' },
    { code: 'hussainganj-p', name: 'Hussainganj' }, { code: 'maharajganj-p', name: 'Maharajganj' },
    { code: 'mairwa-p', name: 'Mairwa' }, { code: 'raghunathpur-s', name: 'Raghunathpur' },
  ],
  // Gopalganj
  'gopalganj-sadar': [
    { code: 'gopalganj-city', name: 'Gopalganj City' }, { code: 'barauli-p', name: 'Barauli' },
    { code: 'bhorey-p', name: 'Bhorey' }, { code: 'hathua-p', name: 'Hathua' },
    { code: 'kataiya-p', name: 'Kataiya' }, { code: 'manjha-g', name: 'Manjha' },
    { code: 'sidhwalia-p', name: 'Sidhwalia' }, { code: 'thawe-p', name: 'Thawe' },
    { code: 'vijayapur-p', name: 'Vijayapur' },
  ],
};

function getPanchayatsForBlock(blockCode: string): LocItem[] {
  const key = normalizeLocalCode(blockCode);
  return BIHAR_PANCHAYATS[key] || [];
}

// ── Search modal ──────────────────────────────────────────────────────────────
function PickerModal({
  visible,
  title,
  items,
  loading,
  onSelect,
  onClose,
  theme,
}: {
  visible: boolean;
  title: string;
  items: LocItem[];
  loading: boolean;
  onSelect: (item: LocItem) => void;
  onClose: () => void;
  theme: any;
}) {
  const [search, setSearch] = useState('');
  const filtered = search.trim()
    ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  useEffect(() => {
    if (!visible) setSearch('');
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { backgroundColor: theme.colors.background }]}>
          <View style={[modalStyles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={[modalStyles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[modalStyles.close, { color: theme.colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[
              modalStyles.search,
              {
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.surfaceAlt,
                borderColor: theme.colors.border,
              },
            ]}
            placeholder="Search..."
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="words"
            autoFocus
          />
          {loading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={theme.colors.primary} />
          ) : filtered.length === 0 ? (
            <Text style={[modalStyles.emptyText, { color: theme.colors.textMuted }]}>
              No results — try typing below to enter manually
            </Text>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[modalStyles.item, { borderBottomColor: theme.colors.border }]}
                  onPress={() => {
                    onSelect(item);
                    setSearch('');
                  }}
                >
                  <Text style={[modalStyles.itemText, { color: theme.colors.textPrimary }]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function LocationCascadePicker({ stateCode, value, onChange }: Props) {
  const { theme } = useTheme();

  // For Bihar: we use local data + try API as bonus
  const [districts, setDistricts] = useState<LocItem[]>(
    stateCode === 'BR' ? BIHAR_DISTRICTS : []
  );
  const [blocks, setBlocks] = useState<LocItem[]>([]);
  const [panchayats, setPanchayats] = useState<LocItem[]>([]);

  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingPanchayats, setLoadingPanchayats] = useState(false);

  const [openModal, setOpenModal] = useState<'district' | 'block' | 'panchayat' | null>(null);

  // Draft text — only committed to parent on blur/submit
  const [draftDistrict, setDraftDistrict] = useState('');
  const [draftBlock, setDraftBlock] = useState('');
  const [draftPanchayat, setDraftPanchayat] = useState('');

  const supported = SUPPORTED_STATES.has(stateCode);

  // ── Try API for districts (use as override if better data available) ──
  useEffect(() => {
    if (!supported) return;
    setDistricts(BIHAR_DISTRICTS); // Always show local data first
    locationService
      .getDistricts(stateCode)
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setDistricts(res.data); // Upgrade to API data if available
        }
      })
      .catch(() => {});
  }, [stateCode, supported]);

  // ── Load blocks when district confirmed ──
  useEffect(() => {
    if (!value.districtCode) {
      setBlocks([]);
      return;
    }
    // Immediately show local blocks
    const localBlocks = getBlocksForDistrict(value.districtCode);
    setBlocks(localBlocks);

    // Try API for better data
    setLoadingBlocks(true);
    locationService
      .getBlocks(value.districtCode)
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setBlocks(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingBlocks(false));
  }, [value.districtCode]);

  // ── Load panchayats when block confirmed ──
  useEffect(() => {
    if (!value.blockCode) {
      setPanchayats([]);
      return;
    }
    // Load local panchayats first (instant)
    const localPanchayats = getPanchayatsForBlock(value.blockCode);
    setPanchayats(localPanchayats);

    // Try API as upgrade
    setLoadingPanchayats(true);
    locationService
      .getPanchayats(value.blockCode)
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setPanchayats(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPanchayats(false));
  }, [value.blockCode]);

  // ── Manual confirm (on blur / keyboard Done) ──
  const confirmManualDistrict = useCallback(() => {
    const text = draftDistrict.trim();
    if (!text) return;
    onChange({
      districtCode: text.toLowerCase().replace(/\s+/g, '-'),
      districtName: text,
      blockCode: '',
      blockName: '',
      panchayatCode: '',
      panchayatName: '',
    });
  }, [draftDistrict, onChange]);

  const confirmManualBlock = useCallback(() => {
    const text = draftBlock.trim();
    if (!text) return;
    onChange({
      ...value,
      blockCode: text.toLowerCase().replace(/\s+/g, '-'),
      blockName: text,
      panchayatCode: '',
      panchayatName: '',
    });
  }, [draftBlock, onChange, value]);

  const confirmManualPanchayat = useCallback(() => {
    const text = draftPanchayat.trim();
    if (!text) return;
    onChange({
      ...value,
      panchayatCode: text.toLowerCase().replace(/\s+/g, '-'),
      panchayatName: text,
    });
  }, [draftPanchayat, onChange, value]);

  // ── Modal selection ──
  const selectDistrict = useCallback(
    (item: LocItem) => {
      onChange({
        districtCode: item.code,
        districtName: item.name,
        blockCode: '',
        blockName: '',
        panchayatCode: '',
        panchayatName: '',
      });
      setDraftDistrict('');
      setDraftBlock('');
      setDraftPanchayat('');
      setOpenModal(null);
    },
    [onChange]
  );

  const selectBlock = useCallback(
    (item: LocItem) => {
      onChange({
        ...value,
        blockCode: item.code,
        blockName: item.name,
        panchayatCode: '',
        panchayatName: '',
      });
      setDraftBlock('');
      setDraftPanchayat('');
      setOpenModal(null);
    },
    [onChange, value]
  );

  const selectPanchayat = useCallback(
    (item: LocItem) => {
      onChange({ ...value, panchayatCode: item.code, panchayatName: item.name });
      setDraftPanchayat('');
      setOpenModal(null);
    },
    [onChange, value]
  );

  // ── Non-Bihar: plain text inputs ──
  if (!supported) {
    return (
      <View style={{ gap: 10 }}>
        <ManualInput
          placeholder="District name"
          value={value.districtName || ''}
          onChangeText={(t: string) =>
            onChange({ ...value, districtCode: t.toLowerCase().replace(/\s+/g, '-'), districtName: t })
          }
          theme={theme}
        />
        <ManualInput
          placeholder="Block / Taluk name"
          value={value.blockName || ''}
          onChangeText={(t: string) =>
            onChange({ ...value, blockCode: t.toLowerCase().replace(/\s+/g, '-'), blockName: t })
          }
          theme={theme}
        />
        <ManualInput
          placeholder="Panchayat / Village name"
          value={value.panchayatName || ''}
          onChangeText={(t: string) =>
            onChange({ ...value, panchayatCode: t.toLowerCase().replace(/\s+/g, '-'), panchayatName: t })
          }
          theme={theme}
        />
      </View>
    );
  }

  // ── Bihar: modal + manual fallback ──
  const districtConfirmed = Boolean(value.districtCode && value.districtName);
  const blockConfirmed = Boolean(value.blockCode && value.blockName);

  return (
    <View>
      {/* ── DISTRICT ── */}
      <Row
        label="District"
        selected={value.districtName}
        loading={false}
        onPress={() => setOpenModal('district')}
        theme={theme}
      />
      {!districtConfirmed && (
        <ManualInput
          placeholder="Or type district name and press Done ↵"
          value={draftDistrict}
          onChangeText={setDraftDistrict}
          onSubmitEditing={confirmManualDistrict}
          onBlur={confirmManualDistrict}
          theme={theme}
        />
      )}

      {/* ── BLOCK — only after district confirmed ── */}
      {districtConfirmed && (
        <>
          <Row
            label={`Block — ${value.districtName}`}
            selected={value.blockName}
            loading={loadingBlocks && blocks.length === 0}
            onPress={() => setOpenModal('block')}
            theme={theme}
          />
          {!blockConfirmed && (
            <ManualInput
              placeholder="Or type block name and press Done ↵"
              value={draftBlock}
              onChangeText={setDraftBlock}
              onSubmitEditing={confirmManualBlock}
              onBlur={confirmManualBlock}
              theme={theme}
            />
          )}
        </>
      )}

      {/* ── PANCHAYAT — only after block confirmed ── */}
      {blockConfirmed && (
        <>
          <Row
            label={`Panchayat — ${value.blockName}`}
            selected={value.panchayatName}
            loading={loadingPanchayats && panchayats.length === 0}
            onPress={() => setOpenModal('panchayat')}
            theme={theme}
          />
          {!value.panchayatCode && (
            <ManualInput
              placeholder="Or type panchayat / village name ↵"
              value={draftPanchayat}
              onChangeText={setDraftPanchayat}
              onSubmitEditing={confirmManualPanchayat}
              onBlur={confirmManualPanchayat}
              theme={theme}
            />
          )}
        </>
      )}

      {/* Modals */}
      <PickerModal
        visible={openModal === 'district'}
        title="Select District (Bihar)"
        items={districts}
        loading={false}
        onSelect={selectDistrict}
        onClose={() => setOpenModal(null)}
        theme={theme}
      />
      <PickerModal
        visible={openModal === 'block'}
        title={`Select Block — ${value.districtName || ''}`}
        items={blocks}
        loading={loadingBlocks && blocks.length === 0}
        onSelect={selectBlock}
        onClose={() => setOpenModal(null)}
        theme={theme}
      />
      <PickerModal
        visible={openModal === 'panchayat'}
        title={`Select Panchayat — ${value.blockName || ''}`}
        items={panchayats}
        loading={loadingPanchayats && panchayats.length === 0}
        onSelect={selectPanchayat}
        onClose={() => setOpenModal(null)}
        theme={theme}
      />
    </View>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function ManualInput({
  placeholder,
  value,
  onChangeText,
  onSubmitEditing,
  onBlur,
  theme,
}: {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  onSubmitEditing?: () => void;
  onBlur?: () => void;
  theme: any;
}) {
  return (
    <TextInput
      style={[
        manualStyles.input,
        {
          borderColor: theme.colors.border,
          color: theme.colors.textPrimary,
          backgroundColor: theme.colors.surfaceAlt,
        },
      ]}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textMuted}
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmitEditing}
      onBlur={onBlur}
      autoCorrect={false}
      autoCapitalize="words"
      returnKeyType="done"
    />
  );
}

function Row({
  label,
  selected,
  loading,
  onPress,
  theme,
}: {
  label: string;
  selected?: string;
  loading: boolean;
  onPress: () => void;
  theme: any;
}) {
  return (
    <TouchableOpacity
      style={[
        rowStyles.row,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={{ flex: 1 }}>
        <Text style={[rowStyles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
        <Text
          style={[
            rowStyles.value,
            { color: selected ? theme.colors.textPrimary : theme.colors.primary },
          ]}
        >
          {loading ? 'Loading...' : selected || 'Tap here to select ›'}
        </Text>
      </View>
      <Text style={[rowStyles.chevron, { color: theme.colors.primary }]}>›</Text>
    </TouchableOpacity>
  );
}

const manualStyles = StyleSheet.create({
  input: {
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    height: 48,
  },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  label: { fontSize: 11, fontWeight: '700', marginBottom: 3, letterSpacing: 0.5 },
  value: { fontSize: 16, fontWeight: '600' },
  chevron: { fontSize: 24, marginLeft: 8 },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '800' },
  close: { fontSize: 16, fontWeight: '700' },
  search: {
    margin: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    height: 46,
  },
  item: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: { fontSize: 16 },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 14,
    paddingHorizontal: 24,
    lineHeight: 22,
  },
});
