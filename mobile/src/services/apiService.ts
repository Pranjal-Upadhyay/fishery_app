import axios from 'axios';
import { Platform } from 'react-native';

const LOCAL_BACKEND_URL =
    Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const MISSING_PRODUCTION_BACKEND_URL = 'https://fishery-app.onrender.com';
const DEV_BACKEND_OVERRIDE = process.env.EXPO_PUBLIC_DEV_BACKEND_URL;
const PRODUCTION_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const BACKEND_URL = __DEV__
    ? DEV_BACKEND_OVERRIDE || LOCAL_BACKEND_URL
    : PRODUCTION_BACKEND_URL || MISSING_PRODUCTION_BACKEND_URL;

export const resolvedBackendUrl = BACKEND_URL;

if (!__DEV__ && !PRODUCTION_BACKEND_URL) {
    console.warn(
        'EXPO_PUBLIC_BACKEND_URL is not set. Production builds must point to a deployed backend before release or TestFlight.'
    );
}

const api = axios.create({
    baseURL: BACKEND_URL,
    // 30 s — gives Render free-tier time to wake from cold start
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 429 retry interceptor — when the server rate-limits us, wait for the
// Retry-After header (or a 5-second default) then try once more.
// This prevents a brief rate-limit burst from silently falling back to the
// 3-item offline placeholder.
api.interceptors.response.use(
    response => response,
    async (error) => {
        const status = error.response?.status;
        const requestConfig = error.config as (typeof error.config & { _retryAfter429?: boolean }) | undefined;
        if (status === 429 && requestConfig && !requestConfig._retryAfter429) {
            const retryAfterHeader = error.response?.headers?.['retry-after'];
            const waitMs = retryAfterHeader
                ? parseInt(retryAfterHeader, 10) * 1000
                : 5000; // default 5 s
            requestConfig._retryAfter429 = true;
            console.warn(`[API] 429 rate-limited on ${error.config?.url}. Retrying in ${waitMs / 1000}s…`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
            // Retry the original request exactly once
            return api.request(requestConfig);
        }
        return Promise.reject(error);
    }
);

if (__DEV__) {
    api.interceptors.request.use((config) => {
        console.log('[API request]', {
            method: config.method,
            baseURL: config.baseURL,
            url: config.url,
            data: config.data,
        });
        return config;
    });

    api.interceptors.response.use(
        (response) => {
            console.log('[API response]', {
                status: response.status,
                url: response.config?.url,
                data: response.data,
            });
            return response;
        },
        (error) => {
            console.log('[API error]', {
                message: error.message,
                code: error.code,
                url: error.config?.url,
                baseURL: error.config?.baseURL,
                status: error.response?.status,
                data: error.response?.data,
            });
            return Promise.reject(error);
        }
    );
}

// Offline fallback for geographic zones — covers all major Indian states so
// state/district dropdowns always work even when the backend is unreachable.
const FALLBACK_ZONES = [
    { state_code: 'AP', zone_name: 'Andhra Pradesh', district_codes: ['Guntur', 'Krishna', 'East Godavari', 'West Godavari', 'Visakhapatnam', 'Srikakulam', 'Vizianagaram', 'Kurnool', 'Kadapa', 'Nellore', 'Chittoor', 'Prakasam', 'Anantapur'], district_names: ['Guntur', 'Krishna', 'East Godavari', 'West Godavari', 'Visakhapatnam', 'Srikakulam', 'Vizianagaram', 'Kurnool', 'Kadapa', 'Nellore', 'Chittoor', 'Prakasam', 'Anantapur'] },
    { state_code: 'AR', zone_name: 'Arunachal Pradesh', district_codes: ['East Siang', 'West Siang', 'Upper Siang', 'Lower Subansiri', 'Upper Subansiri', 'Papum Pare', 'Tawang', 'Changlang', 'Tirap'], district_names: ['East Siang', 'West Siang', 'Upper Siang', 'Lower Subansiri', 'Upper Subansiri', 'Papum Pare', 'Tawang', 'Changlang', 'Tirap'] },
    { state_code: 'AS', zone_name: 'Assam', district_codes: ['Kamrup', 'Nagaon', 'Jorhat', 'Dibrugarh', 'Tinsukia', 'Golaghat', 'Barpeta', 'Dhubri', 'Cachar', 'Lakhimpur'], district_names: ['Kamrup', 'Nagaon', 'Jorhat', 'Dibrugarh', 'Tinsukia', 'Golaghat', 'Barpeta', 'Dhubri', 'Cachar', 'Lakhimpur'] },
    { state_code: 'BR', zone_name: 'Bihar', district_codes: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Purnia', 'Araria', 'Samastipur', 'Vaishali', 'Sitamarhi'], district_names: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Purnia', 'Araria', 'Samastipur', 'Vaishali', 'Sitamarhi'] },
    { state_code: 'CT', zone_name: 'Chhattisgarh', district_codes: ['Raipur', 'Bilaspur', 'Durg', 'Rajnandgaon', 'Raigarh', 'Korba', 'Jashpur', 'Surguja', 'Bastar', 'Jagdalpur'], district_names: ['Raipur', 'Bilaspur', 'Durg', 'Rajnandgaon', 'Raigarh', 'Korba', 'Jashpur', 'Surguja', 'Bastar', 'Jagdalpur'] },
    { state_code: 'GA', zone_name: 'Goa', district_codes: ['North Goa', 'South Goa'], district_names: ['North Goa', 'South Goa'] },
    { state_code: 'GJ', zone_name: 'Gujarat', district_codes: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Amreli', 'Anand', 'Navsari', 'Bharuch', 'Valsad'], district_names: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Amreli', 'Anand', 'Navsari', 'Bharuch', 'Valsad'] },
    { state_code: 'HR', zone_name: 'Haryana', district_codes: ['Gurugram', 'Faridabad', 'Hisar', 'Rohtak', 'Ambala', 'Karnal', 'Panipat', 'Sonipat', 'Yamunanagar', 'Kurukshetra'], district_names: ['Gurugram', 'Faridabad', 'Hisar', 'Rohtak', 'Ambala', 'Karnal', 'Panipat', 'Sonipat', 'Yamunanagar', 'Kurukshetra'] },
    { state_code: 'HP', zone_name: 'Himachal Pradesh', district_codes: ['Shimla', 'Kangra', 'Mandi', 'Kullu', 'Solan', 'Una', 'Hamirpur', 'Bilaspur', 'Chamba', 'Sirmaur'], district_names: ['Shimla', 'Kangra', 'Mandi', 'Kullu', 'Solan', 'Una', 'Hamirpur', 'Bilaspur', 'Chamba', 'Sirmaur'] },
    { state_code: 'JH', zone_name: 'Jharkhand', district_codes: ['Ranchi', 'Dhanbad', 'Bokaro', 'Jamshedpur', 'Hazaribagh', 'Deoghar', 'Giridih', 'Dumka', 'Palamu', 'Gumla'], district_names: ['Ranchi', 'Dhanbad', 'Bokaro', 'Jamshedpur', 'Hazaribagh', 'Deoghar', 'Giridih', 'Dumka', 'Palamu', 'Gumla'] },
    { state_code: 'KA', zone_name: 'Karnataka', district_codes: ['Bengaluru Urban', 'Mysuru', 'Tumkur', 'Dakshina Kannada', 'Uttara Kannada', 'Udupi', 'Shimoga', 'Hassan', 'Belagavi', 'Dharwad', 'Bidar', 'Kolar'], district_names: ['Bengaluru Urban', 'Mysuru', 'Tumkur', 'Dakshina Kannada', 'Uttara Kannada', 'Udupi', 'Shimoga', 'Hassan', 'Belagavi', 'Dharwad', 'Bidar', 'Kolar'] },
    { state_code: 'KL', zone_name: 'Kerala', district_codes: ['Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'], district_names: ['Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'] },
    { state_code: 'MP', zone_name: 'Madhya Pradesh', district_codes: ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Rewa', 'Satna', 'Chhindwara', 'Hoshangabad'], district_names: ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Rewa', 'Satna', 'Chhindwara', 'Hoshangabad'] },
    { state_code: 'MH', zone_name: 'Maharashtra', district_codes: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur', 'Amravati', 'Raigad', 'Ratnagiri', 'Sindhudurg', 'Thane', 'Kolhapur'], district_names: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur', 'Amravati', 'Raigad', 'Ratnagiri', 'Sindhudurg', 'Thane', 'Kolhapur'] },
    { state_code: 'MN', zone_name: 'Manipur', district_codes: ['Imphal West', 'Imphal East', 'Bishnupur', 'Thoubal', 'Churachandpur', 'Senapati', 'Ukhrul', 'Chandel'], district_names: ['Imphal West', 'Imphal East', 'Bishnupur', 'Thoubal', 'Churachandpur', 'Senapati', 'Ukhrul', 'Chandel'] },
    { state_code: 'ML', zone_name: 'Meghalaya', district_codes: ['East Khasi Hills', 'West Khasi Hills', 'Ri Bhoi', 'East Jaintia Hills', 'West Jaintia Hills', 'East Garo Hills', 'West Garo Hills', 'South Garo Hills'], district_names: ['East Khasi Hills', 'West Khasi Hills', 'Ri Bhoi', 'East Jaintia Hills', 'West Jaintia Hills', 'East Garo Hills', 'West Garo Hills', 'South Garo Hills'] },
    { state_code: 'MZ', zone_name: 'Mizoram', district_codes: ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip', 'Kolasib', 'Lawngtlai', 'Mamit', 'Siaha'], district_names: ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip', 'Kolasib', 'Lawngtlai', 'Mamit', 'Siaha'] },
    { state_code: 'NL', zone_name: 'Nagaland', district_codes: ['Kohima', 'Dimapur', 'Mokokchung', 'Wokha', 'Zunheboto', 'Tuensang', 'Mon', 'Phek'], district_names: ['Kohima', 'Dimapur', 'Mokokchung', 'Wokha', 'Zunheboto', 'Tuensang', 'Mon', 'Phek'] },
    { state_code: 'OR', zone_name: 'Odisha', district_codes: ['Bhubaneswar', 'Cuttack', 'Puri', 'Berhampur', 'Balasore', 'Bhadrak', 'Kendrapara', 'Jagatsinghpur', 'Ganjam', 'Jajpur', 'Khordha', 'Nayagarh'], district_names: ['Bhubaneswar', 'Cuttack', 'Puri', 'Berhampur', 'Balasore', 'Bhadrak', 'Kendrapara', 'Jagatsinghpur', 'Ganjam', 'Jajpur', 'Khordha', 'Nayagarh'] },
    { state_code: 'PB', zone_name: 'Punjab', district_codes: ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Gurdaspur', 'Hoshiarpur', 'Firozpur', 'Moga'], district_names: ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Gurdaspur', 'Hoshiarpur', 'Firozpur', 'Moga'] },
    { state_code: 'RJ', zone_name: 'Rajasthan', district_codes: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Bharatpur', 'Alwar', 'Barmer', 'Chittorgarh'], district_names: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Bharatpur', 'Alwar', 'Barmer', 'Chittorgarh'] },
    { state_code: 'SK', zone_name: 'Sikkim', district_codes: ['East Sikkim', 'West Sikkim', 'North Sikkim', 'South Sikkim'], district_names: ['East Sikkim', 'West Sikkim', 'North Sikkim', 'South Sikkim'] },
    { state_code: 'TN', zone_name: 'Tamil Nadu', district_codes: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Thanjavur', 'Nagapattinam', 'Cuddalore', 'Villupuram', 'Ramanathapuram', 'Thoothukudi', 'Kanyakumari'], district_names: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Thanjavur', 'Nagapattinam', 'Cuddalore', 'Villupuram', 'Ramanathapuram', 'Thoothukudi', 'Kanyakumari'] },
    { state_code: 'TG', zone_name: 'Telangana', district_codes: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Nalgonda', 'Medak', 'Rangareddy', 'Mahabubnagar', 'Adilabad'], district_names: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Nalgonda', 'Medak', 'Rangareddy', 'Mahabubnagar', 'Adilabad'] },
    { state_code: 'TR', zone_name: 'Tripura', district_codes: ['West Tripura', 'South Tripura', 'North Tripura', 'Gomati', 'Khowai', 'Sepahijala', 'Sipahijala', 'Unokoti'], district_names: ['West Tripura', 'South Tripura', 'North Tripura', 'Gomati', 'Khowai', 'Sepahijala', 'Sipahijala', 'Unokoti'] },
    { state_code: 'UP', zone_name: 'Uttar Pradesh', district_codes: ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Allahabad', 'Meerut', 'Gorakhpur', 'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur', 'Ghaziabad'], district_names: ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Allahabad', 'Meerut', 'Gorakhpur', 'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur', 'Ghaziabad'] },
    { state_code: 'UT', zone_name: 'Uttarakhand', district_codes: ['Dehradun', 'Haridwar', 'Nainital', 'Udham Singh Nagar', 'Almora', 'Pauri Garhwal', 'Tehri Garhwal', 'Chamoli', 'Pithoragarh', 'Champawat'], district_names: ['Dehradun', 'Haridwar', 'Nainital', 'Udham Singh Nagar', 'Almora', 'Pauri Garhwal', 'Tehri Garhwal', 'Chamoli', 'Pithoragarh', 'Champawat'] },
    { state_code: 'WB', zone_name: 'West Bengal', district_codes: ['Kolkata', 'North 24 Parganas', 'South 24 Parganas', 'Howrah', 'Hooghly', 'Burdwan', 'Murshidabad', 'Nadia', 'Medinipur', 'Jalpaiguri', 'Malda', 'Cooch Behar'], district_names: ['Kolkata', 'North 24 Parganas', 'South 24 Parganas', 'Howrah', 'Hooghly', 'Burdwan', 'Murshidabad', 'Nadia', 'Medinipur', 'Jalpaiguri', 'Malda', 'Cooch Behar'] },
    { state_code: 'AN', zone_name: 'Andaman & Nicobar', district_codes: ['North and Middle Andaman', 'South Andaman', 'Nicobars'], district_names: ['North and Middle Andaman', 'South Andaman', 'Nicobars'] },
    { state_code: 'DL', zone_name: 'Delhi', district_codes: ['Central Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'New Delhi', 'North East Delhi', 'South West Delhi'], district_names: ['Central Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'New Delhi', 'North East Delhi', 'South West Delhi'] },
    { state_code: 'JK', zone_name: 'Jammu & Kashmir', district_codes: ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Pulwama', 'Kupwara', 'Budgam', 'Kathua', 'Udhampur', 'Rajouri'], district_names: ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Pulwama', 'Kupwara', 'Budgam', 'Kathua', 'Udhampur', 'Rajouri'] },
    { state_code: 'PY', zone_name: 'Puducherry', district_codes: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'], district_names: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'] },
];

const FALLBACK_EQUIPMENT = [
    { id: 'eq_1', name: 'Paddle Wheel Aerator 1HP', category: 'AERATION', cost_inr: 25000, lifespan_years: 5, maintenance_cost_annual_inr: 2000, shop_url: 'https://dir.indiamart.com/search.mp?ss=Paddle+Wheel+Aerator' },
    { id: 'eq_2', name: 'Water Quality Test Kit', category: 'MONITORING', cost_inr: 1500, lifespan_years: 1, maintenance_cost_annual_inr: 500, shop_url: 'https://dir.indiamart.com/search.mp?ss=Water+Quality+Test+Kit' },
    { id: 'eq_3', name: 'Automatic Feeder', category: 'FEEDING', cost_inr: 12000, lifespan_years: 3, maintenance_cost_annual_inr: 1000, shop_url: 'https://dir.indiamart.com/search.mp?ss=Automatic+Feeder' }
];

const FALLBACK_FEED = [
    { id: 'fd_1', name: 'Premium Starter', brand: 'Godrej Agrovet', feed_type: 'FLOATING_PELLET', protein_percent: 32, fat_percent: 5, cost_per_kg_inr: 55, packaging_size_kg: 25, suitable_for: 'Fry and Fingerlings', shop_url: 'https://dir.indiamart.com/search.mp?ss=Godrej+Agrovet+Fish+Feed' },
    { id: 'fd_2', name: 'Grower Plus', brand: 'CP Aquaculture', feed_type: 'FLOATING_PELLET', protein_percent: 28, fat_percent: 4, cost_per_kg_inr: 45, packaging_size_kg: 35, suitable_for: 'Grow-out stage (Indian Major Carp)', shop_url: 'https://dir.indiamart.com/search.mp?ss=CP+Aquaculture+Fish+Feed' },
    { id: 'fd_3', name: 'Shrimp Finisher', brand: 'Avanti Feeds', feed_type: 'SINKING_PELLET', protein_percent: 38, fat_percent: 6, cost_per_kg_inr: 110, packaging_size_kg: 25, suitable_for: 'Vannamei Shrimp', shop_url: 'https://dir.indiamart.com/search.mp?ss=Avanti+Feeds+Shrimp' }
];

const FALLBACK_PRICES = [
    { id: 'pr_1', species_name: 'Rohu', market_name: 'Local Fish Market', state_code: 'AP', price_inr_per_kg: 150, grade: 'Medium', date: new Date().toISOString(), source: 'Local Data', volume_kg: 500 },
    { id: 'pr_2', species_name: 'Catla', market_name: 'Local Fish Market', state_code: 'AP', price_inr_per_kg: 160, grade: 'Medium', date: new Date().toISOString(), source: 'Local Data', volume_kg: 300 },
    { id: 'pr_3', species_name: 'Vannamei Shrimp', market_name: 'Export Hub', state_code: 'AP', price_inr_per_kg: 400, grade: 'Premium', date: new Date().toISOString(), source: 'Export Data', volume_kg: 1000 }
];

const FALLBACK_SPECIES = [
    {
        id: 'sp_1',
        data: {
            scientific_name: "Labeo rohita",
            common_names: { "en": "Rohu", "hi": "Rui" },
            category: "INDIAN_MAJOR_CARP",
            culture_period_months: { min: 8, max: 12 },
            optimal_systems: ["TRADITIONAL_POND", "BIOFLOC"]
        }
    },
    {
        id: 'sp_2',
        data: {
            scientific_name: "Catla catla",
            common_names: { "en": "Catla", "hi": "Bhakur" },
            category: "INDIAN_MAJOR_CARP",
            culture_period_months: { min: 10, max: 12 },
            optimal_systems: ["TRADITIONAL_POND"]
        }
    },
    {
        id: 'sp_3',
        data: {
            scientific_name: "Litopenaeus vannamei",
            common_names: { "en": "Vannamei Shrimp", "hi": "Safed Jhinga" },
            category: "SHRIMP",
            culture_period_months: { min: 4, max: 5 },
            optimal_systems: ["BRACKISH_POND"]
        }
    }
];

export const geoService = {
    getZones: async () => {
        try {
            const response = await api.get('/api/v1/geo/zones');
            // If the backend returned an empty list, use the fallback so dropdowns always work
            if (response.data?.data?.length > 0) {
                return response.data;
            }
            console.warn('[Offline Mode] No zones from backend, using built-in zone list');
            return { success: true, data: FALLBACK_ZONES };
        } catch (error) {
            console.warn('[Offline Mode] Falling back to built-in geographic zones');
            return { success: true, data: FALLBACK_ZONES };
        }
    },
    getZonesByState: async (stateCode: string) => {
        try {
            const response = await api.get(`/api/v1/geo/zones/${stateCode}`);
            if (response.data?.data?.length > 0) {
                return response.data;
            }
            const fallback = FALLBACK_ZONES.filter(z => z.state_code === stateCode.toUpperCase());
            return { success: true, data: fallback };
        } catch (error) {
            const fallback = FALLBACK_ZONES.filter(z => z.state_code === stateCode.toUpperCase());
            return { success: true, data: fallback };
        }
    },
    analyzeSuitability: async (data: {
        latitude: number;
        longitude: number;
        stateCode: string;
        districtCode: string;
        waterSourceType: string;
        measuredSalinityUsCm?: number;
    }) => {
        const response = await api.post('/api/v1/geo/suitability', data);
        return response.data;
    },
};

export const economicsService = {
    simulate: async (data: any) => {
        const response = await api.post('/api/v1/economics/simulate', data);
        return response.data;
    },
    getAdvisory: async (params: {
        stateCode: string;
        farmerCategory: 'GENERAL' | 'WOMEN' | 'SC' | 'ST';
        projectType?: 'FRESHWATER' | 'BRACKISH' | 'INTEGRATED' | 'RAS';
    }) => {
        const response = await api.get('/api/v1/economics/advisory', { params });
        return response.data;
    },
    getSubsidy: async (data: any) => {
        const response = await api.post('/api/v1/economics/subsidy', data);
        return response.data;
    },
    getEquipment: async () => {
        try {
            const response = await api.get('/api/v1/economics/equipment');
            return response.data;
        } catch (error) {
            console.warn('[Offline Mode] Falling back to local equipment data');
            return { success: true, data: FALLBACK_EQUIPMENT };
        }
    },
    getFeed: async () => {
        try {
            const response = await api.get('/api/v1/economics/feed');
            return response.data;
        } catch (error) {
            console.warn('[Offline Mode] Falling back to local feed data');
            return { success: true, data: FALLBACK_FEED };
        }
    },
};

export const marketService = {
    getPrices: async (params?: { species?: string; state?: string }) => {
        try {
            const response = await api.get('/api/v1/market/prices', { params });
            return response.data;
        } catch (error) {
            console.warn('[Offline Mode] Falling back to local market prices');
            return { success: true, data: FALLBACK_PRICES };
        }
    },
    getTrends: async () => {
        const response = await api.get('/api/v1/market/trends');
        return response.data;
    },
};

export const speciesService = {
    getAll: async () => {
        try {
            const response = await api.get('/api/v1/species');
            return response.data;
        } catch (error) {
            console.warn('[Offline Mode] Falling back to local species data');
            return { success: true, data: FALLBACK_SPECIES };
        }
    },
    getById: async (id: string) => {
        const response = await api.get(`/api/v1/species/${id}`);
        return response.data;
    },
};

export const waterQualityService = {
    saveReading: async (data: {
        temperature?: number;
        dissolvedOxygen?: number;
        ph?: number;
        salinity?: number;
        ammonia?: number;
        notes?: string;
    }) => {
        const response = await api.post('/api/v1/water-quality/readings', data);
        return response.data;
    },
    getReadings: async () => {
        const response = await api.get('/api/v1/water-quality/readings');
        return response.data;
    },
};

export const diseaseService = {
    list: async (params?: {
        category?: 'BACTERIAL' | 'VIRAL' | 'PARASITIC' | 'FUNGAL' | 'NUTRITIONAL' | 'ENVIRONMENTAL';
        species?: string;
        symptom?: string;
        severity?: 'LOW' | 'MEDIUM' | 'HIGH';
        q?: string;
    }) => {
        const response = await api.get('/api/v1/diseases', { params });
        return response.data;
    },
    getById: async (id: string) => {
        const response = await api.get(`/api/v1/diseases/${id}`);
        return response.data;
    },
    suggest: async (data: {
        symptoms: string[];
        species?: string;
        waterQuality?: {
            dissolvedOxygen?: number;
            ph?: number;
            ammonia?: number;
            temperature?: number;
        };
    }) => {
        const response = await api.post('/api/v1/diseases/suggest', data);
        return response.data;
    },
};

export const locationService = {
    getDistricts: async (stateCode: string) => {
        const response = await api.get('/api/v1/locations/districts', { params: { stateCode } });
        return response.data;
    },
    getBlocks: async (districtCode: string) => {
        const response = await api.get('/api/v1/locations/blocks', { params: { districtCode } });
        return response.data;
    },
    getPanchayats: async (blockCode: string) => {
        const response = await api.get('/api/v1/locations/panchayats', { params: { blockCode } });
        return response.data;
    },
};

export const doctorNetworkService = {
    listDoctors: async (params?: { panchayatId?: string }) => {
        const response = await api.get('/api/v1/doctors', { params });
        return response.data;
    },
    getDoctorByUser: async (userId: string) => {
        const response = await api.get(`/api/v1/doctors/by-user/${userId}`);
        return response.data;
    },
    getFarmerMapping: async (farmerId: string) => {
        const response = await api.get(`/api/v1/doctors/mapping/${farmerId}`);
        return response.data;
    },
    setFarmerMapping: async (data: { farmerId: string; doctorId: string; panchayatId: string }) => {
        const response = await api.post('/api/v1/doctors/mapping', data);
        return response.data;
    },
    listAppointments: async (params?: { farmerId?: string; doctorId?: string; status?: string }) => {
        const response = await api.get('/api/v1/appointments', { params });
        return response.data;
    },
    getAppointmentById: async (appointmentId: string) => {
        const response = await api.get(`/api/v1/appointments/${appointmentId}`);
        return response.data;
    },
    createAppointment: async (data: {
        farmerId: string;
        doctorId: string;
        pondId?: string;
        issueDescription: string;
        suspectedDiseaseId?: string;
        scheduledDate: string;
        consultationType: 'VISIT' | 'CALL';
        emergencyFlag?: boolean;
        photoUri?: string;
    }) => {
        const response = await api.post('/api/v1/appointments', data);
        return response.data;
    },
    addAppointmentNote: async (id: string, data: { authorName: string; text: string }) => {
        const response = await api.post(`/api/v1/appointments/${id}/notes`, data);
        return response.data;
    },
    updateAppointmentStatus: async (id: string, data: {
        status: 'REQUESTED' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
        paymentStatus?: 'PENDING' | 'PARTIAL' | 'PAID';
        report?: {
            diagnosis: string;
            treatmentPlan: string;
            notes?: string;
            followUpRequired?: boolean;
            followUpDate?: string;
            completionChecklist: {
                pondInspected: boolean;
                fishObserved: boolean;
                farmerCounseled: boolean;
            };
        };
    }) => {
        const response = await api.patch(`/api/v1/appointments/${id}/status`, data);
        return response.data;
    },
    routeDoctor: async (panchayatCode: string) => {
        const response = await api.get('/api/v1/doctors/route', { params: { panchayatCode } });
        return response.data;
    },
};

export default api;
