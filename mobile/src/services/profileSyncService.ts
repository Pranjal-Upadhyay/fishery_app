import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { authService, type PersistedProfilePayload } from './authService';

const PENDING_PROFILE_SYNC_KEY = '@fishing_god_pending_profile_sync';

let unsubscribeNetInfo: (() => void) | null = null;
let isProcessing = false;

export async function queuePendingProfileSync(payload: PersistedProfilePayload) {
  await AsyncStorage.setItem(PENDING_PROFILE_SYNC_KEY, JSON.stringify(payload));
}

export async function clearPendingProfileSync() {
  await AsyncStorage.removeItem(PENDING_PROFILE_SYNC_KEY);
}

export async function getPendingProfileSync(): Promise<PersistedProfilePayload | null> {
  const raw = await AsyncStorage.getItem(PENDING_PROFILE_SYNC_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PersistedProfilePayload;
  } catch {
    await clearPendingProfileSync();
    return null;
  }
}

export async function processPendingProfileSync() {
  if (isProcessing) return { success: false as const, skipped: true };

  const pending = await getPendingProfileSync();
  if (!pending) return { success: true as const, skipped: true };

  const netState = await NetInfo.fetch();
  if (!netState.isConnected || netState.isInternetReachable === false) {
    return { success: false as const, offline: true };
  }

  isProcessing = true;
  try {
    const result = await authService.updateProfile(pending);
    if (result.success) {
      await clearPendingProfileSync();
      return { success: true as const };
    }
    return { success: false as const, error: result.error };
  } finally {
    isProcessing = false;
  }
}

export function startProfileSyncListener() {
  if (unsubscribeNetInfo) {
    return unsubscribeNetInfo;
  }

  unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      void processPendingProfileSync();
    }
  });

  void processPendingProfileSync();
  return unsubscribeNetInfo;
}

export function stopProfileSyncListener() {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
}
