// Initialize Alpine.js store and state
document.addEventListener('alpine:init', () => {
    // Initialize stores with saved data or defaults
    Alpine.store('files', JSON.parse(localStorage.getItem('files')) || []);
    Alpine.store('aliases', JSON.parse(localStorage.getItem('aliases')) || {});
    Alpine.store('rawPrompt', localStorage.getItem('rawPrompt') || '');
    Alpine.store('finalPrompt', localStorage.getItem('finalPrompt') || '');
    Alpine.store('notifications', []);

    // Define the main app component
    Alpine.data('app', () => ({
        newAlias: '',
        selectedFile: null,
        showFilenameDialog: false,
        filename: 'prompt.txt',
        showWorkflowSaveDialog: false,
        workflowFilename: 'contextsmash-workflow.json',

        // Format raw prompt with colored aliases
        formatRawPrompt() {
            const rawPrompt = Alpine.store('rawPrompt');
            const aliases = Alpine.store('aliases');
            let result = rawPrompt;
            
            // Find all alias patterns
            const aliasPattern = /{{([^}]+)}}/g;
            const matches = [...rawPrompt.matchAll(aliasPattern)];
            
            // Replace each alias with colored content
            matches.forEach(match => {
                const [fullMatch, alias] = match;
                const content = aliases[alias];
                if (content) {
                    // Valid alias - color it green
                    result = result.replace(fullMatch, `<span class="valid-alias">${fullMatch}</span>`);
                } else {
                    // Invalid alias - color it red
                    result = result.replace(fullMatch, `<span class="invalid-alias">${fullMatch}</span>`);
                }
            });
            
            return result;
        },

        // Handle raw prompt input
        handleRawPromptInput(event) {
            const editor = event.target;
            const text = editor.innerText;
            Alpine.store('rawPrompt', text);
            
            // Update the content with colored aliases
            requestAnimationFrame(() => {
                const formatted = this.formatRawPrompt();
                if (formatted !== editor.innerHTML) {
                    editor.innerHTML = formatted;
                    // Move cursor to end
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(editor);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            });
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
                const [fullMatch, alias] = match;
                if (!aliases[alias]) {
                    hasInvalidAlias = true;
                }
            });
            
            // If there are invalid aliases, return empty string
            if (hasInvalidAlias) {
                return '';
            }
            
            // Replace each alias with its content
            matches.forEach(match => {
                const [fullMatch, alias] = match;
                const content = aliases[alias];
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

                        // Load new workflow
                        Alpine.store('files', workflow.files);
                        Alpine.store('aliases', workflow.aliases);
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
            return alias ? '{{' + alias[0] + '}}' : '';
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
                        
                        // Automatically assign alias
                        const currentAliases = Alpine.store('aliases');
                        Alpine.store('aliases', {
                            ...currentAliases,
                            [alias]: content
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
            
            // Check if alias already exists
            const currentAliases = Alpine.store('aliases');
            if (currentAliases[this.newAlias] && currentAliases[this.newAlias] !== file.content) {
                this.showNotification('Alias already exists', 'error');
                return;
            }
            
            // Update aliases store
            Alpine.store('aliases', {
                ...currentAliases,
                [this.newAlias]: file.content
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
        }
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
            const regex = new RegExp(`{{${alias}}}`, 'g');
            finalPrompt = finalPrompt.replace(regex, content);
        }
        
        Alpine.store('finalPrompt', finalPrompt);
        // Save state when raw prompt changes
        localStorage.setItem('rawPrompt', rawPrompt);
        localStorage.setItem('finalPrompt', finalPrompt);
    });
}); 