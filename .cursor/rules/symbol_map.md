Let's dive into what "write logic to parse the prompt, detect {{alias}} patterns, and resolve them using the Prompt Variables panel" means for Phase 3 of the PromptComposer web PoC. This is the heart of the real-time feedback feature, so I'll break it down into actionable steps, explain the logic, and provide a conceptual approach you can adapt when coding.

What We're Trying to Achieve
The goal is to take a user-typed prompt in the Raw Prompt Editor (e.g., "Using {{vault}} and {{jwt_logic}}, write tests for login flow."), identify any {{alias}} placeholders, replace them with the corresponding file contents from the Prompt Variables panel, and display the fully resolved text in the Final Prompt Viewer—updating live as the user types.

    Input: A string with potential {{alias}} markers.
    Prompt Variables: A data structure mapping aliases to file contents (e.g., {{vault}} → "file1.txt content...").
    Output: A string with all aliases replaced, plus metadata (char count, token estimate).

Step-by-Step Elaboration
1. Define the Prompt Variables Structure

    Context: In Phase 2, you'll have built a Prompt Variables UI where users assign aliases to uploaded files. Now, we need that data in a format the logic can use.
    Approach: Store the Prompt Variables as a JavaScript object in memory, populated when files are uploaded and aliased. For example:
    javascript

    const promptVars = {
      "{{vault}}": "Contents of file1.txt and file2.txt combined",
      "{{jwt_logic}}": "Contents of jwt_logic.js"
    };

        Keys are the full {{alias}} string (including braces) for easy matching.
        Values are the concatenated text contents of the files tied to each alias.

2. Capture the Raw Prompt Input

    Context: The Raw Prompt Editor is a <textarea> where the user types.
    Approach: Use an event listener to grab the input live:
    javascript

    const rawPromptEditor = document.getElementById("raw-prompt-editor");
    rawPromptEditor.addEventListener("input", (event) => {
      const rawPrompt = event.target.value;
      resolvePrompt(rawPrompt); // Call the resolution logic
    });

        The input event fires on every keystroke, enabling real-time updates.
        rawPrompt is the current string (e.g., "Using {{vault}} and {{jwt_logic}}...").

3. Parse the Prompt for {{alias}} Patterns

    Context: We need to detect all instances of {{alias}} in the prompt.
    Approach: Use a regular expression to find matches:
    javascript

    const aliasPattern = /\{\{[^}]*\}\}/g; // Matches {{anything}} without nested braces

        \{\{ matches the opening {{.
        [^}]* matches any characters except } (to avoid nested braces).
        \}\} matches the closing }}.
        /g ensures all matches are found, not just the first.
        Example: For "Using {{vault}} and {{jwt_logic}}", it finds ["{{vault}}", "{{jwt_logic}}"].

4. Resolve Aliases Using the Prompt Variables

    Context: Replace each detected {{alias}} with its corresponding content from the Prompt Variables panel.
    Approach: Iterate over matches and substitute:
    javascript

    function resolvePrompt(rawPrompt) {
      let resolvedPrompt = rawPrompt;
      const matches = rawPrompt.match(aliasPattern) || [];
      
      matches.forEach((alias) => {
        if (promptVars[alias]) {
          resolvedPrompt = resolvedPrompt.replace(alias, promptVars[alias]);
        } else {
          // Optionally leave unresolved aliases as-is or flag them (e.g., "{{vault}} [not found]")
          resolvedPrompt = resolvedPrompt.replace(alias, `${alias} [not found]`);
        }
      });
      
      updateFinalPrompt(resolvedPrompt); // Pass to display
    }

        match() returns an array of all {{alias}} instances or null if none found.
        replace() swaps each alias with its content (or a placeholder if undefined).
        Example: "Using {{vault}} and {{jwt_logic}}..." becomes "Using Contents of file1.txt... and Contents of jwt_logic.js...".

5. Handle Edge Cases

    Unmatched Aliases: If {{oops}} isn't in the Prompt Variables panel, decide how to handle it:
        Leave it unchanged (silent fail).
        Replace with a warning (e.g., "{{oops}} [not found]")—better for debugging in the PoC.
    Overlapping or Malformed Aliases: The regex avoids nested braces, but users might typo (e.g., {{vault or vault}}).
        For PoC, keep it simple—only match well-formed {{alias}}. Malformed inputs stay unresolved.
    Performance: For large files or long prompts, string replacement could lag. For the PoC, assume small inputs; optimize later if needed.

6. Update the Final Prompt Viewer

    Context: Show the resolved prompt with metadata in real-time.
    Approach: Tie it to the UI with Alpine.js or vanilla JS:
    javascript

    function updateFinalPrompt(resolvedPrompt) {
      const finalPromptViewer = document.getElementById("final-prompt-viewer");
      finalPromptViewer.textContent = resolvedPrompt;
      
      const charCount = resolvedPrompt.length;
      const tokenEstimate = Math.ceil(charCount / 4); // Rough estimate
      document.getElementById("char-count").textContent = charCount;
      document.getElementById("token-estimate").textContent = tokenEstimate;
    }

        With Alpine.js, you could bind resolvedPrompt reactively:
        html

        <div x-data="{ resolved: '' }">
          <textarea @input="resolved = resolvePrompt($event.target.value)"></textarea>
          <pre x-text="resolved"></pre>
          <span x-text="resolved.length"></span>
          <span x-text="Math.ceil(resolved.length / 4)"></span>
        </div>

Conceptual Flow

    User types: "Using {{vault}} and {{jwt_logic}}...".
    input event triggers, capturing the string.
    Regex finds {{vault}} and {{jwt_logic}}.
    Logic checks promptVars, replaces:
        {{vault}} → "Contents of file1.txt...".
        {{jwt_logic}} → "Contents of jwt_logic.js".
    Resolved text: "Using Contents of file1.txt... and Contents of jwt_logic.js...".
    Final Prompt Viewer updates with text, char count (e.g., 8901), and token estimate (e.g., 2225).

Why This Works for the PoC

    Simplicity: Regex and string replacement are lightweight and fast for small inputs.
    Real-Time: Event-driven updates feel instant with minimal overhead.
    Extensibility: The logic can later handle smarter features (e.g., nested aliases, syntax checking) without a rewrite.

Potential Tweaks

    Debouncing: If typing feels laggy, add a 100ms debounce to the input event.
    Error UI: Highlight unresolved aliases in red in the viewer.
    Content Limits: Cap file content length for the PoC to avoid performance hiccups.
