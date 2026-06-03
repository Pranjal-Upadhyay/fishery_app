import AsyncStorage from '@react-native-async-storage/async-storage';

export const PROFILE_KEY = '@fishing_god_profile';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
export type EducationLevel =
    | 'NONE' | 'PRIMARY' | 'SECONDARY' | 'HIGHER_SECONDARY' | 'GRADUATE' | 'POSTGRADUATE';
export type PrimaryOccupation =
    | 'FISH_FARMING' | 'AGRICULTURE' | 'DAIRY' | 'LABOUR' | 'BUSINESS' | 'SERVICE' | 'OTHER';
export type IncomeRange = 'LT_50K' | '50K_1L' | '1L_3L' | '3L_5L' | 'GT_5L';

export interface UserProfile {
    userId: string;
    name: string;
    phone: string;
    farmerCategory: 'GENERAL' | 'WOMEN' | 'SC' | 'ST';
    stateCode: string;
    districtCode?: string;
    districtName?: string;
    blockCode?: string;
    blockName?: string;
    panchayatCode?: string;
    panchayatName?: string;

    // ── Bucket 1 — gov survey Section A fields ──
    fatherOrHusbandName?: string;
    aadhaarNumber?: string;
    gender?: Gender;
    /** ISO YYYY-MM-DD */
    dateOfBirth?: string;
    educationLevel?: EducationLevel;
    householdSize?: number;
    farmingExperienceYears?: number;
    primaryOccupation?: PrimaryOccupation;
    annualIncomeRange?: IncomeRange;
    kccHolder?: boolean;
    bplHolder?: boolean;
    consentGiven?: boolean;
    consentGivenAt?: string;
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export async function loadProfile(): Promise<UserProfile> {
    try {
        const json = await AsyncStorage.getItem(PROFILE_KEY);
        if (json) {
            const p = JSON.parse(json) as UserProfile;
            if (!p.userId) {
                p.userId = generateUUID();
                await saveProfile(p);
            }
            return p;
        }
    } catch { }
    return { userId: generateUUID(), name: '', phone: '', farmerCategory: 'GENERAL', stateCode: '' };
}

export async function saveProfile(profile: UserProfile): Promise<void> {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function isProfileLocationComplete(profile: UserProfile): boolean {
    return !!(profile.stateCode && profile.districtCode && profile.blockCode && profile.panchayatCode);
}
