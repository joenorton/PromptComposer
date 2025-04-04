// Initialize Alpine.js store and state
document.addEventListener('alpine:init', () => {
    // Initialize stores
    Alpine.store('files', []);
    Alpine.store('aliases', {});
    Alpine.store('rawPrompt', '');
    Alpine.store('finalPrompt', '');
    Alpine.store('notifications', []);

    // Define the main app component
    Alpine.data('app', () => ({
        newAlias: '',
        selectedFile: null,
        showFilenameDialog: false,
        filename: 'prompt.txt',

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
            this.showNotification('Alias assigned', 'success');
        },

        deleteAlias(alias) {
            const currentAliases = Alpine.store('aliases');
            const newAliases = { ...currentAliases };
            delete newAliases[alias];
            Alpine.store('aliases', newAliases);
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
            // Focus the input after a short delay to ensure it's visible
            setTimeout(() => {
                document.getElementById('filename-input').focus();
            }, 100);
        },

        confirmSave() {
            if (!this.filename.trim()) {
                this.showNotification('Please enter a filename', 'error');
                return;
            }

            // Ensure the filename has a .txt extension
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
    });
}); 