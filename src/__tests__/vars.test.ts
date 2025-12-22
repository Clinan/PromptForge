/**
 * Property 16: Variable Addition Creates Empty Pair
 * For any Add Variable action, a new key-value pair with empty strings SHALL be created.
 * 
 * Property 17: Variable Edit Real-Time Update
 * For any variable key or value edit, the change SHALL be reflected immediately in the UI state.
 * 
 * Property 18: Variable Deletion Removes Entry
 * For any variable delete action, the variable SHALL be removed from the list.
 * 
 * **Feature: ui-redesign-langui-antdv, Property 16, 17, 18: Variable Operations**
 * **Validates: Requirements 8.2, 8.3, 8.4**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

interface Variable {
  id: string;
  key: string;
  value: string;
}

// Helper to generate unique IDs (simplified version)
let idCounter = 0;
function newId(): string {
  return `var-${++idCounter}-${Date.now()}`;
}

// Variable operations (extracted from VarsModal.vue logic)
function addVariable(variables: Variable[]): Variable[] {
  const newVar: Variable = { id: newId(), key: '', value: '' };
  return [...variables, newVar];
}

function removeVariable(variables: Variable[], id: string): Variable[] {
  return variables.filter(v => v.id !== id);
}

function editVariable(
  variables: Variable[],
  id: string,
  field: 'key' | 'value',
  newValue: string
): Variable[] {
  return variables.map(v => 
    v.id === id ? { ...v, [field]: newValue } : v
  );
}

function filterValidVariables(variables: Variable[]): Variable[] {
  return variables.filter(v => v.key.trim().length > 0);
}

function hasDuplicateKeys(variables: Variable[]): boolean {
  const keys = variables.map(v => v.key.trim()).filter(k => k.length > 0);
  return new Set(keys).size !== keys.length;
}

// Arbitrary generators
const variableArb = fc.record({
  id: fc.uuid(),
  key: fc.string({ minLength: 0, maxLength: 50 }),
  value: fc.string({ minLength: 0, maxLength: 200 })
});

const nonEmptyKeyVariableArb = fc.record({
  id: fc.uuid(),
  key: fc.string({ minLength: 1, maxLength: 50 }),
  value: fc.string({ minLength: 0, maxLength: 200 })
});

const variablesArrayArb = fc.array(variableArb, { minLength: 0, maxLength: 20 });

describe('Variable Operations', () => {
  /**
   * Property 16: Variable Addition Creates Empty Pair
   * **Validates: Requirements 8.2**
   */
  describe('Property 16: Variable Addition Creates Empty Pair', () => {
    it('adding a variable creates a new entry with empty key and value', () => {
      fc.assert(
        fc.property(variablesArrayArb, (existingVars) => {
          const before = [...existingVars];
          const after = addVariable(existingVars);
          
          // Length should increase by 1
          expect(after.length).toBe(before.length + 1);
          
          // All existing variables should be preserved
          expect(after.slice(0, before.length)).toEqual(before);
          
          // New variable should have empty key and value
          const newVar = after[after.length - 1];
          expect(newVar.key).toBe('');
          expect(newVar.value).toBe('');
          expect(newVar.id).toBeDefined();
          expect(typeof newVar.id).toBe('string');
        }),
        { numRuns: 100 }
      );
    });

    it('adding multiple variables creates unique IDs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (count) => {
            let vars: Variable[] = [];
            for (let i = 0; i < count; i++) {
              vars = addVariable(vars);
            }
            
            // All IDs should be unique
            const ids = vars.map(v => v.id);
            expect(new Set(ids).size).toBe(count);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 17: Variable Edit Real-Time Update
   * **Validates: Requirements 8.3**
   */
  describe('Property 17: Variable Edit Real-Time Update', () => {
    it('editing a variable key updates only that variable', () => {
      fc.assert(
        fc.property(
          fc.array(nonEmptyKeyVariableArb, { minLength: 1, maxLength: 10 }),
          fc.nat(),
          fc.string({ minLength: 1, maxLength: 50 }),
          (vars, indexSeed, newKey) => {
            const index = indexSeed % vars.length;
            const targetId = vars[index].id;
            const before = [...vars];
            
            const after = editVariable(vars, targetId, 'key', newKey);
            
            // Length should remain the same
            expect(after.length).toBe(before.length);
            
            // Target variable should have new key
            const updated = after.find(v => v.id === targetId);
            expect(updated?.key).toBe(newKey);
            
            // Other variables should be unchanged
            after.forEach((v, i) => {
              if (v.id !== targetId) {
                expect(v).toEqual(before[i]);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('editing a variable value updates only that variable', () => {
      fc.assert(
        fc.property(
          fc.array(nonEmptyKeyVariableArb, { minLength: 1, maxLength: 10 }),
          fc.nat(),
          fc.string({ minLength: 0, maxLength: 200 }),
          (vars, indexSeed, newValue) => {
            const index = indexSeed % vars.length;
            const targetId = vars[index].id;
            const before = [...vars];
            
            const after = editVariable(vars, targetId, 'value', newValue);
            
            // Length should remain the same
            expect(after.length).toBe(before.length);
            
            // Target variable should have new value
            const updated = after.find(v => v.id === targetId);
            expect(updated?.value).toBe(newValue);
            
            // Other variables should be unchanged
            after.forEach((v, i) => {
              if (v.id !== targetId) {
                expect(v).toEqual(before[i]);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('editing preserves variable ID', () => {
      fc.assert(
        fc.property(
          nonEmptyKeyVariableArb,
          fc.string(),
          fc.string(),
          (variable, newKey, newValue) => {
            const vars = [variable];
            const afterKeyEdit = editVariable(vars, variable.id, 'key', newKey);
            const afterValueEdit = editVariable(afterKeyEdit, variable.id, 'value', newValue);
            
            // ID should remain the same
            expect(afterValueEdit[0].id).toBe(variable.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 18: Variable Deletion Removes Entry
   * **Validates: Requirements 8.4**
   */
  describe('Property 18: Variable Deletion Removes Entry', () => {
    it('deleting a variable removes it from the list', () => {
      fc.assert(
        fc.property(
          fc.array(variableArb, { minLength: 1, maxLength: 10 }),
          fc.nat(),
          (vars, indexSeed) => {
            const index = indexSeed % vars.length;
            const targetId = vars[index].id;
            const before = [...vars];
            
            const after = removeVariable(vars, targetId);
            
            // Length should decrease by 1
            expect(after.length).toBe(before.length - 1);
            
            // Target variable should not exist
            expect(after.find(v => v.id === targetId)).toBeUndefined();
            
            // All other variables should be preserved
            before.forEach(v => {
              if (v.id !== targetId) {
                expect(after.find(av => av.id === v.id)).toEqual(v);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('deleting non-existent variable does not change list', () => {
      fc.assert(
        fc.property(
          variablesArrayArb,
          fc.uuid(),
          (vars, nonExistentId) => {
            // Ensure the ID doesn't exist
            const existingIds = new Set(vars.map(v => v.id));
            if (existingIds.has(nonExistentId)) return; // Skip this case
            
            const after = removeVariable(vars, nonExistentId);
            
            // List should be unchanged
            expect(after).toEqual(vars);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('deleting all variables results in empty list', () => {
      fc.assert(
        fc.property(
          fc.array(variableArb, { minLength: 1, maxLength: 5 }),
          (vars) => {
            let current = [...vars];
            
            // Delete all variables one by one
            for (const v of vars) {
              current = removeVariable(current, v.id);
            }
            
            expect(current).toHaveLength(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Additional validation tests
   */
  describe('Variable Validation', () => {
    it('filtering removes variables with empty keys', () => {
      fc.assert(
        fc.property(variablesArrayArb, (vars) => {
          const filtered = filterValidVariables(vars);
          
          // All filtered variables should have non-empty keys
          filtered.forEach(v => {
            expect(v.key.trim().length).toBeGreaterThan(0);
          });
          
          // Count should match
          const expectedCount = vars.filter(v => v.key.trim().length > 0).length;
          expect(filtered.length).toBe(expectedCount);
        }),
        { numRuns: 100 }
      );
    });

    it('duplicate key detection works correctly', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 5 }),
          (keys) => {
            // Create variables with these keys
            const vars: Variable[] = keys.map((key, i) => ({
              id: `id-${i}`,
              key,
              value: `value-${i}`
            }));
            
            const uniqueKeys = new Set(keys);
            const hasDupes = hasDuplicateKeys(vars);
            
            // Should detect duplicates correctly
            expect(hasDupes).toBe(uniqueKeys.size !== keys.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
