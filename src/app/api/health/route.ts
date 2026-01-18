import { NextResponse } from 'next/server';

/**
 * @description Health check endpoint
 * @response 200 - { status: string } - Service is healthy
 */
export async function GET() {
    return NextResponse.json({ status: 'ok' }, { status: 200 });
}
