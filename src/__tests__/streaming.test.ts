/**
 * Property 7: Streaming Output Incremental Append
 * For any streaming output chunk received, the output text SHALL be appended
 * without losing previously received content.
 * 
 * **Feature: ui-redesign-langui-antdv, Property 7: Streaming Output**
 * **Validates: Requirements 4.2**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Streaming output state
interface StreamingState {
  output: string;
  isStreaming: boolean;
}

// Streaming operations
function createStreamingState(): StreamingState {
  return {
    output: '',
    isStreaming: false
  };
}

function startStreaming(state: StreamingState): StreamingState {
  return {
    ...state,
    isStreaming: true,
    output: '' // Clear output when starting new stream
  };
}

function appendChunk(state: StreamingState, chunk: string): StreamingState {
  if (!state.isStreaming) return state;
  return {
    ...state,
    output: state.output + chunk
  };
}

function endStreaming(state: StreamingState): StreamingState {
  return {
    ...state,
    isStreaming: false
  };
}

// Simulate receiving multiple chunks
function receiveChunks(state: StreamingState, chunks: string[]): StreamingState {
  let current = startStreaming(state);
  for (const chunk of chunks) {
    current = appendChunk(current, chunk);
  }
  return endStreaming(current);
}

describe('Streaming Output', () => {
  /**
   * Property 7: Streaming Output Incremental Append
   * **Validates: Requirements 4.2**
   */
  describe('Property 7: Streaming Output Incremental Append', () => {
    it('appending a chunk preserves previous content', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 500 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (existingOutput, newChunk) => {
            const state: StreamingState = {
              output: existingOutput,
              isStreaming: true
            };
            
            const after = appendChunk(state, newChunk);
            
            // New output should start with existing output
            expect(after.output.startsWith(existingOutput)).toBe(true);
            
            // New output should end with new chunk
            expect(after.output.endsWith(newChunk)).toBe(true);
            
            // Length should be sum of both
            expect(after.output.length).toBe(existingOutput.length + newChunk.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('multiple chunks concatenate in order', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 20 }),
          (chunks) => {
            const state = createStreamingState();
            const after = receiveChunks(state, chunks);
            
            // Final output should be concatenation of all chunks
            const expected = chunks.join('');
            expect(after.output).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty chunks do not affect output', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 200 }),
          (existingOutput) => {
            const state: StreamingState = {
              output: existingOutput,
              isStreaming: true
            };
            
            const after = appendChunk(state, '');
            
            // Output should be unchanged
            expect(after.output).toBe(existingOutput);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('chunks are not appended when not streaming', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 200 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (existingOutput, newChunk) => {
            const state: StreamingState = {
              output: existingOutput,
              isStreaming: false
            };
            
            const after = appendChunk(state, newChunk);
            
            // Output should be unchanged
            expect(after.output).toBe(existingOutput);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('starting a new stream clears previous output', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (existingOutput) => {
            const state: StreamingState = {
              output: existingOutput,
              isStreaming: false
            };
            
            const after = startStreaming(state);
            
            // Output should be cleared
            expect(after.output).toBe('');
            expect(after.isStreaming).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('ending streaming preserves final output', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 500 }),
          (output) => {
            const state: StreamingState = {
              output,
              isStreaming: true
            };
            
            const after = endStreaming(state);
            
            // Output should be preserved
            expect(after.output).toBe(output);
            expect(after.isStreaming).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('special characters are preserved in chunks', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }),
            { minLength: 1, maxLength: 10 }
          ),
          (chunks) => {
            // Include special characters
            const specialChunks = chunks.map((c, i) => 
              i % 2 === 0 ? c : c + '\n\t"\'<>&'
            );
            
            const state = createStreamingState();
            const after = receiveChunks(state, specialChunks);
            
            // All special characters should be preserved
            const expected = specialChunks.join('');
            expect(after.output).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('unicode characters are preserved in chunks', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 30 }),
            { minLength: 1, maxLength: 10 }
          ),
          (chunks) => {
            // Add some unicode characters
            const unicodeChunks = chunks.map((c, i) => 
              i % 2 === 0 ? c : c + '你好世界🎉🚀'
            );
            
            const state = createStreamingState();
            const after = receiveChunks(state, unicodeChunks);
            
            // All unicode should be preserved
            const expected = unicodeChunks.join('');
            expect(after.output).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
