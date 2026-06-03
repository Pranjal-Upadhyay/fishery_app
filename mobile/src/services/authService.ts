import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './apiService';
import { type LocationSelection } from '../components/LocationCascadePicker';
import { type UserProfile, saveProfile, loadProfile } from './profileService';

const TOKEN_KEY = '@fishing_god_token';
const AUTH_USER_KEY = '@fishing_god_auth_user';

export type BackendUserRole = 'FARMER' | 'DOCTOR' | 'ADMIN' | 'HATCHERY';

export interface AuthUser {
    id: string;
    role: BackendUserRole;
    name: string;
    phone: string;
    uid?: string;
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

    // ── Bucket 1 — gov survey Section A fields ──
    fatherOrHusbandName?: string;
    aadhaarNumber?: string;
    gender?: UserProfile['gender'];
    dateOfBirth?: string;
    educationLevel?: UserProfile['educationLevel'];
    householdSize?: number;
    farmingExperienceYears?: number;
    primaryOccupation?: UserProfile['primaryOccupation'];
    annualIncomeRange?: UserProfile['annualIncomeRange'];
    kccHolder?: boolean;
    bplHolder?: boolean;
    consentGiven?: boolean;
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

interface HatcherySignupPayload {
    role: 'HATCHERY';
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

export type SignupPayload = FarmerSignupPayload | DoctorSignupPayload | HatcherySignupPayload;

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

    // ── Bucket 1 — gov survey Section A fields ──
    fatherOrHusbandName?: string | null;
    aadhaarNumber?: string | null;
    gender?: UserProfile['gender'] | null;
    /** ISO YYYY-MM-DD */
    dateOfBirth?: string | null;
    educationLevel?: UserProfile['educationLevel'] | null;
    householdSize?: number | null;
    farmingExperienceYears?: number | null;
    primaryOccupation?: UserProfile['primaryOccupation'] | null;
    annualIncomeRange?: UserProfile['annualIncomeRange'] | null;
    kccHolder?: boolean | null;
    bplHolder?: boolean | null;
    consentGiven?: boolean;
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

            // Bucket 1 fields — prefer server, fall back to local
            fatherOrHusbandName:    user.fatherOrHusbandName    ?? existing.fatherOrHusbandName,
            aadhaarNumber:          user.aadhaarNumber          ?? existing.aadhaarNumber,
            gender:                 user.gender                 ?? existing.gender,
            dateOfBirth:            user.dateOfBirth            ?? existing.dateOfBirth,
            educationLevel:         user.educationLevel         ?? existing.educationLevel,
            householdSize:          user.householdSize          ?? existing.householdSize,
            farmingExperienceYears: user.farmingExperienceYears ?? existing.farmingExperienceYears,
            primaryOccupation:      user.primaryOccupation      ?? existing.primaryOccupation,
            annualIncomeRange:      user.annualIncomeRange      ?? existing.annualIncomeRange,
            kccHolder:              user.kccHolder              ?? existing.kccHolder,
            bplHolder:              user.bplHolder              ?? existing.bplHolder,
            consentGiven:           user.consentGiven           ?? existing.consentGiven,
        });
    }
}

function normalizeAuthUser(raw: any): AuthUser {
    return {
        id: raw.id,
        role: raw.role,
        name: raw.name,
        phone: raw.phone || raw.phone_number,
        uid: raw.uid,
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

        fatherOrHusbandName:    raw.fatherOrHusbandName ?? undefined,
        aadhaarNumber:          raw.aadhaarNumber ?? undefined,
        gender:                 raw.gender ?? undefined,
        dateOfBirth:            raw.dateOfBirth ?? undefined,
        educationLevel:         raw.educationLevel ?? undefined,
        householdSize:          raw.householdSize ?? undefined,
        farmingExperienceYears: raw.farmingExperienceYears ?? undefined,
        primaryOccupation:      raw.primaryOccupation ?? undefined,
        annualIncomeRange:      raw.annualIncomeRange ?? undefined,
        kccHolder:              raw.kccHolder ?? undefined,
        bplHolder:              raw.bplHolder ?? undefined,
        consentGiven:           raw.consentGiven ?? undefined,
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

                fatherOrHusbandName:    payload.fatherOrHusbandName ?? null,
                aadhaarNumber:          payload.aadhaarNumber ?? null,
                gender:                 payload.gender ?? null,
                dateOfBirth:            payload.dateOfBirth ?? null,
                educationLevel:         payload.educationLevel ?? null,
                householdSize:          payload.householdSize ?? null,
                farmingExperienceYears: payload.farmingExperienceYears ?? null,
                primaryOccupation:      payload.primaryOccupation ?? null,
                annualIncomeRange:      payload.annualIncomeRange ?? null,
                kccHolder:              payload.kccHolder ?? null,
                bplHolder:              payload.bplHolder ?? null,
                consentGiven:           payload.consentGiven,
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
