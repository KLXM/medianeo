// Path: assets/js/medianeo.js

class MediaNeoPicker {
    constructor() {
        this.selectedMedia = new Map();
        this.currentCategory = 0;
        this.init();
    }

    init() {
        // Initialize all input fields with medianeo class
        document.querySelectorAll('.medianeo').forEach(input => {
            this.initializeField(input);
        });

        // Create and append the off-canvas sidebar
        this.createSidebar();
        
        // Initialize event handlers
        this.initEventHandlers();
    }

    initializeField(input) {
        // Create preview container
        const previewContainer = document.createElement('div');
        previewContainer.className = 'medianeo-preview';
        previewContainer.setAttribute('data-field-id', input.id);

        // Create sortable preview list
        const previewList = document.createElement('div');
        previewList.className = 'medianeo-preview-list';
        previewContainer.appendChild(previewList);

        // Create add button
        const addButton = document.createElement('button');
        addButton.className = 'medianeo-add btn btn-primary';
        addButton.innerHTML = '<i class="fa fa-plus"></i> Medien hinzufügen';
        addButton.onclick = () => this.openPicker(input.id);
        previewContainer.appendChild(addButton);

        // Insert after input
        input.parentNode.insertBefore(previewContainer, input.nextSibling);

        // Initialize sortable
        new Sortable(previewList, {
            animation: 150,
            onEnd: (evt) => this.updateOrder(input.id)
        });

        // Load existing values
        if (input.value) {
            const values = input.value.split(',');
            values.forEach(mediaId => this.loadMediaPreview(mediaId, input.id));
        }
    }

    createSidebar() {
        const sidebar = document.createElement('div');
        sidebar.className = 'medianeo-sidebar offcanvas offcanvas-end';
        sidebar.innerHTML = `
            <div class="offcanvas-header">
                <h5>Medien auswählen</h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
            </div>
            <div class="offcanvas-body">
                <div class="medianeo-categories"></div>
                <div class="medianeo-files"></div>
            </div>
            <div class="offcanvas-footer">
                <button class="btn btn-primary medianeo-apply">Übernehmen</button>
            </div>
        `;
        document.body.appendChild(sidebar);
        this.sidebar = new bootstrap.Offcanvas(sidebar);
    }

    initEventHandlers() {
        // Apply button click
        document.querySelector('.medianeo-apply').addEventListener('click', () => {
            this.applySelection();
        });

        // Category click handling
        document.querySelector('.medianeo-categories').addEventListener('click', (e) => {
            if (e.target.matches('.medianeo-category')) {
                this.loadCategory(e.target.dataset.id);
            }
        });
    }

    openPicker(inputId) {
        this.currentInputId = inputId;
        this.loadCategory(0);
        this.sidebar.show();
    }

    async loadCategory(categoryId) {
        this.currentCategory = categoryId;
        try {
            const response = await fetch(`index.php?page=mediapool/medianeo&func=get_category&category_id=${categoryId}`);
            const data = await response.json();
            
            // Update categories
            const categoriesHtml = this.renderCategories(data.categories);
            document.querySelector('.medianeo-categories').innerHTML = categoriesHtml;
            
            // Update files
            const filesHtml = this.renderFiles(data.files);
            document.querySelector('.medianeo-files').innerHTML = filesHtml;
            
        } catch (error) {
            console.error('Error loading category:', error);
        }
    }

    renderCategories(categories) {
        let html = '<ul class="medianeo-category-list">';
        categories.forEach(category => {
            html += `
                <li class="medianeo-category" data-id="${category.id}">
                    <i class="fa fa-folder"></i> ${category.name}
                </li>
            `;
        });
        html += '</ul>';
        return html;
    }

    renderFiles(files) {
        let html = '<div class="medianeo-file-grid">';
        files.forEach(file => {
            const isSelected = this.selectedMedia.has(file.id);
            html += `
                <div class="medianeo-file ${isSelected ? 'selected' : ''}" 
                     data-id="${file.id}" 
                     onclick="window.mediaPicker.toggleFileSelection(${file.id})">
                    ${this.getFilePreview(file)}
                    <div class="medianeo-file-info">
                        <span class="medianeo-file-name">${file.filename}</span>
                        <span class="medianeo-file-title">${file.title || ''}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    getFilePreview(file) {
        if (this.isImage(file.filename)) {
            return `<img src="index.php?rex_media_type=mediapool_preview&rex_media_file=${file.filename}" />`;
        }
        return `<i class="fa fa-file-o"></i>`;
    }

    isImage(filename) {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        const ext = filename.split('.').pop().toLowerCase();
        return imageExtensions.includes(ext);
    }

    toggleFileSelection(fileId) {
        const element = document.querySelector(`.medianeo-file[data-id="${fileId}"]`);
        if (this.selectedMedia.has(fileId)) {
            this.selectedMedia.delete(fileId);
            element.classList.remove('selected');
        } else {
            this.selectedMedia.set(fileId, true);
            element.classList.add('selected');
        }
    }

    async loadMediaPreview(mediaId, inputId) {
        try {
            const response = await fetch(`index.php?page=mediapool/medianeo&func=get_media&media_id=${mediaId}`);
            const media = await response.json();
            
            const previewElement = document.createElement('div');
            previewElement.className = 'medianeo-preview-item';
            previewElement.setAttribute('data-media-id', mediaId);
            previewElement.innerHTML = `
                ${this.getFilePreview(media)}
                <div class="medianeo-preview-info">
                    <span class="medianeo-preview-title">${media.title || media.filename}</span>
                    <button class="medianeo-remove" onclick="window.mediaPicker.removeMedia('${mediaId}', '${inputId}')">
                        <i class="fa fa-times"></i>
                    </button>
                </div>
            `;

            const previewList = document.querySelector(`.medianeo-preview[data-field-id="${inputId}"] .medianeo-preview-list`);
            previewList.appendChild(previewElement);
        } catch (error) {
            console.error('Error loading media preview:', error);
        }
    }

    removeMedia(mediaId, inputId) {
        const previewItem = document.querySelector(`.medianeo-preview[data-field-id="${inputId}"] .medianeo-preview-item[data-media-id="${mediaId}"]`);
        if (previewItem) {
            previewItem.remove();
            this.updateOrder(inputId);
        }
    }

    updateOrder(inputId) {
        const previewList = document.querySelector(`.medianeo-preview[data-field-id="${inputId}"] .medianeo-preview-list`);
        const mediaIds = Array.from(previewList.children).map(item => item.dataset.mediaId);
        const input = document.getElementById(inputId);
        input.value = mediaIds.join(',');
    }

    applySelection() {
        const mediaIds = Array.from(this.selectedMedia.keys());
        const input = document.getElementById(this.currentInputId);
        
        // Clear existing previews
        const previewList = document.querySelector(`.medianeo-preview[data-field-id="${this.currentInputId}"] .medianeo-preview-list`);
        previewList.innerHTML = '';

        // Load new previews
        mediaIds.forEach(mediaId => this.loadMediaPreview(mediaId, this.currentInputId));

        // Update input value
        this.updateOrder(this.currentInputId);

        // Close sidebar
        this.sidebar.hide();
        
        // Clear selection
        this.selectedMedia.clear();
    }
}

// Initialize on document ready
document.addEventListener('DOMContentLoaded', () => {
    window.mediaPicker = new MediaNeoPicker();
});
