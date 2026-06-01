/**
 * In-memory mock for @react-native-async-storage/async-storage.
 * Jest replaces the real module via moduleNameMapper in package.json.
 */

let store: Record<string, string> = {};

const AsyncStorage = {
    getItem: jest.fn(async (key: string): Promise<string | null> => {
        return store[key] ?? null;
    }),
    setItem: jest.fn(async (key: string, value: string): Promise<void> => {
        store[key] = value;
    }),
    removeItem: jest.fn(async (key: string): Promise<void> => {
        delete store[key];
    }),
    clear: jest.fn(async (): Promise<void> => {
        store = {};
    }),
    getAllKeys: jest.fn(async (): Promise<string[]> => {
        return Object.keys(store);
    }),
    multiGet: jest.fn(async (keys: string[]): Promise<[string, string | null][]> => {
        return keys.map((k) => [k, store[k] ?? null]);
    }),
    multiSet: jest.fn(async (pairs: [string, string][]): Promise<void> => {
        pairs.forEach(([k, v]) => { store[k] = v; });
    }),
    multiRemove: jest.fn(async (keys: string[]): Promise<void> => {
        keys.forEach((k) => { delete store[k]; });
    }),
    /** Test helper: reset the in-memory store and all mock call counts. */
    __resetStore: () => {
        store = {};
        AsyncStorage.getItem.mockClear();
        AsyncStorage.setItem.mockClear();
        AsyncStorage.removeItem.mockClear();
        AsyncStorage.clear.mockClear();
    },
};

export default AsyncStorage;
