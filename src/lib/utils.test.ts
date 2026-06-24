import { describe, it, expect } from 'vitest';
import { hasInputSource } from './utils';
import type { HttpType } from '@/schemas';

const http: HttpType = { method: 'GET', url: 'https://example.com' };

describe('hasInputSource', () => {
    it('is true when JSON is present', () => {
        expect(hasInputSource('{"a":1}', undefined, [])).toBe(true);
    });

    it('is true when HTTP is present', () => {
        expect(hasInputSource(undefined, http, [])).toBe(true);
    });

    it('is true for -n (null input) even with no json/http', () => {
        expect(hasInputSource(undefined, undefined, ['-n'])).toBe(true);
        expect(hasInputSource('', null, ['-r', '-n'])).toBe(true);
    });

    it('is false when there is no source and no -n', () => {
        expect(hasInputSource(undefined, undefined, [])).toBe(false);
        expect(hasInputSource('', null, ['-r'])).toBe(false);
    });
});
