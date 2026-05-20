import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import schema from './schema';

const adapter = new LokiJSAdapter({
    schema,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
    dbName: 'fishing_god_db',
    onSetUpError: (error: Error) => {
        console.error('Database setup error:', error);
    }
});

export default adapter;
