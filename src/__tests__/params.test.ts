/**
 * Property 12: Parameter Validation
 * For any parameter input (temperature, top_p, max_tokens), the system SHALL
 * validate that values are numeric and within acceptable ranges.
 * 
 * **Feature: ui-redesign-langui-antdv, Property 12: Parameter Validation**
 * **Validates: Requirements 6.2**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

interface ModelParams {
  temperature: number;
  top_p: number;
  max_tokens: number;
}

// Parameter constraints
const PARAM_CONSTRAINTS = {
  temperature: { min: 0, max: 2 },
  top_p: { min: 0, max: 1 },
  max_tokens: { min: 1, max: 128000 }
};

// Validation functions (extracted from ParamsModal.vue logic)
function isValidTemperature(value: number): boolean {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= PARAM_CONSTRAINTS.temperature.min &&
    value <= PARAM_CONSTRAINTS.temperature.max
  );
}

function isValidTopP(value: number): boolean {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= PARAM_CONSTRAINTS.top_p.min &&
    value <= PARAM_CONSTRAINTS.top_p.max
  );
}

function isValidMaxTokens(value: number): boolean {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= PARAM_CONSTRAINTS.max_tokens.min &&
    value <= PARAM_CONSTRAINTS.max_tokens.max
  );
}

function validateParams(params: ModelParams): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!isValidTemperature(params.temperature)) {
    errors.push('Temperature must be between 0 and 2');
  }
  if (!isValidTopP(params.top_p)) {
    errors.push('Top P must be between 0 and 1');
  }
  if (!isValidMaxTokens(params.max_tokens)) {
    errors.push('Max tokens must be an integer between 1 and 128000');
  }
  
  return { valid: errors.length === 0, errors };
}

describe('Parameter Validation', () => {
  it('should accept valid temperature values', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2, noNaN: true }),
        (temp) => {
          expect(isValidTemperature(temp)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject invalid temperature values', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.double({ min: -100, max: -0.01, noNaN: true }),
          fc.double({ min: 2.01, max: 100, noNaN: true })
        ),
        (temp) => {
          expect(isValidTemperature(temp)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should accept valid top_p values', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        (topP) => {
          expect(isValidTopP(topP)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject invalid top_p values', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.double({ min: -100, max: -0.01, noNaN: true }),
          fc.double({ min: 1.01, max: 100, noNaN: true })
        ),
        (topP) => {
          expect(isValidTopP(topP)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should accept valid max_tokens values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 128000 }),
        (tokens) => {
          expect(isValidMaxTokens(tokens)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject invalid max_tokens values', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: -1000, max: 0 }),
          fc.integer({ min: 128001, max: 500000 })
        ),
        (tokens) => {
          expect(isValidMaxTokens(tokens)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should validate complete params object', () => {
    fc.assert(
      fc.property(
        fc.record({
          temperature: fc.double({ min: 0, max: 2, noNaN: true }),
          top_p: fc.double({ min: 0, max: 1, noNaN: true }),
          max_tokens: fc.integer({ min: 1, max: 128000 })
        }),
        (params) => {
          const result = validateParams(params);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
