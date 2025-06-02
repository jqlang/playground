import * as Sentry from '@sentry/nextjs';

// Constants
const DEFAULT_TIMEOUT_MS = 5000;
const POLLING_DELAY_MS = 100;
const REFRESH_DELAY_MS = 500;
const ERROR_REFRESH_DELAY_MS = 1000;

// Types
interface ServiceWorkerInfo {
    scope: string;
    state?: ServiceWorkerState;
    scriptURL?: string;
}

interface CleanupStats {
    serviceWorkersRemoved: number;
    cachesCleared: number;
    indexedDbsDeleted: number;
    localStorageKeysRemoved: number;
    sessionStorageKeysRemoved: number;
}

// Helper function to check if a key/name is service worker related
const isServiceWorkerRelated = (name: string): boolean => {
    const patterns = ['serwist', 'workbox', 'sw-', 'service-worker', 'precache', 'routing'];
    return patterns.some(pattern => name.includes(pattern));
};

// Helper function to create browser info for Sentry
const getBrowserInfo = () => ({
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    serviceWorkerSupport: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    cacheSupport: typeof window !== 'undefined' && 'caches' in window,
    indexedDBSupport: typeof window !== 'undefined' && 'indexedDB' in window,
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    timestamp: new Date().toISOString()
});

// Function to wait for service workers to be fully unregistered
const waitForServiceWorkerCleanup = async (timeoutMs = DEFAULT_TIMEOUT_MS): Promise<boolean> => {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            if (registrations.length === 0) {
                return true;
            }

            const stillActive = registrations.some(reg => reg.active !== null);
            if (!stillActive) {
                return true;
            }

            await new Promise(resolve => setTimeout(resolve, POLLING_DELAY_MS));
        } catch (error) {
            console.error('Error checking service worker status:', error);
            break;
        }
    }

    return false;
};

// Function to force refresh the page with cache busting
const forceRefreshWithCacheBust = (): void => {
    try {
        const url = new URL(window.location.href);
        url.searchParams.set('_sw_cleanup', Date.now().toString());

        // Use location.replace to avoid adding to history and ensure cache bypass
        window.location.replace(url.toString());
    } catch (error) {
        // Fallback to simple reload if URL manipulation fails
        console.error('Failed to create cache-bust URL, using simple reload:', error);
        window.location.reload();
    }
};

// Service worker cleanup
const cleanupServiceWorkers = async (): Promise<{ removed: number; info: ServiceWorkerInfo[] }> => {
    const registrations = await navigator.serviceWorker.getRegistrations();

    if (registrations.length === 0) {
        return { removed: 0, info: [] };
    }

    console.log(`Found ${registrations.length} service worker(s) to remove`);

    const registrationInfo: ServiceWorkerInfo[] = registrations.map(reg => ({
        scope: reg.scope,
        state: reg.active?.state,
        scriptURL: reg.active?.scriptURL
    }));

    const unregisterResults = await Promise.allSettled(
        registrations.map(async (registration) => {
            console.log('Unregistering SW:', registration.scope);
            return registration.unregister();
        })
    );

    // Log failed unregistrations
    const failures = unregisterResults
        .map((result, index) => ({ result, index }))
        .filter(({ result }) => result.status === 'rejected');

    if (failures.length > 0) {
        failures.forEach(({ result, index }) => {
            const error = new Error(`Failed to unregister service worker: ${registrations[index].scope}`);
            console.error(error);

            Sentry.captureException(error, {
                tags: { operation: 'service-worker-unregister' },
                extra: {
                    scope: registrations[index].scope,
                    error: result.status === 'rejected' ? result.reason : 'Unknown error',
                    registrationInfo: registrationInfo[index],
                    ...getBrowserInfo()
                }
            });
        });
    }

    // Wait for cleanup to complete
    console.log('Waiting for service workers to be fully unregistered...');
    const cleanupSuccess = await waitForServiceWorkerCleanup();

    if (!cleanupSuccess) {
        console.warn('Service workers may not be fully unregistered yet');
    }

    const successfullyUnregisteredCount = unregisterResults.filter(result => result.status === 'fulfilled').length;
    return { removed: successfullyUnregisteredCount, info: registrationInfo };
};

// Cache cleanup
const cleanupCaches = async (): Promise<number> => {
    if (!('caches' in window)) {
        return 0;
    }

    const cacheNames = await caches.keys();
    if (cacheNames.length === 0) {
        return 0;
    }

    console.log('Clearing Cache API caches:', cacheNames);

    const results = await Promise.allSettled(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );

    const failures = results
        .map((result, index) => ({ result, index }))
        .filter(({ result }) => result.status === 'rejected');

    if (failures.length > 0) {
        failures.forEach(({ result, index }) => {
            const error = new Error(`Failed to delete cache: ${cacheNames[index]}`);
            console.error(error);

            Sentry.captureException(error, {
                tags: { operation: 'cache-cleanup' },
                extra: {
                    cacheName: cacheNames[index],
                    error: result.status === 'rejected' ? result.reason : 'Unknown error',
                    ...getBrowserInfo()
                }
            });
        });
    }

    return cacheNames.length;
};

// IndexedDB cleanup
const cleanupIndexedDB = async (): Promise<number> => {
    if (!('indexedDB' in window)) {
        return 0;
    }

    try {
        let databasesToDelete: string[] = [];

        if ('databases' in indexedDB) {
            const databases = await indexedDB.databases();
            console.log('Found IndexedDB databases:', databases.map(db => db.name));

            databasesToDelete = databases
                .filter(db => db.name && isServiceWorkerRelated(db.name))
                .map(db => db.name!)
                .filter(Boolean);
        } else {
            console.log('indexedDB.databases() not supported, using known database names');
            databasesToDelete = ['serwist-expiration', 'workbox-expiration', 'serwist-precache'];
        }

        if (databasesToDelete.length === 0) {
            return 0;
        }

        console.log('Deleting service worker related databases:', databasesToDelete);

        const deletePromises = databasesToDelete.map(dbName =>
            new Promise<boolean>((resolve) => {
                const deleteRequest = indexedDB.deleteDatabase(dbName);

                deleteRequest.onsuccess = () => {
                    console.log(`✅ Deleted IndexedDB: ${dbName}`);
                    resolve(true);
                };

                deleteRequest.onerror = () => {
                    console.log(`❌ Failed to delete IndexedDB: ${dbName}`);
                    resolve(false);
                };

                deleteRequest.onblocked = () => {
                    console.warn(`⚠️ Delete blocked for IndexedDB: ${dbName}`);
                    resolve(true); // Consider it successful since it will be deleted when unblocked
                };
            })
        );

        const results = await Promise.allSettled(deletePromises);
        const successCount = results
            .filter(result => result.status === 'fulfilled' && result.value)
            .length;

        return successCount;
    } catch (error) {
        console.error('Error clearing IndexedDB:', error);
        Sentry.captureException(error, {
            tags: { operation: 'indexeddb-cleanup' },
            extra: {
                message: 'Failed to clear IndexedDB databases',
                ...getBrowserInfo()
            }
        });
        return 0;
    }
};

// Storage cleanup helper
const cleanupStorage = (storage: Storage, storageName: string): number => {
    try {
        // Add null check for storage
        if (!storage) {
            console.log(`${storageName} is not available or null`);
            return 0;
        }

        const keys = Object.keys(storage);
        const swRelatedKeys = keys.filter(isServiceWorkerRelated);

        if (swRelatedKeys.length > 0) {
            console.log(`Clearing service worker related ${storageName} items:`, swRelatedKeys);
            swRelatedKeys.forEach(key => storage.removeItem(key));
        }

        return swRelatedKeys.length;
    } catch (error) {
        console.error(`Error clearing ${storageName}:`, error);
        Sentry.captureException(error, {
            tags: { operation: `${storageName.toLowerCase()}-cleanup` },
            extra: getBrowserInfo()
        });
        return 0;
    }
};

// Main export function
export const removeAllServiceWorkers = async (): Promise<void> => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        console.log('Service workers not supported or not in browser environment');
        return;
    }

    const stats: CleanupStats = {
        serviceWorkersRemoved: 0,
        cachesCleared: 0,
        indexedDbsDeleted: 0,
        localStorageKeysRemoved: 0,
        sessionStorageKeysRemoved: 0
    };

    let serviceWorkerInfo: ServiceWorkerInfo[] = [];

    try {
        console.log('🧹 Starting service worker cleanup...');

        // 1. Remove service workers
        const swResult = await cleanupServiceWorkers();
        stats.serviceWorkersRemoved = swResult.removed;
        serviceWorkerInfo = swResult.info;

        // 2. Clear caches
        stats.cachesCleared = await cleanupCaches();

        // 3. Clear IndexedDB
        stats.indexedDbsDeleted = await cleanupIndexedDB();

        // 4. Clear localStorage
        if ('localStorage' in window) {
            stats.localStorageKeysRemoved = cleanupStorage(localStorage, 'localStorage');
        }

        // 5. Clear sessionStorage
        if ('sessionStorage' in window) {
            stats.sessionStorageKeysRemoved = cleanupStorage(sessionStorage, 'sessionStorage');
        }

        console.log('✅ Service worker cleanup completed:', stats);

        // Report successful cleanup to Sentry
        Sentry.addBreadcrumb({
            message: 'Successfully cleaned up service workers and storage',
            level: 'info',
            category: 'service-worker-cleanup',
            data: {
                ...stats,
                serviceWorkerInfo,
                timestamp: new Date().toISOString()
            }
        });

        // Refresh page if service workers were found and removed
        if (stats.serviceWorkersRemoved > 0) {
            console.log('🔄 Refreshing page to load fresh content after service worker removal...');

            setTimeout(() => {
                forceRefreshWithCacheBust();
            }, REFRESH_DELAY_MS);
        }

    } catch (error: unknown) {
        console.error('❌ Failed to remove service workers:', error);

        // Report error to Sentry
        Sentry.captureException(error, {
            tags: {
                operation: 'service-worker-cleanup',
                location: 'removeAllServiceWorkers'
            },
            extra: {
                ...getBrowserInfo(),
                stats,
                serviceWorkerInfo
            },
            level: 'error'
        });

        // Refresh anyway if service workers were detected
        if (stats.serviceWorkersRemoved > 0) {
            console.log('🔄 Refreshing page despite errors to attempt fresh content load...');
            setTimeout(() => {
                forceRefreshWithCacheBust();
            }, ERROR_REFRESH_DELAY_MS);
        }
    }
};
