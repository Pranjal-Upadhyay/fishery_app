import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './apiService';
import { type LocationSelection } from '../components/LocationCascadePicker';
import { type UserProfile, saveProfile, loadProfile } from '../screens/PersonalInfoScreen';

const TOKEN_KEY = '@fishing_god_token';
const AUTH_USER_KEY = '@fishing_god_auth_user';

export type BackendUserRole = 'FARMER' | 'DOCTOR' | 'ADMIN';

export interface AuthUser {
    id: string;
    role: BackendUserRole;
    name: string;
    phone: string;
    farmerCategory?: UserProfile['farmerCategory'];
    stateCode?: string;
    districtCode?: string;
    districtName?: string;
    blockCode?: string;
    blockName?: string;
    panchayatCode?: string;
    panchayatName?: string;
    doctorId?: string;
    doctorSpecialization?: string;
}

interface AuthResponse {
    success: boolean;
    error?: string;
    user?: AuthUser;
}

interface FarmerSignupPayload {
    role: 'FARMER';
    phone: string;
    password: string;
    name: string;
    stateCode: string;
    farmerCategory: UserProfile['farmerCategory'];
}

interface DoctorSignupPayload {
    role: 'DOCTOR';
    phone: string;
    password: string;
    name: string;
    stateCode: string;
    districtCode: string;
    districtName: string;
    blockCode: string;
    blockName: string;
    panchayatCode: string;
    panchayatName: string;
}

export type SignupPayload = FarmerSignupPayload | DoctorSignupPayload;
export interface PersistedProfilePayload {
    userId: string;
    name: string;
    farmerCategory: UserProfile['farmerCategory'];
    stateCode: string;
    districtCode?: string;
    districtName?: string;
    blockCode?: string;
    blockName?: string;
    panchayatCode?: string;
    panchayatName?: string;
}

async function persistAuthSuccess(user: AuthUser) {
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

    if (user.role === 'FARMER') {
        const existing = await loadProfile();
        await saveProfile({
            ...existing,
            userId: user.id,
            name: user.name,
            phone: user.phone,
            farmerCategory: user.farmerCategory || existing.farmerCategory || 'GENERAL',
            stateCode: user.stateCode || existing.stateCode || '',
            districtCode: user.districtCode || existing.districtCode,
            districtName: user.districtName || existing.districtName,
            blockCode: user.blockCode || existing.blockCode,
            blockName: user.blockName || existing.blockName,
            panchayatCode: user.panchayatCode || existing.panchayatCode,
            panchayatName: user.panchayatName || existing.panchayatName,
        });
    }
}

function normalizeAuthUser(raw: any): AuthUser {
    return {
        id: raw.id,
        role: raw.role,
        name: raw.name,
        phone: raw.phone || raw.phone_number,
        farmerCategory: raw.farmerCategory,
        stateCode: raw.stateCode,
        districtCode: raw.districtCode,
        districtName: raw.districtName,
        blockCode: raw.blockCode,
        blockName: raw.blockName,
        panchayatCode: raw.panchayatCode,
        panchayatName: raw.panchayatName,
        doctorId: raw.doctorId,
        doctorSpecialization: raw.doctorSpecialization,
    };
}

export const authService = {
    login: async (phone: string, password: string): Promise<AuthResponse> => {
        try {
            const res = await api.post('/api/v1/auth/login', { phone, password });
            if (!res.data.success) {
                return { success: false, error: res.data.error || 'Login failed' };
            }

            await AsyncStorage.setItem(TOKEN_KEY, res.data.token);
            const user = normalizeAuthUser(res.data.user);
            await persistAuthSuccess(user);
            return { success: true, user };
        } catch (error: any) {
            const fallbackMessage =
                error.code === 'ECONNABORTED'
                    ? 'Request timed out while connecting to the backend'
                    : error.message || 'Invalid phone or password';
            return { success: false, error: error.response?.data?.error || fallbackMessage };
        }
    },

    signup: async (payload: SignupPayload): Promise<AuthResponse> => {
        try {
            const res = await api.post('/api/v1/auth/signup', payload);
            if (!res.data.success) {
                return { success: false, error: res.data.error || 'Signup failed' };
            }

            await AsyncStorage.setItem(TOKEN_KEY, res.data.token);
            const user = normalizeAuthUser(res.data.user);
            await persistAuthSuccess(user);
            return { success: true, user };
        } catch (error: any) {
            const fallbackMessage =
                error.code === 'ECONNABORTED'
                    ? 'Request timed out while connecting to the backend'
                    : error.message || 'An error occurred during signup';
            return { success: false, error: error.response?.data?.error || fallbackMessage };
        }
    },

    logout: async () => {
        await AsyncStorage.removeItem(TOKEN_KEY);
        await AsyncStorage.removeItem(AUTH_USER_KEY);
    },

    getToken: async () => {
        return AsyncStorage.getItem(TOKEN_KEY);
    },

    getCurrentUser: async (): Promise<AuthUser | null> => {
        const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
        return raw ? (JSON.parse(raw) as AuthUser) : null;
    },

    isAuthenticated: async () => {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        const user = await AsyncStorage.getItem(AUTH_USER_KEY);
        return Boolean(token && user);
    },

    updateProfile: async (payload: PersistedProfilePayload): Promise<AuthResponse> => {
        try {
            const res = await api.patch(`/api/v1/auth/profile/${payload.userId}`, {
                name: payload.name,
                farmerCategory: payload.farmerCategory,
                stateCode: payload.stateCode,
                districtCode: payload.districtCode || null,
                blockCode: payload.blockCode || null,
                panchayatCode: payload.panchayatCode || null,
            });

            if (!res.data.success || !res.data.user) {
                return { success: false, error: res.data.error || 'Profile sync failed' };
            }

            const user = normalizeAuthUser(res.data.user);
            await persistAuthSuccess(user);
            return { success: true, user };
        } catch (error: any) {
            const fallbackMessage =
                error.code === 'ECONNABORTED'
                    ? 'Request timed out while syncing profile'
                    : error.response?.data?.error || error.message || 'Profile sync failed';
            return { success: false, error: fallbackMessage };
        }
    },
};
