/**
 * Unit tests for profileService
 *
 * AsyncStorage is replaced by the in-memory mock at src/__mocks__/async-storage.ts
 * via the moduleNameMapper in package.json — no real native code runs here.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    PROFILE_KEY,
    loadProfile,
    saveProfile,
    isProfileLocationComplete,
    type UserProfile,
} from '../profileService';

// Cast to access the test helper without TypeScript complaints
const mockStorage = AsyncStorage as typeof AsyncStorage & { __resetStore: () => void };

// ─── helpers ──────────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function makeProfile(overrides?: Partial<UserProfile>): UserProfile {
    return {
        userId: 'test-uuid-1234',
        name: 'Ramu Kaka',
        phone: '9876543210',
        farmerCategory: 'GENERAL',
        stateCode: 'BR',
        districtCode: 'BR-01',
        districtName: 'Patna',
        blockCode: 'BR-01-01',
        blockName: 'Phulwarisharif',
        panchayatCode: 'BR-01-01-01',
        panchayatName: 'Mahua',
        ...overrides,
    };
}

// ─── loadProfile ──────────────────────────────────────────────────────────────

describe('loadProfile', () => {
    beforeEach(() => {
        mockStorage.__resetStore();
    });

    it('returns a default profile when AsyncStorage is empty', async () => {
        const profile = await loadProfile();

        expect(profile.name).toBe('');
        expect(profile.phone).toBe('');
        expect(profile.farmerCategory).toBe('GENERAL');
        expect(profile.stateCode).toBe('');
        expect(profile.userId).toMatch(UUID_REGEX);
    });

    it('returns the stored profile when one exists', async () => {
        const stored = makeProfile();
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(stored));

        const profile = await loadProfile();

        expect(profile.name).toBe('Ramu Kaka');
        expect(profile.phone).toBe('9876543210');
        expect(profile.userId).toBe('test-uuid-1234');
        expect(profile.stateCode).toBe('BR');
        expect(profile.districtCode).toBe('BR-01');
    });

    it('generates and persists a userId if the stored profile is missing one', async () => {
        const incomplete = makeProfile({ userId: '' });
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(incomplete));
        // Clear call history from the setup above so we only capture what loadProfile does
        (AsyncStorage.setItem as jest.Mock).mockClear();

        const profile = await loadProfile();

        expect(profile.userId).toMatch(UUID_REGEX);
        // saveProfile should have been called once to persist the new UUID
        expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
        const savedJson = (AsyncStorage.setItem as jest.Mock).mock.calls[0]?.[1];
        expect(savedJson).toBeDefined();
        const saved = JSON.parse(savedJson as string) as UserProfile;
        expect(saved.userId).toBe(profile.userId);
    });

    it('returns a default profile when AsyncStorage.getItem throws', async () => {
        (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('storage unavailable'));

        const profile = await loadProfile();

        expect(profile.name).toBe('');
        expect(profile.userId).toMatch(UUID_REGEX);
    });

    it('generates unique userIds across separate default-profile calls', async () => {
        const a = await loadProfile();
        mockStorage.__resetStore();
        const b = await loadProfile();

        expect(a.userId).not.toBe(b.userId);
    });
});

// ─── saveProfile ──────────────────────────────────────────────────────────────

describe('saveProfile', () => {
    beforeEach(() => {
        mockStorage.__resetStore();
    });

    it('persists the profile as JSON under PROFILE_KEY', async () => {
        const profile = makeProfile();
        await saveProfile(profile);

        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
            PROFILE_KEY,
            JSON.stringify(profile),
        );
    });

    it('round-trips: a saved profile can be loaded back intact', async () => {
        const profile = makeProfile();
        await saveProfile(profile);
        const loaded = await loadProfile();

        expect(loaded).toEqual(profile);
    });

    it('overwrites a previously saved profile', async () => {
        await saveProfile(makeProfile({ name: 'Old Name' }));
        await saveProfile(makeProfile({ name: 'New Name' }));

        const loaded = await loadProfile();
        expect(loaded.name).toBe('New Name');
    });
});

// ─── isProfileLocationComplete ────────────────────────────────────────────────

describe('isProfileLocationComplete', () => {
    it('returns true when all four location fields are present', () => {
        expect(isProfileLocationComplete(makeProfile())).toBe(true);
    });

    it('returns false when stateCode is missing', () => {
        expect(isProfileLocationComplete(makeProfile({ stateCode: '' }))).toBe(false);
    });

    it('returns false when districtCode is missing', () => {
        expect(isProfileLocationComplete(makeProfile({ districtCode: undefined }))).toBe(false);
    });

    it('returns false when blockCode is missing', () => {
        expect(isProfileLocationComplete(makeProfile({ blockCode: '' }))).toBe(false);
    });

    it('returns false when panchayatCode is missing', () => {
        expect(isProfileLocationComplete(makeProfile({ panchayatCode: undefined }))).toBe(false);
    });

    it('returns false for a brand-new empty profile', () => {
        const empty: UserProfile = {
            userId: 'x',
            name: '',
            phone: '',
            farmerCategory: 'GENERAL',
            stateCode: '',
        };
        expect(isProfileLocationComplete(empty)).toBe(false);
    });
});
