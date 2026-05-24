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

// Auth interceptor — attach JWT token from AsyncStorage to every request.
// This runs before every request so the token is always fresh.
import AsyncStorage from '@react-native-async-storage/async-storage';
const TOKEN_KEY = '@fishing_god_token';

api.interceptors.request.use(
    async (config) => {
        try {
            const token = await AsyncStorage.getItem(TOKEN_KEY);
            if (token) {
                config.headers = config.headers || {};
                config.headers['Authorization'] = `Bearer ${token}`;
            }
        } catch {
            // AsyncStorage read failed — proceed without token
        }
        return config;
    },
    (error) => Promise.reject(error)
);

if (__DEV__) {
    api.interceptors.request.use((config) => {
        let loggedData = config.data;
        
        // Mask passwords in logs for security
        if (loggedData) {
            if (typeof loggedData === 'string') {
                try {
                    const parsed = JSON.parse(loggedData);
                    if (parsed.password) parsed.password = '***MASKED***';
                    loggedData = JSON.stringify(parsed);
                } catch (e) {}
            } else if (typeof loggedData === 'object') {
                loggedData = { ...loggedData };
                if ('password' in loggedData) {
                    loggedData.password = '***MASKED***';
                }
            }
        }

        console.log('[API request]', {
            method: config.method,
            baseURL: config.baseURL,
            url: config.url,
            data: loggedData,
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
            common_names: { "en": "Rohu", "hi": "रोहू" },
            category: "INDIAN_MAJOR_CARP",
            habitat: "freshwater",
            culture_period_months: { min: 8, max: 12 },
            optimal_systems: ["TRADITIONAL_POND", "BIOFLOC"],
            biological_parameters: { salinity_tolerance_ppt: { min: 0, max: 2 }, temperature_celsius: { min: 18, max: 35 }, ph: { min: 6.5, max: 8.5 } },
            stocking_density_per_hectare: { min: 5000, max: 10000 },
            average_harvest_weight_kg: 1.2,
            fcr: 1.8,
            survival_rate_percent: 75,
        }
    },
    {
        id: 'sp_2',
        data: {
            scientific_name: "Catla catla",
            common_names: { "en": "Catla", "hi": "कतला" },
            category: "INDIAN_MAJOR_CARP",
            habitat: "freshwater",
            culture_period_months: { min: 10, max: 12 },
            optimal_systems: ["TRADITIONAL_POND"],
            biological_parameters: { salinity_tolerance_ppt: { min: 0, max: 2 }, temperature_celsius: { min: 18, max: 36 }, ph: { min: 6.5, max: 8.5 } },
            stocking_density_per_hectare: { min: 4000, max: 8000 },
            average_harvest_weight_kg: 1.5,
            fcr: 1.9,
            survival_rate_percent: 72,
        }
    },
    {
        id: 'sp_3',
        data: {
            scientific_name: "Litopenaeus vannamei",
            common_names: { "en": "Vannamei Shrimp", "hi": "सफेद झींगा" },
            category: "SHRIMP",
            habitat: "brackish",
            culture_period_months: { min: 4, max: 5 },
            optimal_systems: ["BRACKISH_POND", "BIOFLOC"],
            biological_parameters: { salinity_tolerance_ppt: { min: 5, max: 35 }, temperature_celsius: { min: 23, max: 30 }, ph: { min: 7.0, max: 8.5 } },
            stocking_density_per_hectare: { min: 100000, max: 300000 },
            average_harvest_weight_kg: 0.02,
            fcr: 1.4,
            survival_rate_percent: 70,
        }
    },
    {
        id: 'sp_4',
        data: {
            scientific_name: "Cirrhinus mrigala",
            common_names: { "en": "Mrigal", "hi": "मृगल" },
            category: "INDIAN_MAJOR_CARP",
            habitat: "freshwater",
            culture_period_months: { min: 8, max: 12 },
            optimal_systems: ["TRADITIONAL_POND"],
            biological_parameters: { salinity_tolerance_ppt: { min: 0, max: 2 }, temperature_celsius: { min: 16, max: 35 }, ph: { min: 6.5, max: 8.5 } },
            stocking_density_per_hectare: { min: 4000, max: 8000 },
            average_harvest_weight_kg: 1.0,
            fcr: 1.9,
            survival_rate_percent: 73,
        }
    },
    {
        id: 'sp_5',
        data: {
            scientific_name: "Oreochromis niloticus (GIFT)",
            common_names: { "en": "GIFT Tilapia", "hi": "तिलापिया (गिफ्ट)" },
            category: "TILAPIA",
            habitat: "freshwater",
            culture_period_months: { min: 5, max: 7 },
            optimal_systems: ["TRADITIONAL_POND", "BIOFLOC", "RAS"],
            biological_parameters: { salinity_tolerance_ppt: { min: 0, max: 15 }, temperature_celsius: { min: 20, max: 35 }, ph: { min: 6.0, max: 9.0 } },
            stocking_density_per_hectare: { min: 20000, max: 50000 },
            average_harvest_weight_kg: 0.5,
            fcr: 1.6,
            survival_rate_percent: 85,
        }
    },
    {
        id: 'sp_6',
        data: {
            scientific_name: "Pangasianodon hypophthalmus",
            common_names: { "en": "Pangasius / Basa", "hi": "पंगासियस" },
            category: "CATFISH",
            habitat: "freshwater",
            culture_period_months: { min: 6, max: 9 },
            optimal_systems: ["TRADITIONAL_POND", "RAS", "CAGE"],
            biological_parameters: { salinity_tolerance_ppt: { min: 0, max: 10 }, temperature_celsius: { min: 22, max: 34 }, ph: { min: 6.0, max: 8.5 } },
            stocking_density_per_hectare: { min: 30000, max: 100000 },
            average_harvest_weight_kg: 1.0,
            fcr: 1.5,
            survival_rate_percent: 88,
        }
    },
    {
        id: 'sp_7',
        data: {
            scientific_name: "Clarias batrachus",
            common_names: { "en": "Singhi / Walking Catfish", "hi": "सिंघी / मांगुर" },
            category: "CATFISH",
            habitat: "freshwater",
            culture_period_months: { min: 6, max: 8 },
            optimal_systems: ["BIOFLOC", "RAS", "TRADITIONAL_POND"],
            biological_parameters: { salinity_tolerance_ppt: { min: 0, max: 5 }, temperature_celsius: { min: 22, max: 32 }, ph: { min: 6.5, max: 8.5 } },
            stocking_density_per_hectare: { min: 100000, max: 500000 },
            average_harvest_weight_kg: 0.3,
            fcr: 1.7,
            survival_rate_percent: 80,
        }
    },
    {
        id: 'sp_8',
        data: {
            scientific_name: "Penaeus monodon",
            common_names: { "en": "Tiger Shrimp / Black Tiger", "hi": "बाघ झींगा" },
            category: "SHRIMP",
            habitat: "brackish",
            culture_period_months: { min: 5, max: 7 },
            optimal_systems: ["BRACKISH_POND"],
            biological_parameters: { salinity_tolerance_ppt: { min: 10, max: 35 }, temperature_celsius: { min: 25, max: 30 }, ph: { min: 7.5, max: 8.5 } },
            stocking_density_per_hectare: { min: 50000, max: 150000 },
            average_harvest_weight_kg: 0.04,
            fcr: 1.6,
            survival_rate_percent: 60,
        }
    },
    {
        id: 'sp_9',
        data: {
            scientific_name: "Hypophthalmichthys molitrix",
            common_names: { "en": "Silver Carp", "hi": "सिल्वर कार्प" },
            category: "EXOTIC_CARP",
            habitat: "freshwater",
            culture_period_months: { min: 8, max: 12 },
            optimal_systems: ["TRADITIONAL_POND"],
            biological_parameters: { salinity_tolerance_ppt: { min: 0, max: 3 }, temperature_celsius: { min: 16, max: 35 }, ph: { min: 6.5, max: 8.5 } },
            stocking_density_per_hectare: { min: 3000, max: 6000 },
            average_harvest_weight_kg: 1.5,
            fcr: 1.5,
            survival_rate_percent: 75,
        }
    },
    {
        id: 'sp_10',
        data: {
            scientific_name: "Ctenopharyngodon idella",
            common_names: { "en": "Grass Carp", "hi": "ग्रास कार्प" },
            category: "EXOTIC_CARP",
            habitat: "freshwater",
            culture_period_months: { min: 10, max: 14 },
            optimal_systems: ["TRADITIONAL_POND"],
            biological_parameters: { salinity_tolerance_ppt: { min: 0, max: 3 }, temperature_celsius: { min: 15, max: 32 }, ph: { min: 6.0, max: 8.5 } },
            stocking_density_per_hectare: { min: 2000, max: 5000 },
            average_harvest_weight_kg: 2.0,
            fcr: 2.0,
            survival_rate_percent: 70,
        }
    },
    {
        id: 'sp_11',
        data: {
            scientific_name: "Macrobrachium rosenbergii",
            common_names: { "en": "Freshwater Prawn / Scampi", "hi": "मीठे पानी का झींगा" },
            category: "PRAWN",
            habitat: "freshwater",
            culture_period_months: { min: 6, max: 9 },
            optimal_systems: ["TRADITIONAL_POND"],
            biological_parameters: { salinity_tolerance_ppt: { min: 0, max: 5 }, temperature_celsius: { min: 26, max: 31 }, ph: { min: 7.0, max: 8.5 } },
            stocking_density_per_hectare: { min: 40000, max: 80000 },
            average_harvest_weight_kg: 0.06,
            fcr: 2.0,
            survival_rate_percent: 60,
        }
    },
    {
        id: 'sp_12',
        data: {
            scientific_name: "Lates calcarifer",
            common_names: { "en": "Sea Bass / Bekti", "hi": "भेड़की / बेकटी" },
            category: "MARINE",
            habitat: "brackish",
            culture_period_months: { min: 10, max: 14 },
            optimal_systems: ["CAGE", "RAS"],
            biological_parameters: { salinity_tolerance_ppt: { min: 5, max: 35 }, temperature_celsius: { min: 26, max: 33 }, ph: { min: 7.5, max: 8.5 } },
            stocking_density_per_hectare: { min: 10000, max: 30000 },
            average_harvest_weight_kg: 0.8,
            fcr: 2.0,
            survival_rate_percent: 65,
        }
    },
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
        try {
            const response = await api.get('/api/v1/market/trends');
            return response.data;
        } catch (error) {
            console.warn('[Offline Mode] Market trends unavailable');
            return { success: true, data: [] };
        }
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

const FALLBACK_DISEASES = [
    { id: 'd_01', slug: 'columnaris', name: 'Columnaris', category: 'BACTERIAL', severity: 'HIGH', mortality_rate: 35, affected_species: ['Tilapia', 'Catla', 'Rohu'], symptoms: ['White patches', 'Frayed fins', 'Skin lesions'], causes: ['Stress', 'Poor water quality'], prevention: ['Maintain DO above 5 mg/L', 'Avoid overstocking'], treatment: ['Salt bath', 'Antibacterial treatment'], seasonality: ['summer', 'monsoon'] },
    { id: 'd_02', slug: 'aeromonas-septicemia', name: 'Aeromonas (Hemorrhagic Septicemia)', category: 'BACTERIAL', severity: 'HIGH', mortality_rate: 40, affected_species: ['Catla', 'Rohu', 'Mrigal', 'Tilapia'], symptoms: ['Hemorrhage', 'Ulcers', 'Abdominal swelling'], causes: ['Injury', 'Temperature stress', 'High ammonia'], prevention: ['Stable temperature', 'Biosecurity'], treatment: ['Doctor-supervised antimicrobial plan'], seasonality: ['pre-monsoon', 'monsoon'] },
    { id: 'd_03', slug: 'white-spot-syndrome', name: 'White Spot Syndrome', category: 'VIRAL', severity: 'HIGH', mortality_rate: 80, affected_species: ['Vannamei Shrimp'], symptoms: ['White spots on shell', 'Lethargy', 'Rapid mortality'], causes: ['Viral exposure', 'Poor biosecurity'], prevention: ['PCR-screened seed', 'Strict pond disinfection'], treatment: ['Emergency harvest', 'Specialist consultation'], seasonality: ['all'] },
    { id: 'd_04', slug: 'ich-white-spot', name: 'White Spot Disease (Ich)', category: 'PARASITIC', severity: 'MEDIUM', mortality_rate: 20, affected_species: ['Tilapia', 'Catla', 'Rohu', 'All freshwater'], symptoms: ['Pinhead white spots', 'Flashing against surfaces', 'Gasping'], causes: ['Protozoan parasite', 'Temperature shock'], prevention: ['Quarantine new stock', 'Avoid temperature changes'], treatment: ['Quick lime 300-500 kg/ha', 'Formalin bath'], seasonality: ['winter', 'spring'] },
    { id: 'd_05', slug: 'saprolegniasis', name: 'Saprolegniasis (Cotton Wool Disease)', category: 'FUNGAL', severity: 'MEDIUM', mortality_rate: 18, affected_species: ['Catla', 'Rohu', 'Tilapia', 'Trout'], symptoms: ['Cotton-like growth', 'Skin damage', 'Egg fungal growth'], causes: ['Injury', 'Cold stress', 'Organic debris'], prevention: ['Good hygiene', 'Remove dead biomass'], treatment: ['3% salt solution', 'Formalin + Malachite Green'], seasonality: ['winter'] },
    { id: 'd_06', slug: 'oxygen-depletion', name: 'Oxygen Depletion', category: 'ENVIRONMENTAL', severity: 'HIGH', mortality_rate: 55, affected_species: ['All'], symptoms: ['Surface gasping', 'Crowding near inlet', 'Sudden dawn mortality'], causes: ['Low aeration', 'Algal crash', 'Overfeeding'], prevention: ['Continuous aeration', 'Feed discipline'], treatment: ['Run aerators immediately', 'Stop feed', 'Water exchange'], seasonality: ['summer', 'monsoon'] },
    { id: 'd_07', slug: 'ammonia-toxicity', name: 'Ammonia Toxicity', category: 'ENVIRONMENTAL', severity: 'HIGH', mortality_rate: 45, affected_species: ['All'], symptoms: ['Gill irritation', 'Surface piping', 'Reduced feeding'], causes: ['Overfeeding', 'High biomass', 'Weak nitrification'], prevention: ['Regular sludge removal', 'Probiotics'], treatment: ['Reduce feed', 'Apply zeolite', 'Water exchange'], seasonality: ['all'] },
    { id: 'd_08', slug: 'eus-red-spot', name: 'EUS / Red Spot Disease', category: 'FUNGAL', severity: 'HIGH', mortality_rate: 50, affected_species: ['Rohu', 'Catla', 'Mrigal', 'Grass Carp', 'Silver Carp', 'Singhi', 'Mangur'], symptoms: ['Red spot wounds on body', 'Deep wounds with skin falling off', 'Fish jumping at surface', 'Reduced feeding'], causes: ['Fungus Aphanomyces invadans', 'Mixed infection', 'Contaminated water in monsoon'], prevention: ['Block contaminated water', 'Apply quick lime', 'Stock disease-free seed'], treatment: ['CIFAX 3-4 L/ha', 'Sokrina WS 5-10 L/ha', 'Quick lime 200-600 kg/ha'], seasonality: ['monsoon', 'winter'] },
    { id: 'd_09', slug: 'dropsy', name: 'Dropsy (Bacterial Hemorrhagic Septicemia)', category: 'BACTERIAL', severity: 'HIGH', mortality_rate: 45, affected_species: ['Rohu', 'Catla', 'Mrigal', 'Grass Carp', 'Common Carp', 'Silver Carp'], symptoms: ['Swollen body and abdomen', 'Scales standing out like pinecone', 'Bulging eyes', 'Disrupted blood vessels'], causes: ['Aeromonas hydrophila', 'Aeromonas punctata', 'Stress from poor water'], prevention: ['Maintain good water quality', 'Avoid rough handling', 'Disinfect equipment'], treatment: ['KMnO4 bath 1-4 mg/L for 2 min daily', 'Antibiotic under doctor supervision'], seasonality: ['pre-monsoon', 'monsoon'] },
    { id: 'd_10', slug: 'tail-fin-rot', name: 'Tail Rot / Fin Rot', category: 'BACTERIAL', severity: 'MEDIUM', mortality_rate: 25, affected_species: ['Rohu', 'Catla', 'Mrigal', 'Grass Carp', 'Common Carp', 'Tilapia'], symptoms: ['Tail and fins rotting', 'White lines on fins', 'Frayed fin margins', 'Fish stay near bottom'], causes: ['Aeromonas salmonicida', 'Pseudomonas sp.', 'Poor water hygiene'], prevention: ['Keep DO above 5 mg/L', 'Avoid overstocking', 'Disinfect equipment'], treatment: ['KMnO4 bath 10-20 mg/L for 1 hour', 'Copper Sulphate 500 mg/L bath'], seasonality: ['summer', 'monsoon'] },
    { id: 'd_11', slug: 'argulosis', name: 'Argulosis (Fish Louse)', category: 'PARASITIC', severity: 'MEDIUM', mortality_rate: 15, affected_species: ['All freshwater fish', 'Rohu', 'Catla', 'Breeders'], symptoms: ['Visible disc-shaped parasites on body', 'Excessive mucus', 'Fish rubbing on pond edges', 'Small red wounds'], causes: ['External parasite Argulus', 'Muddy polluted ponds', 'Infected fish or nets'], prevention: ['Quarantine new fish', 'Net regularly', 'Dry pond every 3 years'], treatment: ['Dipterex 0.2 mg/L', 'Manual removal', 'KMnO4 bath'], seasonality: ['summer', 'monsoon'] },
    { id: 'd_12', slug: 'lernaeosis', name: 'Lernaeosis (Anchor Worm)', category: 'PARASITIC', severity: 'MEDIUM', mortality_rate: 20, affected_species: ['All freshwater fish', 'Rohu', 'Catla', 'Mrigal'], symptoms: ['Thread-like worms on body and fins', 'Skin rotting at attachment', 'Fish rubbing on bottom', 'Red wounds'], causes: ['Lernaea parasite', 'Polluted water entry', 'Infected wild fish'], prevention: ['Block contaminated water', 'Filter incoming water', 'Net regularly'], treatment: ['Gammexane 1 mg/L', 'Dipterex 0.2 mg/L', 'Manual removal for broodstock'], seasonality: ['monsoon', 'post-monsoon'] },
    { id: 'd_13', slug: 'leech-infection', name: 'Leech Infection', category: 'PARASITIC', severity: 'MEDIUM', mortality_rate: 18, affected_species: ['All freshwater fish'], symptoms: ['Brown/black leeches on body, gills, mouth', 'Excessive mucus', 'Fish rubbing on objects', 'Weight loss'], causes: ['External parasitic leeches', 'Muddy polluted pond bottom', 'Heavy organic sludge'], prevention: ['Dry pond every 3 years', 'Apply lime regularly', 'Block sewage water'], treatment: ['Glacial Acetic Acid 1.0 ml/L', 'Copper Sulphate 500 g/ha', 'Drain and dry pond'], seasonality: ['monsoon', 'post-monsoon'] },
    { id: 'd_14', slug: 'gill-rot', name: 'Gill Rot Disease', category: 'FUNGAL', severity: 'HIGH', mortality_rate: 35, affected_species: ['Rohu', 'Catla', 'Mrigal', 'Common Carp', 'Tilapia'], symptoms: ['Gills lose red colour, become pale', 'Necrotic gill filaments', 'Surface gasping', 'Reduced feeding'], causes: ['Fungus Branchiomyces demigrans', 'Stagnant polluted water', 'High temperature + low oxygen'], prevention: ['Maintain water exchange', 'Reduce overfeeding', 'Apply lime'], treatment: ['Increase aeration immediately', 'KMnO4 as advised', 'Reduce stocking density'], seasonality: ['summer'] },
    { id: 'd_15', slug: 'brown-blood-disease', name: 'Brown Blood Disease (Nitrite Toxicity)', category: 'ENVIRONMENTAL', severity: 'HIGH', mortality_rate: 35, affected_species: ['All', 'Catla', 'Rohu', 'Mrigal', 'Tilapia'], symptoms: ['Brownish gills and blood', 'Slow movement', 'Reduced feeding', 'Weak despite good oxygen'], causes: ['Nitrite above 1.0 ppm', 'Methemoglobin formation', 'Overfeeding and weak nitrification'], prevention: ['Test nitrite weekly', 'Avoid overfeeding', 'Apply pond probiotics'], treatment: ['Sodium chloride 40 kg/acre', 'Reduce feed', 'Exchange 25-50% water', 'Increase aeration'], seasonality: ['summer', 'pre-monsoon'] },
    { id: 'd_16', slug: 'hydrogen-sulfide-toxicity', name: 'Hydrogen Sulfide (H₂S) Toxicity', category: 'ENVIRONMENTAL', severity: 'HIGH', mortality_rate: 40, affected_species: ['All'], symptoms: ['Rotten egg smell', 'Black sludge at bottom', 'Fish gasping and avoiding bottom', 'Sudden mortality after stirring'], causes: ['Toxic H₂S buildup at bottom', 'High vegetation blocking circulation', 'Heavy organic sludge'], prevention: ['Remove excess vegetation', 'Aerate in early morning', 'Dry pond every 3 years'], treatment: ['Increase aeration', 'Apply lime 200-500 kg/ha', 'Exchange 25-50% water', 'Stop feeding'], seasonality: ['summer'] },
    { id: 'd_17', slug: 'algal-toxicosis', name: 'Algal Toxicosis / Algal Bloom', category: 'ENVIRONMENTAL', severity: 'HIGH', mortality_rate: 50, affected_species: ['All'], symptoms: ['Water turns deep green/brown', 'Foul smell', 'Sudden dawn mortality', 'Fish gasping and refusing feed'], causes: ['Excessive algal growth', 'Overfeeding', 'Stagnant water', 'Bloom crash causes oxygen depletion'], prevention: ['Avoid overfeeding', 'Regular water exchange', 'Stop feeding when water turns green', 'Apply lime periodically'], treatment: ['Stop feeding immediately', 'Increase nighttime aeration', 'Exchange 25-50% water', 'Apply pond probiotics'], seasonality: ['summer', 'monsoon'] },
    { id: 'd_18', slug: 'gas-bubble-disease', name: 'Gas Bubble Disease (Super-saturation)', category: 'ENVIRONMENTAL', severity: 'MEDIUM', mortality_rate: 20, affected_species: ['All', 'Fingerlings', 'Larvae'], symptoms: ['Gas bubbles under skin or in eyes', 'Erratic swimming or belly-up', 'Eye protrusion', 'Sudden fingerling mortality'], causes: ['Excessively high dissolved oxygen', 'Heavy algal photosynthesis', 'Sudden temperature changes'], prevention: ['Avoid extreme algal blooms', 'Aerate gently in peak sun', 'Provide shade for fingerlings'], treatment: ['Increase water exchange', 'Reduce algal density with lime', 'Move fish to deeper cooler water'], seasonality: ['summer', 'monsoon'] },
];

export const diseaseService = {
    list: async (params?: {
        category?: 'BACTERIAL' | 'VIRAL' | 'PARASITIC' | 'FUNGAL' | 'NUTRITIONAL' | 'ENVIRONMENTAL';
        species?: string;
        symptom?: string;
        severity?: 'LOW' | 'MEDIUM' | 'HIGH';
        q?: string;
    }) => {
        let backendDiseases: any[] = [];
        try {
            const response = await api.get('/api/v1/diseases', { params });
            if (response.data?.success && response.data?.data?.length > 0) {
                backendDiseases = response.data.data;
            }
        } catch {
            console.warn('[Offline Mode] Backend unreachable for diseases');
        }

        // Merge: backend diseases + any fallback diseases not already present (by slug)
        const existingSlugs = new Set(backendDiseases.map((d: any) => d.slug));
        const missingFallbacks = FALLBACK_DISEASES.filter(d => !existingSlugs.has(d.slug));
        const merged = [...backendDiseases, ...missingFallbacks];

        // Apply filters to the merged list
        const filtered = filterFallbackDiseases(merged, params);
        return { success: true, count: filtered.length, data: filtered };
    },
    getById: async (id: string) => {
        try {
            const response = await api.get(`/api/v1/diseases/${id}`);
            return response.data;
        } catch {
            const found = FALLBACK_DISEASES.find(d => d.id === id || d.slug === id);
            return found ? { success: true, data: found } : { success: false, error: 'Not found' };
        }
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
        try {
            const response = await api.post('/api/v1/diseases/suggest', data);
            return response.data;
        } catch {
            return { success: true, data: { urgency: 'LOW', recommendations: [], advisory: 'Could not reach server for disease suggestion.' } };
        }
    },
};

function filterFallbackDiseases(diseases: typeof FALLBACK_DISEASES, params?: any) {
    let result = diseases;
    if (params?.category) {
        result = result.filter(d => d.category === params.category);
    }
    if (params?.severity) {
        result = result.filter(d => d.severity === params.severity);
    }
    if (params?.q) {
        const q = params.q.toLowerCase();
        result = result.filter(d =>
            d.name.toLowerCase().includes(q) ||
            d.symptoms.some((s: string) => s.toLowerCase().includes(q)) ||
            d.affected_species.some((s: string) => s.toLowerCase().includes(q))
        );
    }
    return result;
}

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

// ─── Farmer Notifications ─────────────────────────────────────────────────────
// Doctor-triggered notifications delivered to the farmer's app.

export const farmerNotificationsService = {
    /** Fetch all notifications for a farmer (newest first, max 50) */
    getForFarmer: async (farmerId: string, unreadOnly = false) => {
        const response = await api.get(`/api/v1/notifications/farmer/${farmerId}`, {
            params: unreadOnly ? { unreadOnly: 'true' } : undefined,
        });
        return response.data as { success: boolean; count: number; data: FarmerNotificationItem[] };
    },
    /** Mark one notification as read (omit id to mark all) */
    markRead: async (farmerId: string, notificationId?: string) => {
        const response = await api.patch(`/api/v1/notifications/farmer/${farmerId}/read`, {
            notificationId,
        });
        return response.data;
    },
};

export interface FarmerNotificationItem {
    id: string;
    farmer_id: string;
    type: 'doctor_accepted' | 'doctor_visiting' | 'appointment_completed';
    title: string;
    message: string;
    appointment_id: string | null;
    is_read: boolean;
    created_at: string;
}

export default api;
