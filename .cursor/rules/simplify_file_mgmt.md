Implementation Plan
1. UI Modifications (index.html)

    Remove the entire .file-picker div from .main-content
    Add upload functionality to .symbol-map section
    Update the symbol map to handle both file uploads and manual aliases in one list

Proposed HTML changes:
html

<div class="symbol-map">
    <h2>Symbol Map</h2>
    <!-- Combined Upload Area -->
    <div class="upload-area">
        <label for="file-input" class="file-input-label">
            <span>Click to upload files</span>
            <input 
                type="file" 
                multiple 
                id="file-input" 
                class="file-input"
                @change="handleFiles"
            >
        </label>
        <p>or drag and drop files here</p>
    </div>
    <!-- Manual Alias Input -->
    <div class="manual-alias-input">
        <h3>Add Manual Alias</h3>
        <div class="input-group">
            <input x-model="newManualAlias" placeholder="Alias (e.g., SEPP)">
            <textarea x-model="newManualValue" placeholder="Value" rows="3"></textarea>
            <button @click="addManualAlias">Add Alias</button>
        </div>
    </div>
    <!-- Combined Alias List -->
    <div class="alias-list">
        <template x-if="Object.keys($store.aliases).length === 0">
            <div class="empty-state">No aliases assigned yet</div>
        </template>
        <template x-for="(content, alias) in $store.aliases" :key="alias">
            <div class="alias-item" :class="{ 'file-based': isFileAlias(content) }">
                <div x-show="editingAlias !== alias" class="alias-item-content">
                    <span class="alias-name" x-text="alias"></span>
                    <span class="alias-info" 
                          x-text="isFileAlias(content) ? getFileNameForContent(content) + ' (' + formatFileSize($store.files.find(f => f.content === content)?.size || 0) + ')' : 'Manual'"></span>
                    <div class="alias-actions">
                        <button x-show="!isFileAlias(content)" 
                                @click="startEditingAlias(alias, content)" 
                                class="edit-button">✎</button>
                        <button @click="deleteAlias(alias)" 
                                class="delete-button">×</button>
                    </div>
                </div>
                <!-- Edit mode remains same -->
            </div>
        </template>
    </div>
</div>

2. JavaScript Modifications (app.js)

    Remove file-specific methods that are now redundant
    Simplify state management
    Update initialization for drag-and-drop

Proposed JS changes:
javascript

Alpine.data('app', () => ({
    // Remove: selectedFile, showFilenameDialog, filename (if only saving workflows)
    // Keep most existing properties

    // Update handleFiles to work directly with symbol map
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

    // Update deleteAlias to handle file removal
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

    // Simplify init for new drag-and-drop target
    init() {
        const uploadArea = document.querySelector('.symbol-map .upload-area');
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
            this.handleFiles({ target: { files: e.dataTransfer.files } });
        });
    },

    // Remove: removeFile, assignAlias (functionality merged into handleFiles and deleteAlias)
}));

// Keep the effect for raw prompt watching as is

3. CSS Modifications (styles.css)

    Add styling for file-based vs manual aliases
    Adjust symbol map layout

Proposed CSS changes:
css

.symbol-map .upload-area {
    margin-bottom: 1.5rem;
}

.alias-item.file-based {
    background: #f8f9fa;
}

.alias-item:not(.file-based) {
    background: #fff;
}

.alias-info {
    margin: 0 1rem;
    color: #666;
    font-size: 0.9rem;
}

/* Dark mode adjustments */
[data-theme="dark"] .alias-item.file-based {
    background: #363636;
}

4. Data Model Adjustments

    Files and aliases remain in separate stores but are presented together
    No need for separate file selection state
    Maintain backward compatibility with existing workflow saves

Implementation Steps

    Backup Current Version
        Create a branch for this refactor
        Save current working version
    Update HTML
        Remove file-picker section
        Add upload area to symbol-map
        Modify alias list template
    Update JavaScript
        Refactor file handling logic
        Update initialization
        Remove redundant methods
    Update CSS
        Add new classes
        Test responsiveness
    Testing
        Test file uploads
        Test manual alias creation
        Test editing/deleting both types
        Test workflow save/load
        Test dark mode

Success Criteria

    Files can be uploaded directly in symbol map
    Clear visual distinction between file-based and manual aliases
    All existing functionality (editing, preview, etc.) remains intact
    No performance regression
    Responsive design maintained

This plan maintains the core functionality while simplifying the interface as requested. The combined symbol map will serve as the central hub for both file management and alias handling, reducing cognitive overhead for users.