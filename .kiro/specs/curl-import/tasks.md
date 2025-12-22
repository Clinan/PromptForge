# Implementation Plan

- [x] 1. Create cURL parser utility module
  - [x] 1.1 Create `src/lib/curlParser.ts` with type definitions
    - Define `ParsedCurl`, `CurlImportResult`, `CurlParseError` interfaces
    - Define `PLUGIN_URL_PATTERNS` constant for URL-to-plugin mapping
    - _Requirements: 1.4, 2.1_

  - [x] 1.2 Implement `parseCurl` function
    - Parse cURL command string to extract URL, headers, and body
    - Handle various cURL flag formats (-H, --header, -d, --data, -X, etc.)
    - Return `ParsedCurl` object or throw `CurlParseError`
    - _Requirements: 1.4, 5.1, 5.2, 5.3, 5.4_

  - [x] 1.3 Write property test for cURL parsing
    - **Property 1: cURL Parsing Extracts All Required Fields**
    - **Validates: Requirements 1.4**

  - [x] 1.4 Write property test for error handling
    - **Property 8: Error Handling for Invalid Inputs**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

  - [x] 1.5 Implement `detectPluginId` function
    - Match URL against known provider patterns
    - Return matching pluginId or default to 'openai-compatible'
    - _Requirements: 2.1, 2.2_

  - [x] 1.6 Write property test for plugin detection
    - **Property 2: Plugin Detection Based on URL Patterns**
    - **Validates: Requirements 2.1, 2.2**

  - [x] 1.7 Implement `extractApiKey` function
    - Extract API key from Authorization header
    - Handle "Bearer " prefix removal
    - Return null if no Authorization header
    - _Requirements: 2.3_

  - [x] 1.8 Write property test for API key extraction
    - **Property 3: API Key Extraction from Authorization Header**
    - **Validates: Requirements 2.3**

  - [x] 1.9 Implement `extractModelAndMessages` function
    - Extract model ID from body.model
    - Extract messages array from body.messages
    - Separate system messages from user/assistant messages
    - _Requirements: 4.3, 6.1, 6.2_

  - [x] 1.10 Write property test for model extraction
    - **Property 7: Model ID Extraction from Request Body**
    - **Validates: Requirements 4.3**

  - [x] 1.11 Write property test for message separation
    - **Property 9: Message Separation by Role**
    - **Validates: Requirements 6.1, 6.2**

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement Provider management utilities
  - [x] 3.1 Add `findMatchingProvider` function to curlParser.ts
    - Find Provider by matching baseUrl and pluginId
    - Return matching Provider or null
    - _Requirements: 3.1_

  - [x] 3.2 Write property test for Provider matching
    - **Property 4: Provider Matching by BaseUrl and PluginId**
    - **Validates: Requirements 3.1**

  - [x] 3.3 Add `generateUniqueProviderName` function
    - Generate unique name based on plugin name
    - Append random suffix if name already exists
    - _Requirements: 3.3, 3.4_

  - [x] 3.4 Write property test for unique name generation
    - **Property 5: Provider Creation with Unique Names**
    - **Validates: Requirements 3.3, 3.4**

- [x] 4. Implement Slot decision logic
  - [x] 4.1 Add `isSlotDefault` function to check if Slot has default content
    - Check if systemPrompt is default or empty
    - Check if output is empty
    - Check if status is idle
    - _Requirements: 4.1_

  - [x] 4.2 Add `shouldOverwriteSlot` function
    - Return true if only one Slot exists and it has default content
    - Return false otherwise (create new Slot)
    - _Requirements: 4.1, 4.2_

  - [x] 4.3 Write property test for Slot decision logic
    - **Property 6: Slot Overwrite vs Create Decision**
    - **Validates: Requirements 4.1, 4.2**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create CurlImportModal component
  - [x] 6.1 Create `src/components/modals/CurlImportModal.vue`
    - Add modal structure with Ant Design Vue Modal
    - Add textarea for cURL input
    - Add project selector (existing projects + create new option)
    - Add new project name input (conditional)
    - Add import messages checkbox
    - Add error display area
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 6.2 Implement modal state management
    - Handle cURL input validation
    - Handle project selection logic
    - Handle import button click with loading state
    - Emit import result to parent
    - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 5.3, 5.4_

- [x] 7. Integrate import functionality into App.vue
  - [x] 7.1 Add CurlImportModal to App.vue
    - Import and register CurlImportModal component
    - Add showCurlImportModal state
    - Add highlightedSlotId state for animation
    - _Requirements: 1.1_

  - [x] 7.2 Implement handleCurlImport function
    - Process CurlImportResult from modal
    - Find or create Provider based on import result
    - Decide whether to overwrite existing Slot or create new
    - Configure target Slot with Provider and model
    - Trigger model list refresh
    - Set highlightedSlotId for animation
    - Show success message
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4_

  - [x] 7.3 Add project creation support
    - Handle createProject event from modal
    - Switch to new project after creation
    - _Requirements: 1.3_

- [x] 8. Update AppToolbar with import button
  - [x] 8.1 Add "导入 cURL" button to AppToolbar.vue
    - Add ImportOutlined icon
    - Add importCurl emit
    - Position button near existing cURL-related actions
    - _Requirements: 1.1_

  - [x] 8.2 Connect toolbar button to App.vue
    - Handle importCurl event
    - Open CurlImportModal
    - _Requirements: 1.1_

- [x] 9. Add Slot highlight animation
  - [x] 9.1 Update SlotCard.vue with highlight prop
    - Add highlighted prop
    - Apply highlight animation class when highlighted
    - _Requirements: 4.5_

  - [x] 9.2 Add highlight animation CSS
    - Create pulse/glow animation for highlighted Slot
    - Auto-remove highlight after animation completes
    - _Requirements: 4.5_

  - [x] 9.3 Update SlotsGrid.vue to pass highlighted state
    - Pass highlightedSlotId to SlotCard components
    - Handle scroll-into-view for new Slots
    - _Requirements: 4.5, 4.6_

- [x] 10. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
