// Initialize Alpine.js store and state
document.addEventListener('alpine:init', () => {
    // Initialize stores with saved data or defaults
    Alpine.store('files', JSON.parse(localStorage.getItem('files')) || []);
    Alpine.store('aliases', JSON.parse(localStorage.getItem('aliases')) || {});
    Alpine.store('rawPrompt', localStorage.getItem('rawPrompt') || '');
    Alpine.store('finalPrompt', localStorage.getItem('finalPrompt') || '');
    Alpine.store('notifications', []);
    Alpine.store('settings', JSON.parse(localStorage.getItem('settings')) || {
        theme: 'light'
    });

    // Apply theme from settings
    document.documentElement.setAttribute('data-theme', Alpine.store('settings').theme);

    // Define the main app component
    Alpine.data('app', () => ({
        newAlias: '',
        selectedFile: null,
        showFilenameDialog: false,
        filename: 'prompt.txt',
        showWorkflowSaveDialog: false,
        workflowFilename: 'contextsmash-workflow.json',
        showSettingsDialog: false,
        // Properties for manual aliases
        newManualAlias: '',
        newManualValue: '',
        // Properties for editing aliases
        editingAlias: null,
        editingAliasName: '',
        editingAliasValue: '',

        // Format raw prompt with colored aliases
        formatRawPrompt() {
            const rawPrompt = Alpine.store('rawPrompt');
            if (!rawPrompt) return '';
            
            const aliases = Alpine.store('aliases');
            
            // Find all alias patterns
            const aliasPattern = /{{([^}]+)}}/g;
            const matches = [...rawPrompt.matchAll(aliasPattern)];
            
            // Only format if we found aliases
            if (matches.length === 0) return this.escapeHtml(rawPrompt);
            
            // Track which aliases we've seen
            const seenAliases = new Set();
            
            // Create a list of replacements to apply in order
            const replacements = matches.map(match => {
                const [fullMatch, aliasInner] = match;
                const aliasKey = `{{${aliasInner}}}`;
                const index = match.index;
                
                if (aliases[aliasKey]) {
                    if (seenAliases.has(aliasKey)) {
                        // This is a subsequent match
                        return {
                            index,
                            length: fullMatch.length,
                            replacement: `<span class="subsequent-alias">${this.escapeHtml(fullMatch)}</span>`
                        };
                    } else {
                        // This is the first match
                        seenAliases.add(aliasKey);
                        return {
                            index,
                            length: fullMatch.length,
                            replacement: `<span class="valid-alias">${this.escapeHtml(fullMatch)}</span>`
                        };
                    }
                } else {
                    return {
                        index,
                        length: fullMatch.length,
                        replacement: `<span class="invalid-alias">${this.escapeHtml(fullMatch)}</span>`
                    };
                }
            });
            
            // Apply replacements from last to first to maintain indices
            let result = rawPrompt;
            replacements.sort((a, b) => b.index - a.index).forEach(({ index, length, replacement }) => {
                result = result.slice(0, index) + replacement + result.slice(index + length);
            });
            
            return this.escapeHtml(result)
                .replace(/&lt;span class="(valid|invalid|subsequent)-alias"&gt;/g, '<span class="$1-alias">')
                .replace(/&lt;\/span&gt;/g, '</span>');
        },

        // Helper function to escape HTML
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        // Handle raw prompt input
        handleRawPromptInput(event) {
            const editor = event.target;
            const text = editor.innerText || editor.textContent;
            
            if (Alpine.store('rawPrompt') !== text) {
                Alpine.store('rawPrompt', text);
            }
        
            if (this.formatDebounceTimer) {
                clearTimeout(this.formatDebounceTimer);
            }
        
            this.formatDebounceTimer = setTimeout(() => {
                const selection = window.getSelection();
                let range = selection.rangeCount ? selection.getRangeAt(0) : null;
                let cursorOffset = 0;
        
                if (range) {
                    // Get cursor position in plain text terms
                    const preCaretRange = range.cloneRange();
                    preCaretRange.selectNodeContents(editor);
                    preCaretRange.setEnd(range.startContainer, range.startOffset);
                    cursorOffset = preCaretRange.toString().length; // Count characters before cursor
                }
        
                const formatted = this.formatRawPrompt();
                
                if (formatted && formatted !== editor.innerHTML) {
                    editor.innerHTML = formatted;
        
                    if (range) {
                        // Restore cursor based on character count
                        let charCount = 0;
                        const walk = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
                        let targetNode = null;
                        let targetOffset = 0;
        
                        while (targetNode = walk.nextNode()) {
                            const nodeLength = targetNode.length;
                            if (charCount + nodeLength >= cursorOffset) {
                                targetOffset = cursorOffset - charCount;
                                break;
                            }
                            charCount += nodeLength;
                        }
        
                        if (targetNode) {
                            const newRange = document.createRange();
                            newRange.setStart(targetNode, Math.min(targetOffset, targetNode.length));
                            newRange.collapse(true);
                            selection.removeAllRanges();
                            selection.addRange(newRange);
                        }
                    }
                }
            }, 200); // Slightly longer debounce for stability
        },

        // Format final prompt with colored aliases
        formatFinalPrompt() {
            const rawPrompt = Alpine.store('rawPrompt');
            const aliases = Alpine.store('aliases');
            let result = rawPrompt;
            let hasInvalidAlias = false;
            
            // Find all alias patterns
            const aliasPattern = /{{([^}]+)}}/g;
            const matches = [...rawPrompt.matchAll(aliasPattern)];
            
            // Check for invalid aliases
            matches.forEach(match => {
                const [fullMatch, aliasInner] = match;
                // Check if the full match exists in aliases
                if (!aliases[fullMatch]) {
                    hasInvalidAlias = true;
                }
            });
            
            // If there are invalid aliases, return empty string
            if (hasInvalidAlias) {
                return '';
            }
            
            // Replace each alias with its content
            matches.forEach(match => {
                const [fullMatch] = match;
                const content = aliases[fullMatch];
                if (content) {
                    result = result.replace(fullMatch, content);
                }
            });
            
            // Escape HTML characters and wrap in pre tag
            result = result
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
            
            return `<pre>${result}</pre>`;
        },

        // Save state to localStorage
        saveState() {
            localStorage.setItem('files', JSON.stringify(Alpine.store('files')));
            localStorage.setItem('aliases', JSON.stringify(Alpine.store('aliases')));
            localStorage.setItem('rawPrompt', Alpine.store('rawPrompt'));
            localStorage.setItem('finalPrompt', Alpine.store('finalPrompt'));
        },

        // Save workflow to a file
        saveWorkflow() {
            this.showWorkflowSaveDialog = true;
            setTimeout(() => {
                document.getElementById('workflow-filename-input').focus();
            }, 100);
        },

        confirmWorkflowSave() {
            if (!this.workflowFilename.trim()) {
                this.showNotification('Please enter a filename', 'error');
                return;
            }

            const filename = this.workflowFilename.endsWith('.json') ? this.workflowFilename : `${this.workflowFilename}.json`;
            
            const workflow = {
                files: Alpine.store('files'),
                aliases: Alpine.store('aliases'),
                rawPrompt: Alpine.store('rawPrompt'),
                finalPrompt: Alpine.store('finalPrompt')
            };

            const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showWorkflowSaveDialog = false;
            this.showNotification('Workflow saved', 'success');
        },

        // Open workflow from file
        openWorkflow() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const workflow = JSON.parse(e.target.result);
                        
                        // Validate workflow structure
                        if (!workflow.files || !workflow.aliases || !workflow.rawPrompt || !workflow.finalPrompt) {
                            throw new Error('Invalid workflow file');
                        }

                        // Clear current state
                        Alpine.store('files', []);
                        Alpine.store('aliases', {});
                        Alpine.store('rawPrompt', '');
                        Alpine.store('finalPrompt', '');

                        // Load files first
                        Alpine.store('files', workflow.files);

                        // Load aliases, validating file-based ones
                        const validatedAliases = {};
                        Object.entries(workflow.aliases).forEach(([alias, content]) => {
                            // Check if this is a file-based alias
                            const isFileAlias = workflow.files.some(f => f.content === content);
                            
                            // Only keep the alias if:
                            // 1. It's a manual alias (not file-based), OR
                            // 2. It's a file-based alias and the file exists in the workflow
                            if (!isFileAlias || (isFileAlias && workflow.files.some(f => f.content === content))) {
                                validatedAliases[alias] = content;
                            }
                        });

                        Alpine.store('aliases', validatedAliases);
                        Alpine.store('rawPrompt', workflow.rawPrompt);
                        Alpine.store('finalPrompt', workflow.finalPrompt);

                        this.saveState();
                        this.showNotification('Workflow loaded', 'success');
                    } catch (err) {
                        console.error('Error loading workflow:', err);
                        this.showNotification('Error loading workflow file', 'error');
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        },

        // Clear workflow
        clearWorkflow() {
            if (confirm('Are you sure you want to clear the current workflow? This cannot be undone.')) {
                Alpine.store('files', []);
                Alpine.store('aliases', {});
                Alpine.store('rawPrompt', '');
                Alpine.store('finalPrompt', '');
                this.saveState();
                this.showNotification('Workflow cleared', 'success');
            }
        },

        // Utility functions
        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },

        getFileNameForContent(content) {
            const files = Alpine.store('files');
            const file = files.find(f => f.content === content);
            return file ? file.name : 'Unknown file';
        },

        getAliasForFile(file) {
            const aliases = Alpine.store('aliases');
            const alias = Object.entries(aliases).find(([_, content]) => content === file.content);
            return alias ? alias[0] : '';  // alias[0] is already in {{name}} format since that's how we store it
        },

        showNotification(message, type = 'info') {
            const id = Date.now();
            Alpine.store('notifications', [
                ...Alpine.store('notifications'),
                { id, message, type }
            ]);
            setTimeout(() => {
                Alpine.store('notifications', Alpine.store('notifications').filter(n => n.id !== id));
            }, 3000);
        },

        // File handling
        handleFiles(event) {
            const files = Array.from(event.target.files);
            
            files.forEach(file => {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    try {
                        const content = e.target.result;
                        // Get filename without extension for alias
                        const alias = file.name.replace(/\.[^/.]+$/, "");
                        // Add brackets to alias
                        const normalizedAlias = `{{${alias}}}`;
                        
                        // Store file content and metadata
                        const currentFiles = Alpine.store('files');
                        Alpine.store('files', [
                            ...currentFiles,
                            {
                                name: file.name,
                                content,
                                type: file.type,
                                size: file.size
                            }
                        ]);
                        
                        // Automatically assign alias with brackets
                        const currentAliases = Alpine.store('aliases');
                        Alpine.store('aliases', {
                            ...currentAliases,
                            [normalizedAlias]: content
                        });
                        
                        this.saveState(); // Save after adding file
                        this.showNotification(`File uploaded: ${file.name}`, 'success');
                    } catch (err) {
                        console.error('Error reading file:', err);
                        this.showNotification(`Error reading file: ${file.name}`, 'error');
                    }
                };

                reader.onerror = () => {
                    this.showNotification(`Error reading file: ${file.name}`, 'error');
                };

                reader.readAsText(file);
            });
        },

        removeFile(file) {
            // Remove any aliases associated with this file
            const currentAliases = Alpine.store('aliases');
            const newAliases = { ...currentAliases };
            Object.entries(newAliases).forEach(([alias, content]) => {
                if (content === file.content) {
                    delete newAliases[alias];
                }
            });
            Alpine.store('aliases', newAliases);

            // Remove the file
            const currentFiles = Alpine.store('files');
            Alpine.store('files', currentFiles.filter(f => f !== file));
            
            this.saveState(); // Save after removing file
            this.showNotification('File removed', 'success');
        },

        assignAlias(file) {
            if (!this.newAlias.trim()) {
                this.showNotification('Please enter an alias', 'error');
                return;
            }
            
            // Normalize alias to {{alias}} format if not already
            const normalizedAlias = this.newAlias.startsWith('{{') && this.newAlias.endsWith('}}') ? 
                this.newAlias : `{{${this.newAlias}}}`;
            
            // Check if alias already exists
            const currentAliases = Alpine.store('aliases');
            if (currentAliases[normalizedAlias] && currentAliases[normalizedAlias] !== file.content) {
                this.showNotification('Alias already exists', 'error');
                return;
            }
            
            // Update aliases store
            Alpine.store('aliases', {
                ...currentAliases,
                [normalizedAlias]: file.content
            });
            
            // Clear input and selection
            this.newAlias = '';
            this.selectedFile = null;
            
            this.saveState(); // Save after assigning alias
            this.showNotification('Alias assigned', 'success');
        },

        deleteAlias(alias) {
            const currentAliases = Alpine.store('aliases');
            const newAliases = { ...currentAliases };
            delete newAliases[alias];
            Alpine.store('aliases', newAliases);
            
            this.saveState(); // Save after deleting alias
            this.showNotification('Alias removed', 'success');
        },

        copyToClipboard() {
            const prompt = Alpine.store('finalPrompt');
            navigator.clipboard.writeText(prompt)
                .then(() => this.showNotification('Copied to clipboard', 'success'))
                .catch(() => this.showNotification('Failed to copy', 'error'));
        },

        saveToFile() {
            this.showFilenameDialog = true;
            setTimeout(() => {
                document.getElementById('filename-input').focus();
            }, 100);
        },

        confirmSave() {
            if (!this.filename.trim()) {
                this.showNotification('Please enter a filename', 'error');
                return;
            }

            const filename = this.filename.endsWith('.txt') ? this.filename : `${this.filename}.txt`;
            
            const prompt = Alpine.store('finalPrompt');
            const blob = new Blob([prompt], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showFilenameDialog = false;
            this.showNotification('File saved', 'success');
        },

        // Add manual alias
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
        },

        // Check if an alias is file-based
        isFileAlias(content) {
            const files = Alpine.store('files');
            return files.some(f => f.content === content);
        },

        // Start editing an alias
        startEditingAlias(alias, content) {
            this.editingAlias = alias;
            // Remove {{ and }} from alias for editing
            this.editingAliasName = alias.slice(2, -2);
            this.editingAliasValue = content;
        },

        // Save edited alias
        saveEditingAlias() {
            const oldAlias = this.editingAlias;
            const newAlias = this.editingAliasName.trim();
            const newValue = this.editingAliasValue.trim();

            if (!newAlias || !newValue) {
                this.showNotification('Alias and value are required', 'error');
                return;
            }

            // Normalize new alias to {{alias}} format
            const normalizedNewAlias = newAlias.startsWith('{{') && newAlias.endsWith('}}') ? 
                newAlias : `{{${newAlias}}}`;

            // Check if we're trying to change to an existing alias
            const currentAliases = Alpine.store('aliases');
            if (normalizedNewAlias !== oldAlias && currentAliases[normalizedNewAlias]) {
                this.showNotification('Alias already exists', 'error');
                return;
            }

            // Create new aliases object with the updated alias
            const newAliases = { ...currentAliases };
            delete newAliases[oldAlias];
            newAliases[normalizedNewAlias] = newValue;

            // Update the store
            Alpine.store('aliases', newAliases);
            
            // Clear editing state
            this.cancelEditingAlias();
            
            // Save and notify
            this.saveState();
            this.showNotification('Alias updated', 'success');
        },

        // Cancel editing
        cancelEditingAlias() {
            this.editingAlias = null;
            this.editingAliasName = '';
            this.editingAliasValue = '';
        },

        init() {
            // Set up drag and drop handlers
            const uploadArea = document.querySelector('.upload-area');
            
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = '#666';
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.style.borderColor = '#ccc';
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = '#ccc';
                const files = e.dataTransfer.files;
                this.handleFiles({ target: { files } });
            });
        },

        // Theme switching
        setTheme(theme) {
            Alpine.store('settings').theme = theme;
            document.documentElement.setAttribute('data-theme', theme);
            this.saveSettings();
        },

        // Save settings to localStorage
        saveSettings() {
            localStorage.setItem('settings', JSON.stringify(Alpine.store('settings')));
        },
    }));
});

// Watch for changes in raw prompt and update final prompt
document.addEventListener('alpine:init', () => {
    Alpine.effect(() => {
        const rawPrompt = Alpine.store('rawPrompt');
        const aliases = Alpine.store('aliases');
        
        // Replace aliases with their content
        let finalPrompt = rawPrompt;
        for (const [alias, content] of Object.entries(aliases)) {
            // Use the full alias (which already includes {{}})
            const regex = new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            finalPrompt = finalPrompt.replace(regex, content);
        }
        
        Alpine.store('finalPrompt', finalPrompt);
        // Save state when raw prompt changes
        localStorage.setItem('rawPrompt', rawPrompt);
        localStorage.setItem('finalPrompt', finalPrompt);
    });
}); 