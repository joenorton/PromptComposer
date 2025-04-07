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
        filename: 'prompt.txt',
        showFilenameDialog: false,
        newAlias: '',
        showWorkflowSaveDialog: false,
        workflowFilename: 'contextsmash-workflow.json',
        showSettingsDialog: false,
        editingAlias: null,
        editingAliasName: '',
        editingAliasValue: '',
        newManualAlias: '',
        newManualValue: '',
        showAliasDialog: false,
        finalPromptAnimationTimer: null,
        finalPromptContainer: null,

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

        // Insert symbol at cursor position
        insertSymbol(alias) {
            const editor = document.getElementById('raw-prompt-input');
            const currentText = Alpine.store('rawPrompt');
            const selectionStart = editor.selectionStart;
            const selectionEnd = editor.selectionEnd;

            // If there's a selection, replace it with the alias
            if (selectionStart !== selectionEnd) {
                const newText = currentText.substring(0, selectionStart) + alias + currentText.substring(selectionEnd);
                Alpine.store('rawPrompt', newText);
                editor.innerHTML = this.formatRawPrompt();
                
                // Set cursor position after the inserted alias
                const newCursorPos = selectionStart + alias.length;
                editor.setSelectionRange(newCursorPos, newCursorPos);
            } else {
                // If no selection, insert at cursor position or append to end
                const newText = currentText.substring(0, selectionStart) + alias + currentText.substring(selectionStart);
                Alpine.store('rawPrompt', newText);
                editor.innerHTML = this.formatRawPrompt();
                
                // Set cursor position after the inserted alias
                const newCursorPos = selectionStart + alias.length;
                editor.setSelectionRange(newCursorPos, newCursorPos);
            }
        },

        // Format final prompt with colored aliases
        formatFinalPrompt() {
            const rawPrompt = Alpine.store('rawPrompt');
            if (!rawPrompt || rawPrompt.trim() === '') {
                return '';
            }

            let result = rawPrompt;
            const aliases = Alpine.store('aliases');
            
            // Replace aliases with their content
            for (const [alias, content] of Object.entries(aliases)) {
                // Use the full alias (which already includes {{}})
                const regex = new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                result = result.replace(regex, content);
            }
            
            return result;
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
                    const content = e.target.result;
                    const alias = `{{${file.name.replace(/\.[^/.]+$/, "")}}}`;
                    const currentFiles = Alpine.store('files');
                    const fileData = {
                        name: file.name,
                        content,
                        type: file.type,
                        size: file.size
                    };
                    
                    Alpine.store('files', [...currentFiles, fileData]);
                    Alpine.store('aliases', {
                        ...Alpine.store('aliases'),
                        [alias]: content
                    });
                    
                    this.saveState();
                    this.showNotification(`Added: ${file.name}`, 'success');
                };
                reader.readAsText(file);
            });
        },

        deleteAlias(alias) {
            const content = Alpine.store('aliases')[alias];
            const newAliases = { ...Alpine.store('aliases') };
            delete newAliases[alias];
            Alpine.store('aliases', newAliases);

            if (this.isFileAlias(content)) {
                Alpine.store('files', Alpine.store('files').filter(f => f.content !== content));
            }
            
            this.saveState();
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

        // Check if an alias is file-based
        isFileAlias(content) {
            const files = Alpine.store('files');
            return files.some(f => f.content === content);
        },

        // Start editing an alias
        openAliasDialog(alias = null, content = null) {
            this.editingAlias = alias;
            this.editingAliasName = alias ? alias.slice(2, -2) : '';
            this.editingAliasValue = content || '';
            this.showAliasDialog = true;
            setTimeout(() => {
                document.getElementById('alias-name-input').focus();
            }, 100);
        },

        saveAlias() {
            const alias = this.editingAliasName.trim();
            const value = this.editingAliasValue.trim();

            if (!alias || !value) {
                this.showNotification('Alias and value are required', 'error');
                return;
            }

            // Normalize alias to {{alias}} format
            const normalizedAlias = alias.startsWith('{{') && alias.endsWith('}}') ? 
                alias : `{{${alias}}}`;

            // Check if we're trying to change to an existing alias
            const currentAliases = Alpine.store('aliases');
            if (normalizedAlias !== this.editingAlias && currentAliases[normalizedAlias]) {
                this.showNotification('Alias already exists', 'error');
                return;
            }

            // Create new aliases object with the updated alias
            const newAliases = { ...currentAliases };
            if (this.editingAlias) {
                delete newAliases[this.editingAlias];
            }
            newAliases[normalizedAlias] = value;

            // Update the store
            Alpine.store('aliases', newAliases);
            
            // Clear dialog state
            this.showAliasDialog = false;
            this.editingAlias = null;
            this.editingAliasName = '';
            this.editingAliasValue = '';
            
            // Save and notify
            this.saveState();
            this.showNotification(this.editingAlias ? 'Alias updated' : 'Alias added', 'success');
        },

        init() {
            const uploadArea = document.querySelector('.symbol-map .upload-area');
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = 'var(--primary-color)';
            });
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.style.borderColor = 'var(--border-color)';
            });
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = 'var(--border-color)';
                this.handleFiles({ target: { files: e.dataTransfer.files } });
            });
            this.finalPromptContainer = document.querySelector('.final-prompt-container');
            
            // Watch for changes in raw prompt and update final prompt
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
                
                // Trigger animation with debounce
                if (this.finalPromptAnimationTimer) {
                    clearTimeout(this.finalPromptAnimationTimer);
                }
                
                this.finalPromptAnimationTimer = setTimeout(() => {
                    if (this.finalPromptContainer) {
                        // Remove any existing animation class
                        this.finalPromptContainer.classList.remove('updated');
                        // Force a reflow
                        void this.finalPromptContainer.offsetWidth;
                        // Add the animation class
                        this.finalPromptContainer.classList.add('updated');
                        // Remove the class after animation completes
                        setTimeout(() => {
                            this.finalPromptContainer.classList.remove('updated');
                        }, 500);
                    }
                }, 100); // Reduced debounce time for more responsive feel
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

        // Start editing an alias
        startEditingAlias(alias, content) {
            this.openAliasDialog(alias, content);
        },

        // Cancel editing an alias
        cancelAliasEdit() {
            this.showAliasDialog = false;
            this.editingAlias = null;
            this.editingAliasName = '';
            this.editingAliasValue = '';
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