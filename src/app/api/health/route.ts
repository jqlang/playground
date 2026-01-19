import { NextResponse } from 'next/server';
import { HealthResponse } from '@/schemas/api';

/**
 * Health check endpoint
 * @description Health check endpoint
 * @response 200:HealthResponseSchema
 */
export async function GET(): Promise<NextResponse<HealthResponse>> {
    return NextResponse.json({ status: 'ok' }, { status: 200 });
}
