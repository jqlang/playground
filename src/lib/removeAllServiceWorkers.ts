import * as Sentry from '@sentry/nextjs';

export const removeAllServiceWorkers = async (): Promise<void> => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        console.log('Service workers not supported or not in browser environment');
        return;
    }

    try {
        console.log('Removing all service workers...');

        // Get all service worker registrations
        const registrations = await navigator.serviceWorker.getRegistrations();

        if (registrations.length === 0) {
            console.log('No service workers found');
        } else {
            console.log(`Found ${registrations.length} service worker(s) to remove`);

            // Track registrations for Sentry context
            const registrationInfo = registrations.map(reg => ({
                scope: reg.scope,
                state: reg.active?.state,
                scriptURL: reg.active?.scriptURL
            }));

            // Unregister all of them
            const unregisterResults = await Promise.allSettled(
                registrations.map(async (registration) => {
                    console.log('Unregistering SW:', registration.scope);
                    return registration.unregister();
                })
            );

            // Check for any failed unregistrations
            const failedUnregistrations = unregisterResults
                .map((result, index) => ({ result, index }))
                .filter(({ result }) => result.status === 'rejected');

            if (failedUnregistrations.length > 0) {
                failedUnregistrations.forEach(({ result, index }) => {
                    Sentry.captureException(
                        new Error(`Failed to unregister service worker: ${registrations[index].scope}`),
                        {
                            tags: { operation: 'service-worker-unregister' },
                            extra: {
                                scope: registrations[index].scope,
                                error: result.status === 'rejected' ? result.reason : 'Unknown error'
                            }
                        }
                    );
                });
            }
        }

        // Clear Cache API (HTTP caches)
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            if (cacheNames.length > 0) {
                console.log('Clearing Cache API caches:', cacheNames);

                const cacheResults = await Promise.allSettled(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );

                // Check for any failed cache deletions
                const failedCaches = cacheResults
                    .map((result, index) => ({ result, index }))
                    .filter(({ result }) => result.status === 'rejected');

                if (failedCaches.length > 0) {
                    failedCaches.forEach(({ result, index }) => {
                        Sentry.captureException(
                            new Error(`Failed to delete cache: ${cacheNames[index]}`),
                            {
                                tags: { operation: 'cache-cleanup' },
                                extra: {
                                    cacheName: cacheNames[index],
                                    error: result.status === 'rejected' ? result.reason : 'Unknown error'
                                }
                            }
                        );
                    });
                }
            }
        }

        // Clear IndexedDB databases (including Serwist data)
        if ('indexedDB' in window) {
            try {
                // Get list of databases (if supported)
                if ('databases' in indexedDB) {
                    const databases = await indexedDB.databases();
                    console.log('Found IndexedDB databases:', databases.map(db => db.name));

                    // Delete databases that might be related to service workers or Serwist
                    const swRelatedDatabases = databases.filter(db =>
                        db.name && (
                            db.name.includes('serwist') ||
                            db.name.includes('workbox') ||
                            db.name.includes('sw-') ||
                            db.name.includes('service-worker') ||
                            db.name.includes('precache') ||
                            db.name.includes('routing')
                        )
                    );

                    if (swRelatedDatabases.length > 0) {
                        console.log('Deleting service worker related databases:', swRelatedDatabases.map(db => db.name));

                        const dbDeleteResults = await Promise.allSettled(
                            swRelatedDatabases.map(db => {
                                return new Promise<void>((resolve, reject) => {
                                    if (!db.name) {
                                        resolve();
                                        return;
                                    }

                                    const deleteRequest = indexedDB.deleteDatabase(db.name);
                                    deleteRequest.onsuccess = () => {
                                        console.log(`Deleted IndexedDB: ${db.name}`);
                                        resolve();
                                    };
                                    deleteRequest.onerror = () => {
                                        reject(new Error(`Failed to delete IndexedDB: ${db.name}`));
                                    };
                                    deleteRequest.onblocked = () => {
                                        console.warn(`Delete blocked for IndexedDB: ${db.name}`);
                                        // Still resolve as the delete might succeed later
                                        resolve();
                                    };
                                });
                            })
                        );

                        // Check for any failed database deletions
                        const failedDbDeletes = dbDeleteResults
                            .map((result, index) => ({ result, index }))
                            .filter(({ result }) => result.status === 'rejected');

                        if (failedDbDeletes.length > 0) {
                            failedDbDeletes.forEach(({ result, index }) => {
                                Sentry.captureException(
                                    new Error(`Failed to delete IndexedDB: ${swRelatedDatabases[index].name}`),
                                    {
                                        tags: { operation: 'indexeddb-cleanup' },
                                        extra: {
                                            databaseName: swRelatedDatabases[index].name,
                                            error: result.status === 'rejected' ? result.reason : 'Unknown error'
                                        }
                                    }
                                );
                            });
                        }
                    }
                } else {
                    console.log('indexedDB.databases() not supported, cannot list databases');

                    // Fallback: Try to delete known Serwist database names
                    const knownSerwistDbs = ['serwist-expiration', 'workbox-expiration', 'serwist-precache'];

                    await Promise.allSettled(
                        knownSerwistDbs.map(dbName => {
                            return new Promise<void>((resolve) => {
                                const deleteRequest = indexedDB.deleteDatabase(dbName);
                                deleteRequest.onsuccess = () => {
                                    console.log(`Deleted known Serwist DB: ${dbName}`);
                                    resolve();
                                };
                                deleteRequest.onerror = () => {
                                    console.log(`DB ${dbName} didn't exist or couldn't be deleted`);
                                    resolve(); // Don't fail for non-existent DBs
                                };
                                deleteRequest.onblocked = () => {
                                    console.warn(`Delete blocked for DB: ${dbName}`);
                                    resolve();
                                };
                            });
                        })
                    );
                }
            } catch (error) {
                console.error('Error clearing IndexedDB:', error);
                Sentry.captureException(error, {
                    tags: { operation: 'indexeddb-cleanup' },
                    extra: { message: 'Failed to clear IndexedDB databases' }
                });
            }
        }

        // Clear Local Storage items related to service workers
        if ('localStorage' in window) {
            try {
                const localStorageKeys = Object.keys(localStorage);
                const swRelatedKeys = localStorageKeys.filter(key =>
                    key.includes('serwist') ||
                    key.includes('workbox') ||
                    key.includes('sw-') ||
                    key.includes('service-worker')
                );

                if (swRelatedKeys.length > 0) {
                    console.log('Clearing service worker related localStorage items:', swRelatedKeys);
                    swRelatedKeys.forEach(key => localStorage.removeItem(key));
                }
            } catch (error) {
                console.error('Error clearing localStorage:', error);
                Sentry.captureException(error, {
                    tags: { operation: 'localstorage-cleanup' }
                });
            }
        }

        // Clear Session Storage items related to service workers
        if ('sessionStorage' in window) {
            try {
                const sessionStorageKeys = Object.keys(sessionStorage);
                const swRelatedKeys = sessionStorageKeys.filter(key =>
                    key.includes('serwist') ||
                    key.includes('workbox') ||
                    key.includes('sw-') ||
                    key.includes('service-worker')
                );

                if (swRelatedKeys.length > 0) {
                    console.log('Clearing service worker related sessionStorage items:', swRelatedKeys);
                    swRelatedKeys.forEach(key => sessionStorage.removeItem(key));
                }
            } catch (error) {
                console.error('Error clearing sessionStorage:', error);
                Sentry.captureException(error, {
                    tags: { operation: 'sessionstorage-cleanup' }
                });
            }
        }

        console.log('✅ All service workers and storage cleared successfully');

        // Report successful cleanup to Sentry
        Sentry.addBreadcrumb({
            message: `Successfully cleaned up service workers and storage`,
            level: 'info',
            category: 'service-worker-cleanup',
            data: {
                serviceWorkersRemoved: registrations.length,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: unknown) {
        console.error('❌ Failed to remove service workers:', error);

        // Report error to Sentry with comprehensive context
        Sentry.captureException(error, {
            tags: {
                operation: 'service-worker-cleanup',
                location: 'removeAllServiceWorkers'
            },
            extra: {
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
                serviceWorkerSupport: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
                cacheSupport: typeof window !== 'undefined' && 'caches' in window,
                indexedDBSupport: typeof window !== 'undefined' && 'indexedDB' in window,
                timestamp: new Date().toISOString(),
                url: typeof window !== 'undefined' ? window.location.href : 'unknown'
            },
            level: 'error'
        });
    }
};
