// Initialize Alpine.js store and state
document.addEventListener('alpine:init', () => {
    Alpine.store('files', []);
    Alpine.store('aliases', {});
    Alpine.store('rawPrompt', '');
    Alpine.store('finalPrompt', '');
    Alpine.store('notifications', []);

    // Add utility functions to Alpine
    Alpine.data('formatFileSize', (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    });

    Alpine.data('showNotification', function(message, type = 'info') {
        const id = Date.now();
        Alpine.store('notifications', [
            ...Alpine.store('notifications'),
            { id, message, type }
        ]);
        setTimeout(() => {
            Alpine.store('notifications', Alpine.store('notifications').filter(n => n.id !== id));
        }, 3000);
    });

    Alpine.data('removeFile', function(file) {
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
    });

    Alpine.data('assignAlias', function(file) {
        if (!this.newAlias.trim()) {
            this.showNotification('Please enter an alias', 'error');
            return;
        }
        
        // Check if alias already exists
        const currentAliases = Alpine.store('aliases');
        if (currentAliases[this.newAlias]) {
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
    });

    Alpine.data('deleteAlias', function(alias) {
        const currentAliases = Alpine.store('aliases');
        const newAliases = { ...currentAliases };
        delete newAliases[alias];
        Alpine.store('aliases', newAliases);
        this.showNotification('Alias removed', 'success');
    });

    Alpine.data('copyToClipboard', async function() {
        try {
            await navigator.clipboard.writeText(Alpine.store('finalPrompt'));
            this.showNotification('Copied to clipboard', 'success');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            this.showNotification('Failed to copy', 'error');
        }
    });

    Alpine.data('saveToFile', function() {
        const prompt = Alpine.store('finalPrompt');
        if (!prompt) {
            this.showNotification('No prompt to save', 'error');
            return;
        }

        try {
            // Create a blob with the prompt content
            const blob = new Blob([prompt], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);

            // Create a temporary link element
            const a = document.createElement('a');
            a.href = url;
            a.download = 'prompt.txt';
            document.body.appendChild(a);
            a.click();

            // Clean up
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showNotification('File saved', 'success');
        } catch (err) {
            console.error('Failed to save file: ', err);
            this.showNotification('Failed to save file', 'error');
        }
    });
});

// File handling
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const uploadArea = document.querySelector('.upload-area');
    
    // Handle file input change
    fileInput.addEventListener('change', handleFiles);
    
    // Handle drag and drop
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
        handleFiles({ target: { files } });
    });
});

// Process uploaded files
function handleFiles(event) {
    const files = Array.from(event.target.files);
    const validTypes = ['text/plain', 'application/json', 'text/markdown', 'text/x-markdown'];
    
    files.forEach(file => {
        // Validate file type
        if (!validTypes.includes(file.type)) {
            Alpine.store('notifications', [
                ...Alpine.store('notifications'),
                { 
                    id: Date.now(), 
                    message: `Unsupported file type: ${file.name}`, 
                    type: 'error' 
                }
            ]);
            return;
        }

        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const content = e.target.result;
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
                
                Alpine.store('notifications', [
                    ...Alpine.store('notifications'),
                    { 
                        id: Date.now(), 
                        message: `File uploaded: ${file.name}`, 
                        type: 'success' 
                    }
                ]);
            } catch (err) {
                console.error('Error reading file:', err);
                Alpine.store('notifications', [
                    ...Alpine.store('notifications'),
                    { 
                        id: Date.now(), 
                        message: `Error reading file: ${file.name}`, 
                        type: 'error' 
                    }
                ]);
            }
        };

        reader.onerror = () => {
            Alpine.store('notifications', [
                ...Alpine.store('notifications'),
                { 
                    id: Date.now(), 
                    message: `Error reading file: ${file.name}`, 
                    type: 'error' 
                }
            ]);
        };

        reader.readAsText(file);
    });
}

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