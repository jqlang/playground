import { describe, it, expect } from 'vitest';
import { Snippet, Options, Option } from './snippet';

describe('Option schema', () => {
    it('accepts valid jq options', () => {
        expect(Option.parse('-c')).toBe('-c');
        expect(Option.parse('-n')).toBe('-n');
        expect(Option.parse('-R')).toBe('-R');
        expect(Option.parse('-r')).toBe('-r');
        expect(Option.parse('-s')).toBe('-s');
        expect(Option.parse('-S')).toBe('-S');
    });

    it('rejects invalid options', () => {
        expect(() => Option.parse('-x')).toThrow();
        expect(() => Option.parse('--compact')).toThrow();
        expect(() => Option.parse('')).toThrow();
    });
});

describe('Options schema', () => {
    it('accepts array of valid options', () => {
        expect(Options.parse(['-c', '-r'])).toEqual(['-c', '-r']);
        expect(Options.parse([])).toEqual([]);
    });

    it('rejects array with invalid options', () => {
        expect(() => Options.parse(['-c', '-invalid'])).toThrow();
    });
});

describe('Snippet schema', () => {
    describe('valid inputs', () => {
        it('accepts snippet with json', () => {
            const result = Snippet.parse({
                json: '{"a": 1}',
                query: '.a',
            });
            expect(result.json).toBe('{"a": 1}');
            expect(result.query).toBe('.a');
        });

        it('accepts snippet with http', () => {
            const result = Snippet.parse({
                http: {
                    method: 'GET',
                    url: 'https://example.com/api',
                },
                query: '.',
            });
            expect(result.http?.method).toBe('GET');
            expect(result.http?.url).toBe('https://example.com/api');
        });

        it('accepts snippet with options', () => {
            const result = Snippet.parse({
                json: '{}',
                query: '.',
                options: ['-c', '-r'],
            });
            expect(result.options).toEqual(['-c', '-r']);
        });

        it('accepts null json when http is provided', () => {
            const result = Snippet.parse({
                json: null,
                http: {
                    method: 'GET',
                    url: 'https://example.com',
                },
                query: '.',
            });
            expect(result.json).toBeNull();
            expect(result.http).toBeDefined();
        });
    });

    describe('refinement: json XOR http', () => {
        it('rejects when both json and http are provided', () => {
            expect(() => Snippet.parse({
                json: '{}',
                http: {
                    method: 'GET',
                    url: 'https://example.com',
                },
                query: '.',
            })).toThrow('Either JSON or HTTP must be provided');
        });

        it('rejects when neither json nor http is provided', () => {
            expect(() => Snippet.parse({
                query: '.',
            })).toThrow('Either JSON or HTTP must be provided');
        });

        it('rejects when both are null', () => {
            expect(() => Snippet.parse({
                json: null,
                http: null,
                query: '.',
            })).toThrow('Either JSON or HTTP must be provided');
        });
    });

    describe('query validation', () => {
        it('requires query to be non-empty', () => {
            expect(() => Snippet.parse({
                json: '{}',
                query: '',
            })).toThrow();
        });

        it('accepts long but valid queries', () => {
            const longQuery = '.a'.repeat(1000);
            const result = Snippet.parse({
                json: '{}',
                query: longQuery,
            });
            expect(result.query).toBe(longQuery);
        });
    });
});
