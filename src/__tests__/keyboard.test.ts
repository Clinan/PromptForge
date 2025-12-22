/**
 * Property 23: Escape Closes Modal
 * For any Escape key press while a modal is open, the modal SHALL close.
 * 
 * **Feature: ui-redesign-langui-antdv, Property 23: Keyboard Shortcuts**
 * **Validates: Requirements 12.3**
 */
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// Modal state management
interface ModalState {
  isOpen: boolean;
}

// Keyboard event simulation
interface KeyboardEventData {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

// Modal operations
function createModalState(isOpen: boolean = false): ModalState {
  return { isOpen };
}

function openModal(state: ModalState): ModalState {
  return { ...state, isOpen: true };
}

function closeModal(state: ModalState): ModalState {
  return { ...state, isOpen: false };
}

// Keyboard handler
function handleKeyboardEvent(
  state: ModalState,
  event: KeyboardEventData,
  callbacks: {
    onClose?: () => void;
    onStopAll?: () => void;
  }
): ModalState {
  // Escape closes modal
  if (event.key === 'Escape' && state.isOpen) {
    callbacks.onClose?.();
    return closeModal(state);
  }
  
  // Ctrl+. or Cmd+. stops all
  if ((event.ctrlKey || event.metaKey) && event.key === '.') {
    callbacks.onStopAll?.();
    return state;
  }
  
  return state;
}

// Focus trap logic
interface FocusableElement {
  id: string;
  tabIndex: number;
}

function getNextFocusIndex(
  elements: FocusableElement[],
  currentIndex: number,
  shiftKey: boolean
): number {
  if (elements.length === 0) return -1;
  
  if (shiftKey) {
    // Shift+Tab: go backwards
    return currentIndex <= 0 ? elements.length - 1 : currentIndex - 1;
  } else {
    // Tab: go forwards
    return currentIndex >= elements.length - 1 ? 0 : currentIndex + 1;
  }
}

describe('Keyboard Shortcuts', () => {
  /**
   * Property 23: Escape Closes Modal
   * **Validates: Requirements 12.3**
   */
  describe('Property 23: Escape Closes Modal', () => {
    it('pressing Escape closes an open modal', () => {
      fc.assert(
        fc.property(fc.boolean(), (wasOpen) => {
          const state = createModalState(wasOpen);
          const openState = openModal(state);
          
          expect(openState.isOpen).toBe(true);
          
          const afterEscape = handleKeyboardEvent(
            openState,
            { key: 'Escape' },
            {}
          );
          
          expect(afterEscape.isOpen).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('pressing Escape on closed modal does nothing', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const state = createModalState(false);
          
          const afterEscape = handleKeyboardEvent(
            state,
            { key: 'Escape' },
            {}
          );
          
          expect(afterEscape.isOpen).toBe(false);
        }),
        { numRuns: 50 }
      );
    });

    it('Escape triggers onClose callback when modal is open', () => {
      const onClose = vi.fn();
      const state = createModalState(true);
      
      handleKeyboardEvent(state, { key: 'Escape' }, { onClose });
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('Escape does not trigger onClose when modal is closed', () => {
      const onClose = vi.fn();
      const state = createModalState(false);
      
      handleKeyboardEvent(state, { key: 'Escape' }, { onClose });
      
      expect(onClose).not.toHaveBeenCalled();
    });

    it('other keys do not close modal', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => s !== 'Escape'),
          (key) => {
            const state = createModalState(true);
            
            const afterKey = handleKeyboardEvent(
              state,
              { key },
              {}
            );
            
            // Modal should still be open
            expect(afterKey.isOpen).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Ctrl+. Stop All
   */
  describe('Ctrl+. Stop All', () => {
    it('Ctrl+. triggers onStopAll callback', () => {
      const onStopAll = vi.fn();
      const state = createModalState(false);
      
      handleKeyboardEvent(
        state,
        { key: '.', ctrlKey: true },
        { onStopAll }
      );
      
      expect(onStopAll).toHaveBeenCalledTimes(1);
    });

    it('Cmd+. triggers onStopAll callback (Mac)', () => {
      const onStopAll = vi.fn();
      const state = createModalState(false);
      
      handleKeyboardEvent(
        state,
        { key: '.', metaKey: true },
        { onStopAll }
      );
      
      expect(onStopAll).toHaveBeenCalledTimes(1);
    });

    it('. without modifier does not trigger onStopAll', () => {
      const onStopAll = vi.fn();
      const state = createModalState(false);
      
      handleKeyboardEvent(
        state,
        { key: '.' },
        { onStopAll }
      );
      
      expect(onStopAll).not.toHaveBeenCalled();
    });
  });

  /**
   * Focus Trap
   */
  describe('Focus Trap', () => {
    it('Tab cycles forward through focusable elements', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({ id: fc.uuid(), tabIndex: fc.integer({ min: 0, max: 10 }) }),
            { minLength: 2, maxLength: 10 }
          ),
          fc.nat(),
          (elements, currentSeed) => {
            const currentIndex = currentSeed % elements.length;
            const nextIndex = getNextFocusIndex(elements, currentIndex, false);
            
            if (currentIndex === elements.length - 1) {
              // Should wrap to first
              expect(nextIndex).toBe(0);
            } else {
              // Should go to next
              expect(nextIndex).toBe(currentIndex + 1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Shift+Tab cycles backward through focusable elements', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({ id: fc.uuid(), tabIndex: fc.integer({ min: 0, max: 10 }) }),
            { minLength: 2, maxLength: 10 }
          ),
          fc.nat(),
          (elements, currentSeed) => {
            const currentIndex = currentSeed % elements.length;
            const nextIndex = getNextFocusIndex(elements, currentIndex, true);
            
            if (currentIndex === 0) {
              // Should wrap to last
              expect(nextIndex).toBe(elements.length - 1);
            } else {
              // Should go to previous
              expect(nextIndex).toBe(currentIndex - 1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty elements returns -1', () => {
      const elements: FocusableElement[] = [];
      
      expect(getNextFocusIndex(elements, 0, false)).toBe(-1);
      expect(getNextFocusIndex(elements, 0, true)).toBe(-1);
    });
  });
});
