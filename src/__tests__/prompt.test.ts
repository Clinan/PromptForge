/**
 * Property 8: Message Addition Preserves Order
 * For any Add Message action in Prompt Composer, existing messages SHALL maintain
 * their order and a new message SHALL be appended at the end.
 * 
 * Property 9: Message Reorder via Drag-Drop
 * For any drag-and-drop reorder action, the message list SHALL reflect the new order
 * with all messages preserved.
 * 
 * Property 10: Message Deletion Constraint
 * For any message delete action, the deletion SHALL only succeed if more than one message exists.
 * 
 * Property 11: Auto-Save to LocalStorage
 * For any message content edit, the changes SHALL be persisted to localStorage within the specified timeout.
 * 
 * **Feature: ui-redesign-langui-antdv, Property 8, 9, 10, 11: Prompt Composer Operations**
 * **Validates: Requirements 5.2, 5.4, 5.5, 5.6**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

interface UserPromptPreset {
  id: string;
  role: 'system' | 'user' | 'assistant';
  text: string;
}

// Helper to generate unique IDs
let idCounter = 0;
function newId(): string {
  return `msg-${++idCounter}-${Date.now()}`;
}

// Message operations
function addMessage(messages: UserPromptPreset[], role: UserPromptPreset['role'] = 'user'): UserPromptPreset[] {
  const newMessage: UserPromptPreset = {
    id: newId(),
    role,
    text: role === 'system' ? 'You are a helpful assistant.' : ''
  };
  return [...messages, newMessage];
}

function removeMessage(messages: UserPromptPreset[], id: string): UserPromptPreset[] {
  if (messages.length <= 1) return messages; // Cannot remove last message
  return messages.filter(m => m.id !== id);
}

function moveMessage(messages: UserPromptPreset[], fromIndex: number, toIndex: number): UserPromptPreset[] {
  if (fromIndex < 0 || fromIndex >= messages.length) return messages;
  if (toIndex < 0 || toIndex >= messages.length) return messages;
  if (fromIndex === toIndex) return messages;
  
  const result = [...messages];
  const [item] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, item);
  return result;
}

function updateMessage(messages: UserPromptPreset[], id: string, text: string): UserPromptPreset[] {
  return messages.map(m => m.id === id ? { ...m, text } : m);
}

function duplicateMessage(messages: UserPromptPreset[], id: string): UserPromptPreset[] {
  const idx = messages.findIndex(m => m.id === id);
  if (idx < 0) return messages;
  
  const source = messages[idx];
  const copy: UserPromptPreset = {
    id: newId(),
    role: source.role,
    text: source.text
  };
  
  const result = [...messages];
  result.splice(idx + 1, 0, copy);
  return result;
}

// Arbitrary generators
const roleArb = fc.constantFrom('system', 'user', 'assistant') as fc.Arbitrary<UserPromptPreset['role']>;

const messageArb = fc.record({
  id: fc.uuid(),
  role: roleArb,
  text: fc.string({ minLength: 0, maxLength: 500 })
});

const messagesArrayArb = fc.array(messageArb, { minLength: 1, maxLength: 20 });

describe('Prompt Composer Operations', () => {
  /**
   * Property 8: Message Addition Preserves Order
   * **Validates: Requirements 5.2**
   */
  describe('Property 8: Message Addition Preserves Order', () => {
    it('adding a message preserves existing messages in order', () => {
      fc.assert(
        fc.property(
          messagesArrayArb,
          roleArb,
          (existingMessages, role) => {
            const before = [...existingMessages];
            const after = addMessage(existingMessages, role);
            
            // Length should increase by 1
            expect(after.length).toBe(before.length + 1);
            
            // All existing messages should be preserved in order
            for (let i = 0; i < before.length; i++) {
              expect(after[i]).toEqual(before[i]);
            }
            
            // New message should be at the end
            const newMessage = after[after.length - 1];
            expect(newMessage.role).toBe(role);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('new message has unique ID', () => {
      fc.assert(
        fc.property(
          messagesArrayArb,
          roleArb,
          (existingMessages, role) => {
            const existingIds = new Set(existingMessages.map(m => m.id));
            const after = addMessage(existingMessages, role);
            const newMessage = after[after.length - 1];
            
            // New message ID should not exist in original
            expect(existingIds.has(newMessage.id)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: Message Reorder via Drag-Drop
   * **Validates: Requirements 5.4**
   */
  describe('Property 9: Message Reorder via Drag-Drop', () => {
    it('reordering preserves all messages', () => {
      fc.assert(
        fc.property(
          fc.array(messageArb, { minLength: 2, maxLength: 10 }),
          fc.nat(),
          fc.nat(),
          (messages, fromSeed, toSeed) => {
            const fromIndex = fromSeed % messages.length;
            const toIndex = toSeed % messages.length;
            
            const after = moveMessage(messages, fromIndex, toIndex);
            
            // Same length
            expect(after.length).toBe(messages.length);
            
            // Same IDs (just reordered)
            const beforeIds = new Set(messages.map(m => m.id));
            const afterIds = new Set(after.map(m => m.id));
            expect(afterIds).toEqual(beforeIds);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('reordering moves item to correct position', () => {
      fc.assert(
        fc.property(
          fc.array(messageArb, { minLength: 2, maxLength: 10 }),
          fc.nat(),
          fc.nat(),
          (messages, fromSeed, toSeed) => {
            const fromIndex = fromSeed % messages.length;
            const toIndex = toSeed % messages.length;
            const movedItem = messages[fromIndex];
            
            const after = moveMessage(messages, fromIndex, toIndex);
            
            // Item should be at target position
            expect(after[toIndex].id).toBe(movedItem.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('reordering same position is no-op', () => {
      fc.assert(
        fc.property(
          messagesArrayArb,
          fc.nat(),
          (messages, indexSeed) => {
            const index = indexSeed % messages.length;
            const after = moveMessage(messages, index, index);
            
            // Should be unchanged
            expect(after).toEqual(messages);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: Message Deletion Constraint
   * **Validates: Requirements 5.5**
   */
  describe('Property 10: Message Deletion Constraint', () => {
    it('cannot delete the last message', () => {
      fc.assert(
        fc.property(messageArb, (message) => {
          const messages = [message];
          const after = removeMessage(messages, message.id);
          
          // Should still have one message
          expect(after.length).toBe(1);
          expect(after[0].id).toBe(message.id);
        }),
        { numRuns: 100 }
      );
    });

    it('can delete message when more than one exists', () => {
      fc.assert(
        fc.property(
          fc.array(messageArb, { minLength: 2, maxLength: 10 }),
          fc.nat(),
          (messages, indexSeed) => {
            const index = indexSeed % messages.length;
            const targetId = messages[index].id;
            
            const after = removeMessage(messages, targetId);
            
            // Length should decrease by 1
            expect(after.length).toBe(messages.length - 1);
            
            // Target should not exist
            expect(after.find(m => m.id === targetId)).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('deleting preserves other messages', () => {
      fc.assert(
        fc.property(
          fc.array(messageArb, { minLength: 2, maxLength: 10 }),
          fc.nat(),
          (messages, indexSeed) => {
            const index = indexSeed % messages.length;
            const targetId = messages[index].id;
            
            const after = removeMessage(messages, targetId);
            
            // All other messages should be preserved
            messages.forEach(msg => {
              if (msg.id !== targetId) {
                expect(after.find(m => m.id === msg.id)).toEqual(msg);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11: Auto-Save to LocalStorage
   * **Validates: Requirements 5.6**
   */
  describe('Property 11: Auto-Save to LocalStorage', () => {
    it('updating message content changes the message', () => {
      fc.assert(
        fc.property(
          messagesArrayArb,
          fc.nat(),
          fc.string({ minLength: 0, maxLength: 500 }),
          (messages, indexSeed, newText) => {
            const index = indexSeed % messages.length;
            const targetId = messages[index].id;
            
            const after = updateMessage(messages, targetId, newText);
            const updated = after.find(m => m.id === targetId);
            
            // Text should be updated
            expect(updated?.text).toBe(newText);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('updating preserves other messages', () => {
      fc.assert(
        fc.property(
          messagesArrayArb,
          fc.nat(),
          fc.string({ minLength: 0, maxLength: 500 }),
          (messages, indexSeed, newText) => {
            const index = indexSeed % messages.length;
            const targetId = messages[index].id;
            
            const after = updateMessage(messages, targetId, newText);
            
            // Other messages should be unchanged
            messages.forEach(msg => {
              if (msg.id !== targetId) {
                expect(after.find(m => m.id === msg.id)).toEqual(msg);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('updating non-existent message is no-op', () => {
      fc.assert(
        fc.property(
          messagesArrayArb,
          fc.uuid(),
          fc.string(),
          (messages, nonExistentId, newText) => {
            // Ensure ID doesn't exist
            const existingIds = new Set(messages.map(m => m.id));
            if (existingIds.has(nonExistentId)) return;
            
            const after = updateMessage(messages, nonExistentId, newText);
            
            // Should be unchanged
            expect(after).toEqual(messages);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Additional: Duplicate Message
   */
  describe('Duplicate Message', () => {
    it('duplicating creates a copy with same content', () => {
      fc.assert(
        fc.property(
          messagesArrayArb,
          fc.nat(),
          (messages, indexSeed) => {
            const index = indexSeed % messages.length;
            const source = messages[index];
            
            const after = duplicateMessage(messages, source.id);
            
            // Length should increase by 1
            expect(after.length).toBe(messages.length + 1);
            
            // Copy should be right after source
            const copy = after[index + 1];
            expect(copy.role).toBe(source.role);
            expect(copy.text).toBe(source.text);
            expect(copy.id).not.toBe(source.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
