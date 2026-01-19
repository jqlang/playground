import { describe, it, expect } from 'vitest';
import { HttpMethodSchema, HttpHeadersSchema, HttpUrlSchema, HttpRequestSchema } from './http';

describe('HttpMethodSchema', () => {
    it('accepts valid HTTP methods', () => {
        expect(HttpMethodSchema.parse('GET')).toBe('GET');
        expect(HttpMethodSchema.parse('POST')).toBe('POST');
        expect(HttpMethodSchema.parse('PUT')).toBe('PUT');
        expect(HttpMethodSchema.parse('DELETE')).toBe('DELETE');
        expect(HttpMethodSchema.parse('PATCH')).toBe('PATCH');
        expect(HttpMethodSchema.parse('OPTIONS')).toBe('OPTIONS');
        expect(HttpMethodSchema.parse('HEAD')).toBe('HEAD');
    });

    it('rejects invalid HTTP methods', () => {
        expect(() => HttpMethodSchema.parse('get')).toThrow(); // lowercase
        expect(() => HttpMethodSchema.parse('CONNECT')).toThrow();
        expect(() => HttpMethodSchema.parse('')).toThrow();
    });
});

describe('HttpHeadersSchema', () => {
    it('accepts valid JSON headers', () => {
        expect(HttpHeadersSchema.parse('{"Content-Type": "application/json"}')).toBe('{"Content-Type": "application/json"}');
        expect(HttpHeadersSchema.parse('{"Authorization": "Bearer token"}')).toBe('{"Authorization": "Bearer token"}');
    });

    it('accepts empty string', () => {
        expect(HttpHeadersSchema.parse('')).toBe('');
    });

    it('accepts empty object JSON', () => {
        expect(HttpHeadersSchema.parse('{}')).toBe('{}');
    });

    it('accepts multiple headers', () => {
        const headers = JSON.stringify({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token',
            'X-Custom-Header': 'value',
        });
        expect(HttpHeadersSchema.parse(headers)).toBe(headers);
    });

    it('rejects invalid JSON', () => {
        expect(() => HttpHeadersSchema.parse('not json')).toThrow();
        expect(() => HttpHeadersSchema.parse('{invalid}')).toThrow();
    });

    it('rejects arrays', () => {
        expect(() => HttpHeadersSchema.parse('["header1", "header2"]')).toThrow();
    });

    it('rejects non-string values', () => {
        expect(() => HttpHeadersSchema.parse('{"key": 123}')).toThrow();
        expect(() => HttpHeadersSchema.parse('{"key": true}')).toThrow();
        expect(() => HttpHeadersSchema.parse('{"key": null}')).toThrow();
        expect(() => HttpHeadersSchema.parse('{"key": {"nested": "object"}}')).toThrow();
    });
});

describe('HttpUrlSchema', () => {
    it('accepts valid URLs', () => {
        expect(HttpUrlSchema.parse('https://example.com')).toBe('https://example.com');
        expect(HttpUrlSchema.parse('http://localhost:3000/api')).toBe('http://localhost:3000/api');
        expect(HttpUrlSchema.parse('https://api.example.com/v1/users?id=123')).toBe('https://api.example.com/v1/users?id=123');
    });

    it('rejects invalid URLs', () => {
        expect(() => HttpUrlSchema.parse('not-a-url')).toThrow();
        expect(() => HttpUrlSchema.parse('example.com')).toThrow(); // missing protocol
        expect(() => HttpUrlSchema.parse('')).toThrow();
    });
});

describe('HttpRequestSchema', () => {
    it('accepts valid request with required fields', () => {
        const result = HttpRequestSchema.parse({
            method: 'GET',
            url: 'https://example.com/api',
        });
        expect(result.method).toBe('GET');
        expect(result.url).toBe('https://example.com/api');
    });

    it('accepts request with optional headers', () => {
        const result = HttpRequestSchema.parse({
            method: 'POST',
            url: 'https://example.com/api',
            headers: '{"Content-Type": "application/json"}',
        });
        expect(result.headers).toBe('{"Content-Type": "application/json"}');
    });

    it('accepts request with optional body', () => {
        const result = HttpRequestSchema.parse({
            method: 'POST',
            url: 'https://example.com/api',
            body: '{"data": "test"}',
        });
        expect(result.body).toBe('{"data": "test"}');
    });

    it('accepts full request with all fields', () => {
        const result = HttpRequestSchema.parse({
            method: 'POST',
            url: 'https://example.com/api',
            headers: '{"Content-Type": "application/json"}',
            body: '{"key": "value"}',
        });
        expect(result.method).toBe('POST');
        expect(result.url).toBe('https://example.com/api');
        expect(result.headers).toBe('{"Content-Type": "application/json"}');
        expect(result.body).toBe('{"key": "value"}');
    });

    it('rejects request without method', () => {
        expect(() => HttpRequestSchema.parse({
            url: 'https://example.com',
        })).toThrow();
    });

    it('rejects request without url', () => {
        expect(() => HttpRequestSchema.parse({
            method: 'GET',
        })).toThrow();
    });
});
