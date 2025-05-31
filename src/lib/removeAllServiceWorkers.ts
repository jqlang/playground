import * as Sentry from '@sentry/nextjs';

// Helper function to check if a key/name is service worker related
const isServiceWorkerRelated = (name: string): boolean => {
    return name.includes('serwist') ||
        name.includes('workbox') ||
        name.includes('sw-') ||
        name.includes('service-worker') ||
        name.includes('precache') ||
        name.includes('routing');
};

// Function to wait for service workers to be fully unregistered
const waitForServiceWorkerCleanup = async (timeoutMs = 5000): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
        const start = Date.now();

        const check = async () => {
            const registrations = await navigator.serviceWorker.getRegistrations();
            if (registrations.length === 0) {
                resolve(true);
                return;
            }

            const stillRegistered = registrations.some(reg => reg.active !== undefined);
            if (!stillRegistered) {
                resolve(true);
                return;
            }

            if (Date.now() - start > timeoutMs) {
                resolve(false);
                return;
            }

            setTimeout(check, 100);
        };

        check();
    });
};

// Function to force refresh the page with cache busting
const forceRefreshWithCacheBust = (): void => {
    // Add cache-busting parameter and reload
    const url = new URL(window.location.href);
    url.searchParams.set('_sw_cleanup', Date.now().toString());

    // Use location.replace to avoid adding to history and ensure cache bypass
    window.location.replace(url.toString());
};

export const removeAllServiceWorkers = async (): Promise<void> => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        console.log('Service workers not supported or not in browser environment');
        return;
    }

    let hadServiceWorkers = false;

    try {
        console.log('Removing all service workers...');

        // Get all service worker registrations
        const registrations = await navigator.serviceWorker.getRegistrations();

        // Track registrations for Sentry context
        const registrationInfo = registrations.map(reg => ({
            scope: reg.scope,
            state: reg.active?.state,
            scriptURL: reg.active?.scriptURL
        }));

        if (registrations.length === 0) {
            console.log('No service workers found');
        } else {
            hadServiceWorkers = true;
            console.log(`Found ${registrations.length} service worker(s) to remove`);

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
                                error: result.status === 'rejected' ? result.reason : 'Unknown error',
                                registrationInfo: registrationInfo[index]
                            }
                        }
                    );
                });
            }

            // Wait for service workers to be fully unregistered
            console.log('Waiting for service workers to be fully unregistered...');
            const cleanupSuccess = await waitForServiceWorkerCleanup();

            if (!cleanupSuccess) {
                console.warn('Service workers may not be fully unregistered yet');
            }

            // Add registrationInfo to successful cleanup breadcrumb
            Sentry.addBreadcrumb({
                message: `Successfully unregistered ${registrations.length} service worker(s)`,
                level: 'info',
                category: 'service-worker-cleanup',
                data: {
                    serviceWorkersRemoved: registrations.length,
                    registrationInfo,
                    timestamp: new Date().toISOString()
                }
            });
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
                        db.name && isServiceWorkerRelated(db.name)
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
                                    resolve();
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
                const swRelatedKeys = localStorageKeys.filter(isServiceWorkerRelated);

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
                const swRelatedKeys = sessionStorageKeys.filter(isServiceWorkerRelated);

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
                registrationInfo: registrations.length > 0 ? registrationInfo : [],
                timestamp: new Date().toISOString(),
                hadServiceWorkers
            }
        });

        // Only refresh if we had service workers - they're the main issue
        if (hadServiceWorkers) {
            console.log('🔄 Refreshing page to load fresh content after service worker removal...');

            // The cleanup is already complete at this point since we waited for it above
            // Add a small delay to ensure any final cleanup operations are done
            setTimeout(() => {
                forceRefreshWithCacheBust();
            }, 500);
        }

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
                url: typeof window !== 'undefined' ? window.location.href : 'unknown',
                hadServiceWorkers
            },
            level: 'error'
        });

        // Even if there was an error, try to refresh if we detected service workers
        if (hadServiceWorkers) {
            console.log('🔄 Refreshing page despite errors to attempt fresh content load...');
            setTimeout(() => {
                forceRefreshWithCacheBust();
            }, 1000);
        }
    }
};
