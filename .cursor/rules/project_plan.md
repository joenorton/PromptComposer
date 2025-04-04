Below is a project plan for developing the ContextSmash web solution as a proof of concept (PoC). This plan focuses on delivering a functional web MVP with real-time feedback and lays the groundwork for prompt templating and reusability, without committing to timelines. It’s structured to keep things lean, iterative, and aligned with your priorities.

ContextSmash Web Proof of Concept Project Plan

Objective
Build a minimal, functional web-based version of ContextSmash to validate the core concept. The PoC will prioritize real-time feedback as the standout feature, include basic prompt editing and file handling, and set up a foundation for prompt templating and reusability. The goal is to test usability and gather feedback before expanding further.
Scope
Core Features for PoC

    File Picker:
        Drag-and-drop or multi-select file upload.
        Display uploaded files in a simple list.
    Symbolic Aliasing:
        Assign short names (e.g., {{vault}}) to file bundles manually.
        Show a Symbol Map with alias-to-file mappings.
    Raw Prompt Editor:
        Text area for writing prompts with symbolic placeholders (e.g., "Using {{vault}}...").
        Basic input handling.
    Final Prompt Viewer with Real-Time Feedback:
        Resolve aliases into merged text as the user types.
        Display character count and rough token estimate (e.g., 1 token ≈ 4 chars) instantly.
        Add a "Copy to Clipboard" button.
    Basic UI Layout:
        Single-page app with a split view: Raw Prompt Editor (left) and Final Prompt Viewer (right), Symbol Map above or beside.
        Minimal styling for clarity and usability.

Stretch Goals (if time/energy allows)

    Prompt Templating Foundation: Add a "Save as Template" button to store the current prompt in localStorage.
    Keyboard Shortcuts: Simple hotkeys (e.g., Ctrl+C for copy).

Out of Scope for PoC

    Tabbed interface (single session only).
    Advanced templating (e.g., library, import/export).
    Model-specific tokenization.
    Collaboration or cloud sync.

Tech Stack

    Frontend: HTMX + Alpine.js
        Why HTMX: Lightweight, server-driven updates for real-time feedback without heavy client-side logic.
        Why Alpine.js: Minimal reactive components (e.g., live updates, toggle states) without a full framework.
    Backend: None (static HTML/CSS/JS served locally or via a simple dev server).
    File Access: Browser File System Access API (Chrome/Edge-compatible) or basic <input type="file"> fallback.
    Storage: localStorage for session persistence (e.g., aliases, prompt state).
    Dependencies: None or minimal (e.g., a tiny tokenizer library if needed).

Development Phases
Phase 1: Setup & Skeleton

    Tasks:
        Set up a basic project structure (HTML, CSS, JS files).
        Create a static single-page layout with three sections: File Picker, Raw Prompt Editor, Final Prompt Viewer.
        Add a simple dev server (e.g., live-server or Python’s http.server) for local testing.
    Deliverable: A blank, styled webpage that loads in the browser.

Phase 2: File Handling

    Tasks:
        Implement drag-and-drop and file input for uploading files.
        Store file contents in memory (e.g., as JS objects).
        Display uploaded files in a list with an input field to assign aliases.
        Build a Symbol Map UI to show alias-to-file mappings.
    Deliverable: Users can upload files and assign aliases, with mappings visible.

Phase 3: Prompt Editing & Real-Time Feedback

    Tasks:
        Create a text area for the Raw Prompt Editor.
        Write logic to parse the prompt, detect {{alias}} patterns, and resolve them using the Symbol Map.
        Update the Final Prompt Viewer in real-time (via Alpine.js reactivity or HTMX polling).
        Add char count and basic token estimate (e.g., Math.ceil(charCount / 4)).
        Implement "Copy to Clipboard" with the Clipboard API.
    Deliverable: Users can type a prompt, see it resolve live with metadata, and copy the output.

Phase 4: Persistence & Polish

    Tasks:
        Save session state (files, aliases, prompt) to localStorage on change.
        Load saved state on page refresh.
        Add basic CSS for a clean, readable layout (e.g., flexbox, minimal colors).
        Test drag-and-drop and real-time updates across Chrome/Edge (and Firefox with fallback).
    Deliverable: A functional PoC that persists across refreshes with a usable UI.

Phase 5: Validation & Iteration

    Tasks:
        Test internally with sample workflows (e.g., "Write tests using {{vault}}").
        Identify rough edges (e.g., slow updates, alias errors).
        Gather feedback from a small group (e.g., you or a few prompt engineers).
        Document findings and prioritize next steps (e.g., templating).
    Deliverable: A validated PoC with notes for refinement.

Key Considerations

    Simplicity First: Keep the PoC lean—focus on real-time feedback as the "wow" factor. Avoid overbuilding templating until feedback justifies it.
    Browser Compatibility: Test primarily in Chrome (File System Access API), but ensure a graceful fallback (e.g., <input type="file">) works elsewhere.
    Performance: Real-time updates must feel instant—cap file sizes or defer heavy processing if needed.
    Extensibility: Structure the JS code (e.g., modular functions for alias resolution) to ease adding templating later.

Success Criteria

    Users can upload files, assign aliases, write a prompt, and see it resolve live with char/token counts.
    The experience feels snappy and intuitive (e.g., no noticeable lag in feedback).
    Session state persists across refreshes.
    Feedback from testing confirms the core value (real-time prompt crafting) resonates.

Next Steps Post-PoC

    Templating & Reusability: Add a template save/load system based on feedback.
    Refinement: Expand to tabs, better token estimation, or UI polish if validated.
    Deployment: Host on a static site (e.g., GitHub Pages) or prep for desktop (Tauri).
