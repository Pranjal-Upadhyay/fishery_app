/**
 * WatermelonDB adapter selection.
 *
 * Native/dev-client builds get SQLite persistence. Expo Go does not ship
 * WatermelonDB's native WMDatabaseBridge, so it must use LokiJS to boot.
 */
import { NativeModules } from 'react-native';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
import migrations from './migrations';

const hasWatermelonNativeBridge = Boolean(NativeModules.WMDatabaseBridge);

const adapter = hasWatermelonNativeBridge ? new SQLiteAdapter({
    schema,
    migrations,
    dbName: 'fishing_god_db',
    // jsi: true enables the faster JSI bridge if the native module supports it.
    // Set to false if you hit a build error — it gracefully falls back.
    jsi: true,
    onSetUpError: (error: Error) => {
        console.error('[WatermelonDB] Database setup error:', error);
    },
}) : new LokiJSAdapter({
    schema,
    migrations,
    dbName: 'fishing_god_db_expo_go',
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    onSetUpError: (error: Error) => {
        console.error('[WatermelonDB] Expo Go database setup error:', error);
    },
});

export default adapter;
