# Implementation Plan

- [ ] 1. Extend type definitions for thinking support
  - [ ] 1.1 Add thinking chunk type to PluginChunk union
    - Add `{ type: 'thinking'; text: string }` to PluginChunk type in src/types.ts
    - _Requirements: 4.1_
  - [ ] 1.2 Add thinking field to Slot type
    - Add `thinking: string` field to Slot interface
    - _Requirements: 1.1, 1.2_
  - [ ] 1.3 Add thinking field to HistoryItem responseSnapshot
    - Add optional `thinking?: string` field to responseSnapshot
    - _Requirements: 5.1, 5.2, 5.3_

- [ ]* 1.4 Write property test for thinking serialization round-trip
  - **Property 7: Thinking serialization round-trip**
  - **Validates: Requirements 4.2, 4.4**

- [ ] 2. Update App.vue to handle thinking chunks
  - [ ] 2.1 Initialize thinking field in slot creation
    - Add `thinking: ''` to createSlot function
    - _Requirements: 1.1_
  - [ ] 2.2 Accumulate thinking content during streaming
    - Handle 'thinking' chunk type in invokeChat loop
    - Append thinking text to slot.thinking
    - _Requirements: 1.2_
  - [ ] 2.3 Reset thinking on new run
    - Clear slot.thinking when starting a new run
    - _Requirements: 2.5_
  - [ ] 2.4 Include thinking in history snapshot
    - Add thinking to responseSnapshot when saving history
    - _Requirements: 5.1_
  - [ ] 2.5 Restore thinking from history
    - Populate slot.thinking when loading history item
    - _Requirements: 5.2_

- [ ]* 2.6 Write property test for thinking accumulation correctness
  - **Property 2: Thinking accumulation correctness**
  - **Validates: Requirements 1.2**

- [ ]* 2.7 Write property test for history thinking preservation
  - **Property 8: History thinking preservation**
  - **Validates: Requirements 5.1, 5.2, 5.3**

- [ ] 3. Implement thinking display in SlotCard
  - [ ] 3.1 Add thinking prop handling and computed properties
    - Add shouldShowThinking computed property
    - Add thinkingPreview computed for character count
    - _Requirements: 1.1, 1.3, 2.3_
  - [ ] 3.2 Add thinkingCollapsed state with reset logic
    - Create ref for collapse state
    - Watch slot.status to reset on 'running'
    - _Requirements: 2.1, 2.5, 3.1_
  - [ ] 3.3 Add thinking section template
    - Create slot-thinking section with header and content
    - Add collapse toggle button
    - Add collapsed indicator with character count
    - _Requirements: 1.1, 2.1, 2.3_

- [ ]* 3.4 Write property test for thinking visibility consistency
  - **Property 1: Thinking visibility consistency**
  - **Validates: Requirements 1.1, 1.3**

- [ ]* 3.5 Write property test for collapse indicator accuracy
  - **Property 3: Collapse indicator accuracy**
  - **Validates: Requirements 2.3**

- [ ]* 3.6 Write property test for collapse state reset on run
  - **Property 4: Collapse state reset on run**
  - **Validates: Requirements 2.5**

- [ ]* 3.7 Write property test for collapse state isolation
  - **Property 5: Collapse state isolation**
  - **Validates: Requirements 3.1, 3.2**

- [ ] 4. Add thinking section styles
  - [ ] 4.1 Create CSS styles for thinking section
    - Add .slot-thinking container styles
    - Add .slot-thinking__header with flex layout
    - Add .slot-thinking__content with max-height and overflow
    - Add collapse animation transition
    - Add visual distinction from main output (background color)
    - _Requirements: 1.4, 2.2, 2.4_

- [ ] 5. Checkpoint - Ensure core functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Update OpenAI-compatible plugin to emit thinking chunks
  - [ ] 6.1 Parse reasoning_content from API response
    - Check for reasoning_content in delta
    - Emit thinking chunk when present
    - _Requirements: 4.1, 4.2_
  - [ ] 6.2 Handle different provider thinking formats
    - Support Claude's thinking format if different
    - Support DeepSeek's reasoning format
    - _Requirements: 4.2_

- [ ]* 6.3 Write property test for plugin thinking chunk emission
  - **Property 6: Plugin thinking chunk emission**
  - **Validates: Requirements 4.1**

- [ ] 7. Final integration and polish
  - [ ] 7.1 Test with real thinking-capable models
    - Verify thinking displays correctly with Claude/DeepSeek
    - Verify collapse/expand works smoothly
    - _Requirements: All_
  - [ ] 7.2 Verify history round-trip
    - Save run with thinking to history
    - Load from history and verify thinking restored
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 8. Final Checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.
