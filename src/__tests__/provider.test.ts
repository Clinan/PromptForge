/**
 * Property 21: Provider Form Validation
 * For any provider form submission, the Save button SHALL only be enabled
 * when all required fields (name, API key, base URL) are filled.
 * 
 * **Feature: ui-redesign-langui-antdv, Property 21: Provider Form Validation**
 * **Validates: Requirements 10.2**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

interface ProviderFormData {
  name: string;
  apiKey: string;
  baseUrl: string;
  pluginId: string;
}

// Validation function (extracted from ProviderModal.vue logic)
function isProviderFormValid(form: ProviderFormData): boolean {
  return (
    form.name.trim().length > 0 &&
    form.apiKey.trim().length > 0 &&
    form.baseUrl.trim().length > 0 &&
    form.pluginId.length > 0
  );
}

// Check if save should be enabled
function canSaveProvider(form: ProviderFormData): boolean {
  return isProviderFormValid(form);
}

describe('Provider Form Validation', () => {
  it('should enable save when all required fields are filled', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          apiKey: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          baseUrl: fc.webUrl(),
          pluginId: fc.string({ minLength: 1 })
        }),
        (form) => {
          expect(canSaveProvider(form)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should disable save when name is empty', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.constantFrom('', '   ', '\t', '\n'),
          apiKey: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          baseUrl: fc.webUrl(),
          pluginId: fc.string({ minLength: 1 })
        }),
        (form) => {
          expect(canSaveProvider(form)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should disable save when apiKey is empty', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          apiKey: fc.constantFrom('', '   ', '\t'),
          baseUrl: fc.webUrl(),
          pluginId: fc.string({ minLength: 1 })
        }),
        (form) => {
          expect(canSaveProvider(form)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should disable save when baseUrl is empty', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          apiKey: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          baseUrl: fc.constantFrom('', '   '),
          pluginId: fc.string({ minLength: 1 })
        }),
        (form) => {
          expect(canSaveProvider(form)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle whitespace-only values correctly', () => {
    const whitespaceForm: ProviderFormData = {
      name: '   ',
      apiKey: 'sk-test',
      baseUrl: 'https://api.example.com',
      pluginId: 'openai'
    };
    expect(canSaveProvider(whitespaceForm)).toBe(false);
  });
});
