export interface AlertItem {
  id: string;
  type: 'Water Parameter' | 'Disease Outbreak';
  severity: 'critical' | 'warning';
  title: string;
  description: string;
  farmerName: string;
  phone: string;
  location: string;
  coords: string;
  time: string;
  resolved: boolean;
  recommendation: string;
}

export const MOCK_ALERTS: AlertItem[] = [
  {
    id: '1',
    type: 'Water Parameter',
    severity: 'critical',
    title: 'Critical Dissolved Oxygen Deficit',
    description: 'DO level measured at 2.4 mg/L (Minimum threshold: 3.5 mg/L). Fish starvation risk high.',
    farmerName: 'Hari Har Paswan',
    phone: '9512345678',
    location: 'Gaya, Sherghati block',
    coords: '24.7801° N, 84.9902° E',
    time: '10 mins ago',
    resolved: false,
    recommendation: 'Start paddle aerator immediately. Add agricultural lime (CaO) at 200 kg/ha. Check for algal bloom at surface. Re-measure DO in 2 hours.',
  },
  {
    id: '2',
    type: 'Disease Outbreak',
    severity: 'critical',
    title: 'EUS Disease Symptoms Detected',
    description: 'Red spot lesions reported on standard Rohu crop. Gill discoloration observed.',
    farmerName: 'Ramesh Prasad Singh',
    phone: '9845012345',
    location: 'Patna, Phulwari Sharif block',
    coords: '25.5800° N, 85.1200° E',
    time: '1 hr ago',
    resolved: false,
    recommendation: 'Isolate affected fish immediately. Apply Potassium Permanganate (KMnO₄) bath at 2–4 ppm for 30 mins. Contact veterinary authority for official outbreak reporting.',
  },
  {
    id: '3',
    type: 'Water Parameter',
    severity: 'warning',
    title: 'High Ammonia Concentration',
    description: 'Ammonia level measured at 0.08 ppm (Borderline threshold: 0.05 ppm).',
    farmerName: 'Sanjay Kumar Yadav',
    phone: '9744123456',
    location: 'Madhubani, Benipatti block',
    coords: '26.3650° N, 86.0850° E',
    time: '2 hrs ago',
    resolved: false,
    recommendation: 'Reduce feed by 30% for 48 hours. Apply zeolite at 500 kg/ha. Improve water exchange. Avoid overfeeding. Aerate heavily at dawn and dusk.',
  },
  {
    id: '4',
    type: 'Water Parameter',
    severity: 'warning',
    title: 'pH Alkaline Spike',
    description: 'pH level spiked to 9.2 (Normal range: 6.5 - 8.5). Algal bloom suspected.',
    farmerName: 'Gopal Dev Prasad',
    phone: '9602481357',
    location: 'Patna, Mokama block',
    coords: '25.4020° N, 85.9070° E',
    time: '1 day ago',
    resolved: true,
    recommendation: 'Remove surface algae manually. Apply alum (aluminum sulfate) at 15–20 ppm to flocculate algae. Shade 30% of pond surface if possible.',
  },
];
