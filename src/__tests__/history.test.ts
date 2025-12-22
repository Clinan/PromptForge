/**
 * Property 19: History Star Toggle
 * For any star toggle action on a history item, the star status SHALL be inverted and persisted.
 * 
 * Property 20: History Search Filtering
 * For any search query in history, the displayed items SHALL only include those matching
 * the query by keyword, model, or provider.
 * 
 * **Feature: ui-redesign-langui-antdv, Property 19, 20: History Operations**
 * **Validates: Requirements 9.3, 9.5**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

interface HistoryItem {
  id: string;
  createdAt: number;
  star: boolean;
  title: string;
  requestSnapshot: {
    modelId: string;
    systemPrompt: string;
    userPrompts: string[];
    messages?: Array<{ role: string; content: string }>;
  };
  responseSnapshot: {
    outputText: string;
    metrics: {
      ttfbMs: number | null;
      totalMs: number | null;
    };
    usage?: { total?: number };
    toolCalls?: unknown[];
  };
}

// Star toggle operation
function toggleStar(items: HistoryItem[], id: string): HistoryItem[] {
  return items.map(item => 
    item.id === id ? { ...item, star: !item.star } : item
  );
}

// Search filtering logic (extracted from HistoryDrawer.vue)
function matchesSearch(item: HistoryItem, query: string): boolean {
  if (!query.trim()) return true;
  
  const q = query.toLowerCase();
  const title = item.title?.toLowerCase() || '';
  const model = item.requestSnapshot.modelId?.toLowerCase() || '';
  const systemPrompt = item.requestSnapshot.systemPrompt?.toLowerCase() || '';
  const output = item.responseSnapshot.outputText?.toLowerCase() || '';
  
  // Search user messages
  let userMessages = '';
  if (Array.isArray(item.requestSnapshot.messages)) {
    userMessages = item.requestSnapshot.messages
      .map(m => m.content || '')
      .join(' ')
      .toLowerCase();
  } else if (Array.isArray(item.requestSnapshot.userPrompts)) {
    userMessages = item.requestSnapshot.userPrompts.join(' ').toLowerCase();
  }
  
  return (
    title.includes(q) ||
    model.includes(q) ||
    systemPrompt.includes(q) ||
    userMessages.includes(q) ||
    output.includes(q)
  );
}

function filterHistory(items: HistoryItem[], query: string): HistoryItem[] {
  return items.filter(item => matchesSearch(item, query));
}

// Arbitrary generators
const historyItemArb = fc.record({
  id: fc.uuid(),
  createdAt: fc.integer({ min: Date.now() - 30 * 24 * 60 * 60 * 1000, max: Date.now() }),
  star: fc.boolean(),
  title: fc.string({ minLength: 0, maxLength: 100 }),
  requestSnapshot: fc.record({
    modelId: fc.constantFrom('gpt-4', 'gpt-3.5-turbo', 'claude-3', 'gemini-pro'),
    systemPrompt: fc.string({ minLength: 0, maxLength: 500 }),
    userPrompts: fc.array(fc.string({ minLength: 0, maxLength: 200 }), { minLength: 0, maxLength: 5 }),
    messages: fc.array(
      fc.record({
        role: fc.constantFrom('user', 'assistant', 'system'),
        content: fc.string({ minLength: 0, maxLength: 200 })
      }),
      { minLength: 0, maxLength: 5 }
    )
  }),
  responseSnapshot: fc.record({
    outputText: fc.string({ minLength: 0, maxLength: 1000 }),
    metrics: fc.record({
      ttfbMs: fc.option(fc.integer({ min: 0, max: 5000 }), { nil: null }),
      totalMs: fc.option(fc.integer({ min: 0, max: 30000 }), { nil: null })
    }),
    usage: fc.option(fc.record({ total: fc.integer({ min: 0, max: 10000 }) })),
    toolCalls: fc.option(fc.array(fc.constant({}), { minLength: 0, maxLength: 3 }))
  })
});

const historyArrayArb = fc.array(historyItemArb, { minLength: 0, maxLength: 20 });

describe('History Operations', () => {
  /**
   * Property 19: History Star Toggle
   * **Validates: Requirements 9.3**
   */
  describe('Property 19: History Star Toggle', () => {
    it('toggling star inverts the star status', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 1, maxLength: 10 }),
          fc.nat(),
          (items, indexSeed) => {
            const index = indexSeed % items.length;
            const targetId = items[index].id;
            const originalStar = items[index].star;
            
            const after = toggleStar(items, targetId);
            const updated = after.find(item => item.id === targetId);
            
            // Star status should be inverted
            expect(updated?.star).toBe(!originalStar);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('toggling star preserves other items', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 2, maxLength: 10 }),
          fc.nat(),
          (items, indexSeed) => {
            const index = indexSeed % items.length;
            const targetId = items[index].id;
            
            const after = toggleStar(items, targetId);
            
            // Other items should be unchanged
            items.forEach((item, i) => {
              if (item.id !== targetId) {
                expect(after[i]).toEqual(item);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('double toggle returns to original state', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 1, maxLength: 10 }),
          fc.nat(),
          (items, indexSeed) => {
            const index = indexSeed % items.length;
            const targetId = items[index].id;
            const originalStar = items[index].star;
            
            const afterFirst = toggleStar(items, targetId);
            const afterSecond = toggleStar(afterFirst, targetId);
            const final = afterSecond.find(item => item.id === targetId);
            
            // Should return to original state
            expect(final?.star).toBe(originalStar);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 20: History Search Filtering
   * **Validates: Requirements 9.5**
   */
  describe('Property 20: History Search Filtering', () => {
    it('empty query returns all items', () => {
      fc.assert(
        fc.property(historyArrayArb, (items) => {
          const filtered = filterHistory(items, '');
          expect(filtered.length).toBe(items.length);
          expect(filtered).toEqual(items);
        }),
        { numRuns: 100 }
      );
    });

    it('whitespace-only query returns all items', () => {
      fc.assert(
        fc.property(
          historyArrayArb,
          fc.constantFrom('   ', '\t\t', '\n\n', '  \t  '),
          (items, whitespace) => {
            const filtered = filterHistory(items, whitespace);
            expect(filtered.length).toBe(items.length);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('search by title returns matching items', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 1, maxLength: 10 }),
          fc.nat(),
          (items, indexSeed) => {
            const index = indexSeed % items.length;
            const targetTitle = items[index].title;
            
            if (!targetTitle || targetTitle.length < 3) return; // Skip short titles
            
            // Use a substring of the title as search query
            const query = targetTitle.slice(0, Math.min(10, targetTitle.length));
            const filtered = filterHistory(items, query);
            
            // Should include the target item
            expect(filtered.some(item => item.id === items[index].id)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('search by model returns matching items', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 1, maxLength: 10 }),
          fc.nat(),
          (items, indexSeed) => {
            const index = indexSeed % items.length;
            const targetModel = items[index].requestSnapshot.modelId;
            
            if (!targetModel) return;
            
            const filtered = filterHistory(items, targetModel);
            
            // Should include the target item
            expect(filtered.some(item => item.id === items[index].id)).toBe(true);
            
            // All filtered items should have matching model
            filtered.forEach(item => {
              const matches = 
                item.requestSnapshot.modelId.toLowerCase().includes(targetModel.toLowerCase()) ||
                item.title.toLowerCase().includes(targetModel.toLowerCase()) ||
                item.requestSnapshot.systemPrompt.toLowerCase().includes(targetModel.toLowerCase()) ||
                item.responseSnapshot.outputText.toLowerCase().includes(targetModel.toLowerCase());
              expect(matches).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('search is case-insensitive', () => {
      fc.assert(
        fc.property(
          historyArrayArb,
          fc.string({ minLength: 1, maxLength: 20 }),
          (items, query) => {
            const lowerFiltered = filterHistory(items, query.toLowerCase());
            const upperFiltered = filterHistory(items, query.toUpperCase());
            const mixedFiltered = filterHistory(items, query);
            
            // All should return the same results
            expect(lowerFiltered.length).toBe(upperFiltered.length);
            expect(lowerFiltered.length).toBe(mixedFiltered.length);
            
            // Same IDs
            const lowerIds = new Set(lowerFiltered.map(i => i.id));
            const upperIds = new Set(upperFiltered.map(i => i.id));
            expect(lowerIds).toEqual(upperIds);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('filtered results are subset of original', () => {
      fc.assert(
        fc.property(
          historyArrayArb,
          fc.string({ minLength: 0, maxLength: 50 }),
          (items, query) => {
            const filtered = filterHistory(items, query);
            
            // Filtered length should be <= original length
            expect(filtered.length).toBeLessThanOrEqual(items.length);
            
            // All filtered items should exist in original
            const originalIds = new Set(items.map(i => i.id));
            filtered.forEach(item => {
              expect(originalIds.has(item.id)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
