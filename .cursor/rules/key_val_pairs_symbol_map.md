Below is a quick specification for adding key-value pair functionality to the Symbol Map in your ContextSmash web PoC, based on the provided app.js. This spec outlines the feature’s purpose, UI changes, and modifications to the existing code structure—without rewriting the full implementation. I’ll highlight where and how to integrate it into your current setup, leveraging Alpine.js and your existing stores, while keeping it lean and compatible with the real-time feedback system.

Specification: Key-Value Pairs in Symbol Map

Purpose
Enable users to manually define aliases with custom text values directly in the Symbol Map (e.g., {{SEPP}} = "---\n"), alongside file-based aliases. These key-value pairs will be stored in the aliases store, resolved in prompts like file contents, and persisted via localStorage. This enhances flexibility for quick-access symbols (e.g., separators, boilerplate) without requiring file uploads.
Requirements

    UI Addition: Add an input area in the Symbol Map to create new key-value pairs.
    Storage: Store manual aliases in the existing Alpine.store('aliases') alongside file-based entries.
    Resolution: Ensure the prompt resolution logic treats manual aliases identically to file-based ones.
    Persistence: Save and load manual aliases with the existing saveState mechanism.
    Feedback: Provide success/error notifications for adding/deleting manual aliases.

Proposed Changes
1. UI Integration
Where: In the HTML tied to Alpine.data('app'), likely near the Symbol Map display (e.g., where aliases are listed).
What to Add:

    A "New Alias" section with two inputs:
        Alias name (e.g., {{SEPP}} or just SEPP, normalized to {{SEPP}}).
        Value (e.g., "---\n").
    A button to submit the pair.
    Update the Symbol Map list to distinguish manual vs. file-based aliases visually (optional).

HTML Example:
html

<div class="symbol-map">
  <!-- Existing alias list -->
  <template x-for="(content, alias) in $store.aliases" :key="alias">
    <div>
      <span x-text="`{{${alias}}}`"></span> -> 
      <span x-text="content.length > 50 ? content.slice(0, 50) + '...' : content"></span>
      <button @click="deleteAlias(alias)">Delete</button>
    </div>
  </template>
  <!-- New key-value input -->
  <div class="new-alias-input">
    <input x-model="newManualAlias" placeholder="Alias (e.g., SEPP)" />
    <input x-model="newManualValue" placeholder="Value (e.g., ---)" />
    <button @click="addManualAlias">Add Alias</button>
  </div>
</div>

Notes:

    Bind inputs to new app properties: newManualAlias and newManualValue.
    Reuse the existing deleteAlias method for removal.

2. State Management
Where: In Alpine.data('app') initialization and methods.
What to Add:

    Add properties for the new inputs:
    javascript

    Alpine.data('app', () => ({
      // Existing properties...
      newManualAlias: '',
      newManualValue: '',
      // Existing methods...
    }));

    Add a method to handle submission:
    javascript

    addManualAlias() {
      const alias = this.newManualAlias.trim();
      const value = this.newManualValue.trim();

      if (!alias || !value) {
        this.showNotification('Alias and value are required', 'error');
        return;
      }

      // Normalize alias to {{alias}} format if not already
      const normalizedAlias = alias.startsWith('{{') && alias.endsWith('}}') ? alias : `{{${alias}}}`;
      const currentAliases = Alpine.store('aliases');

      if (currentAliases[normalizedAlias] && currentAliases[normalizedAlias] !== value) {
        this.showNotification('Alias already exists with different value', 'error');
        return;
      }

      Alpine.store('aliases', {
        ...currentAliases,
        [normalizedAlias]: value
      });

      this.newManualAlias = '';
      this.newManualValue = '';
      this.saveState();
      this.showNotification('Manual alias added', 'success');
    }

Notes:

    Store the alias with {{}} to match existing resolution logic (e.g., {{SEPP}} as the key).
    Reuse saveState to persist to localStorage.

3. Alias Resolution
Where: In formatFinalPrompt, handleRawPromptInput, and the Alpine effect for finalPrompt.
What to Change:

    No major changes needed! The existing logic already:
        Uses Alpine.store('aliases') for replacements.
        Matches {{alias}} patterns via regex.
        Replaces with whatever content is stored (file or manual text).
    Verification: Ensure manual aliases (e.g., {{SEPP}}) resolve correctly in:
    javascript

    // In formatFinalPrompt
    matches.forEach(match => {
      const [fullMatch, alias] = match; // alias is "SEPP" from "{{SEPP}}"
      const content = aliases[`{{${alias}}}`]; // Looks up "{{SEPP}}" in store
      if (content) {
        result = result.replace(fullMatch, content); // Works for files or manual values
      }
    });

    And in the effect:
    javascript

    for (const [alias, content] of Object.entries(aliases)) {
      const regex = new RegExp(`{{${alias.slice(2, -2)}}}`, 'g'); // Strips {{}} for match
      finalPrompt = finalPrompt.replace(regex, content); // Works as-is
    }

Notes:

    The slice(2, -2) in the effect assumes keys are {{alias}}—consistent with manual entry normalization.

4. Persistence
Where: In saveState and initial store setup.
What to Change:

    No changes needed! saveState already serializes Alpine.store('aliases') to localStorage:
    javascript

    localStorage.setItem('aliases', JSON.stringify(Alpine.store('aliases')));

    Manual aliases (e.g., {"{{SEPP}}": "---\n"}) will persist and reload with file-based ones.

5. Optional Enhancements

    Visual Distinction: In the Symbol Map UI, check if an alias maps to a file in Alpine.store('files'):
    html

    <span x-text="Object.values($store.files).some(f => f.content === content) ? 'File' : 'Manual'"></span>

    Validation: Add checks in addManualAlias (e.g., no spaces in alias names, max length).

Integration Points in app.js

    Initialization:
        Add newManualAlias and newManualValue to Alpine.data('app').
    Methods:
        Add addManualAlias method as described.
        Reuse deleteAlias and saveState as-is.
    HTML (not shown in app.js):
        Add the input UI to your Symbol Map section, calling addManualAlias.

Example Workflow

    User types SEPP and ---\n in the inputs, clicks "Add Alias".
    addManualAlias stores {{SEPP}} -> "---\n" in Alpine.store('aliases').
    Typing {{SEPP}} in the Raw Prompt Editor resolves to "---\n" live.
    State persists, reloads, and deletes work seamlessly.

Why This Works

    Leverages existing aliases store and resolution logic—no rewrite needed.
    Fits Alpine.js’s reactive model for real-time updates.
    Keeps the PoC lean while adding a powerful feature.
