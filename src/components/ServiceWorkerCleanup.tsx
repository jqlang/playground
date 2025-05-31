'use client';

import { useEffect, ReactNode } from 'react';
import { removeAllServiceWorkers } from '@/lib/removeAllServiceWorkers';

interface ServiceWorkerCleanupProps {
    children: ReactNode;
}

export default function ServiceWorkerCleanup({ children }: ServiceWorkerCleanupProps) {
    useEffect(() => {
        // Clean up service workers silently when component mounts
        removeAllServiceWorkers();
    }, []);

    return <>{children}</>;
}
