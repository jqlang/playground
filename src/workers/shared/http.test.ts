import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeHttp } from './http';
import type { HttpType } from '@/schemas';

describe('executeHttp', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
        vi.stubGlobal('fetch', mockFetch);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        mockFetch.mockReset();
    });

    const createMockResponse = (data: unknown, ok = true, status = 200) => ({
        ok,
        status,
        json: () => Promise.resolve(data),
    });

    describe('basic HTTP requests', () => {
        it('executes GET request and processes JSON response', async () => {
            const http: HttpType = {
                method: 'GET',
                url: 'https://api.example.com/data',
            };
            mockFetch.mockResolvedValue(createMockResponse({ name: 'test' }));

            const result = await executeHttp(http, '.name');

            expect(mockFetch).toHaveBeenCalledWith(
                new URL('https://api.example.com/data'),
                { method: 'GET', headers: expect.any(Headers), body: undefined }
            );
            expect(result).toBe('"test"');
        });

        it('executes POST request with body', async () => {
            const http: HttpType = {
                method: 'POST',
                url: 'https://api.example.com/data',
                body: '{"input": "value"}',
            };
            mockFetch.mockResolvedValue(createMockResponse({ result: 42 }));

            const result = await executeHttp(http, '.result');

            expect(mockFetch).toHaveBeenCalledWith(
                new URL('https://api.example.com/data'),
                { method: 'POST', headers: expect.any(Headers), body: '{"input": "value"}' }
            );
            expect(result).toBe('42');
        });
    });

    describe('headers handling', () => {
        it('parses and sets JSON headers', async () => {
            const http: HttpType = {
                method: 'GET',
                url: 'https://api.example.com/data',
                headers: '{"Authorization": "Bearer token", "Content-Type": "application/json"}',
            };
            mockFetch.mockResolvedValue(createMockResponse({ data: 'test' }));

            await executeHttp(http, '.');

            const callArgs = mockFetch.mock.calls[0];
            const headers = callArgs[1].headers as Headers;
            expect(headers.get('Authorization')).toBe('Bearer token');
            expect(headers.get('Content-Type')).toBe('application/json');
        });

        it('throws error for invalid header JSON', async () => {
            const http: HttpType = {
                method: 'GET',
                url: 'https://api.example.com/data',
                headers: 'not valid json',
            };

            await expect(executeHttp(http, '.')).rejects.toThrow(
                'Failed to parse HTTP headers: Invalid JSON format'
            );
        });
    });

    describe('error handling', () => {
        it('throws error when http is undefined', async () => {
            await expect(executeHttp(undefined as unknown as HttpType, '.')).rejects.toThrow(
                'HTTP input is undefined'
            );
        });

        it('throws error for non-OK response', async () => {
            const http: HttpType = {
                method: 'GET',
                url: 'https://api.example.com/data',
            };
            mockFetch.mockResolvedValue(createMockResponse({}, false, 404));

            await expect(executeHttp(http, '.')).rejects.toThrow(
                'HTTP request failed with status 404'
            );
        });

        it('throws error for non-JSON response', async () => {
            const http: HttpType = {
                method: 'GET',
                url: 'https://api.example.com/data',
            };
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.reject(new Error('Unexpected token')),
            });

            await expect(executeHttp(http, '.')).rejects.toThrow(
                'HTTP response is not valid JSON'
            );
        });
    });

    describe('jq query execution', () => {
        it('applies jq query to response', async () => {
            const http: HttpType = {
                method: 'GET',
                url: 'https://api.example.com/data',
            };
            mockFetch.mockResolvedValue(
                createMockResponse({ users: [{ name: 'Alice' }, { name: 'Bob' }] })
            );

            const result = await executeHttp(http, '.users[0].name');

            expect(result).toBe('"Alice"');
        });

        it('passes options to jq', async () => {
            const http: HttpType = {
                method: 'GET',
                url: 'https://api.example.com/data',
            };
            mockFetch.mockResolvedValue(createMockResponse({ value: 'test' }));

            const result = await executeHttp(http, '.value', ['-r']);

            expect(result).toBe('test');
        });
    });
});
