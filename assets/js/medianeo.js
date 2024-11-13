// Path: redaxo/src/addons/medianeo/assets/js/medianeo.js

class MediaNeoPicker {
    constructor(input) {
        this.input = input;
        this.selectedMedia = new Map();
        this.currentCategory = 0;
        this.config = window.rex.medianeo || {};
        
        this.init();
    }

    init() {
        // Create necessary DOM elements
        this.createElements();
        
        // Initialize sortable
        if (typeof Sortable !== 'undefined') {
            this.initSortable();
        }
        
        // Load initial values
        this.loadInitialValues();
    }

    createElements() {
        // Create preview container
        this.container = document.createElement('div');
        this.container.className = 'medianeo-container';

        // Create preview list
        this.previewList = document.createElement('div');
        this.previewList.className = 'medianeo-preview-list';
        this.container.appendChild(this.previewList);

        // Create add button
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'btn btn-default medianeo-add';
        addButton.innerHTML = '<i class="rex-icon fa-plus"></i> Medium hinzufügen';
        addButton.addEventListener('click', () => this.openPicker());
        this.container.appendChild(addButton);

        // Insert container after input
        this.input.parentNode.insertBefore(this.container, this.input.nextSibling);
        
        // Create modal if it doesn't exist
        if (!document.querySelector('#medianeo-modal')) {
            this.createModal();
        }
    }

    createModal() {
        const modal = document.createElement('div');
        modal.id = 'medianeo-modal';
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('role', 'dialog');
        
        modal.innerHTML = `
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                        <h4 class="modal-title">Medien auswählen</h4>
                        <nav class="medianeo-breadcrumb"></nav>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-4">
                                <div class="medianeo-categories panel panel-default">
                                    <div class="panel-heading">Kategorien</div>
                                    <div class="panel-body"></div>
                                </div>
                            </div>
                            <div class="col-md-8">
                                <div class="form-group">
                                    <input type="text" class="form-control medianeo-search" placeholder="Suchen...">
                                </div>
                                <div class="medianeo-files"></div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-default" data-dismiss="modal">Abbrechen</button>
                        <button type="button" class="btn btn-primary medianeo-apply">Übernehmen</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Store references to important elements
        this.modal = $(modal);
        this.filesContainer = modal.querySelector('.medianeo-files');
        this.categoriesContainer = modal.querySelector('.panel-body');
        this.searchInput = modal.querySelector('.medianeo-search');
        this.breadcrumbContainer = modal.querySelector('.medianeo-breadcrumb');

        // Bind modal events
        this.modal.on('shown.bs.modal', () => {
            this.loadCategory(0);
        });

        this.modal.on('hidden.bs.modal', () => {
            this.selectedMedia.clear();
        });

        modal.querySelector('.medianeo-apply').addEventListener('click', () => {
            this.applySelection();
            this.modal.modal('hide');
        });

        // Bind search input
        if (this.searchInput) {
            this.searchInput.addEventListener('input', this.debounce(() => {
                this.performSearch(this.searchInput.value);
            }, 300));
        }
    }

    initSortable() {
        new Sortable(this.previewList, {
            animation: 150,
            ghostClass: 'medianeo-ghost',
            onEnd: () => this.updateValue()
        });
    }

    loadInitialValues() {
        const value = this.input.value;
        if (value) {
            const mediaIds = value.split(',');
            mediaIds.forEach(id => this.loadMediaPreview(id));
        }
    }

    async loadCategory(categoryId) {
        this.currentCategory = categoryId;
        try {
            const url = this.buildUrl('get_category', { category_id: categoryId });
            const response = await fetch(url);
            const contentType = response.headers.get('content-type');
            
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Invalid response type:', contentType, 'Response:', text);
                throw new Error('Server returned invalid content type');
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Unknown error occurred');
            }
            
            const data = result.data;
            
            this.renderBreadcrumb(data.breadcrumb);
            this.renderCategories(data.categories);
            this.renderFiles(data.files);
            
        } catch (error) {
            console.error('Error loading category:', error);
            this.showError(error.message || 'Fehler beim Laden der Kategorie');
        }
    }

    async performSearch(term) {
        if (term.length < 2) {
            this.loadCategory(this.currentCategory);
            return;
        }

        try {
            const response = await fetch(this.buildUrl('search', { 
                q: term,
                category_id: this.currentCategory 
            }));
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Unknown error occurred');
            }
            
            this.renderFiles(result.data.files);
            
        } catch (error) {
            console.error('Error searching:', error);
            this.showError('Fehler bei der Suche');
        }
    }

    async loadMediaPreview(mediaId) {
        try {
            const response = await fetch(this.buildUrl('get_media', { media_id: mediaId }));
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Unknown error occurred');
            }
            
            const media = result.data;
            this.addPreviewItem(media);
            
        } catch (error) {
            console.error('Error loading media preview:', error);
        }
    }

    addPreviewItem(media) {
        const previewItem = document.createElement('div');
        previewItem.className = 'medianeo-preview-item';
        previewItem.dataset.mediaId = media.id;
        
        previewItem.innerHTML = `
            ${this.getPreviewHtml(media)}
            <div class="medianeo-preview-info">
                <span class="medianeo-preview-title">${media.title || media.filename}</span>
                <button type="button" class="medianeo-remove btn btn-xs btn-danger">
                    <i class="rex-icon fa-times"></i>
                </button>
            </div>
        `;

        previewItem.querySelector('.medianeo-remove').addEventListener('click', () => {
            previewItem.remove();
            this.updateValue();
        });

        this.previewList.appendChild(previewItem);
        this.updateValue();
    }

    getPreviewHtml(media) {
        if (media.isImage) {
            return `<img src="index.php?rex_media_type=rex_media_small&rex_media_file=${encodeURIComponent(media.filename)}" 
                        alt="${media.title || media.filename}" 
                        class="medianeo-preview">`;
        }
        
        const icon = this.getFileIcon(media.extension);
        return `<div class="medianeo-preview medianeo-icon"><i class="rex-icon ${icon}"></i></div>`;
    }

    getFileIcon(extension) {
        const icons = {
            pdf: 'fa-file-pdf-o',
            doc: 'fa-file-word-o',
            docx: 'fa-file-word-o',
            xls: 'fa-file-excel-o',
            xlsx: 'fa-file-excel-o',
            zip: 'fa-file-archive-o',
            rar: 'fa-file-archive-o',
            mp3: 'fa-file-audio-o',
            wav: 'fa-file-audio-o',
            mp4: 'fa-file-video-o',
            mov: 'fa-file-video-o',
            avi: 'fa-file-video-o'
        };
        
        return icons[extension] || 'fa-file-o';
    }

    renderBreadcrumb(breadcrumb) {
        if (!breadcrumb || !this.breadcrumbContainer) return;
        
        this.breadcrumbContainer.innerHTML = `
            <ol class="breadcrumb">
                ${breadcrumb.map((item, index) => `
                    <li class="${index === breadcrumb.length - 1 ? 'active' : ''}">
                        ${index === breadcrumb.length - 1 ? 
                            item.name : 
                            `<a href="#" data-id="${item.id}">${item.name}</a>`
                        }
                    </li>
                `).join('')}
            </ol>
        `;
        
        // Bind click events
        this.breadcrumbContainer.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadCategory(parseInt(link.dataset.id));
            });
        });
    }

    renderCategories(categories) {
        if (!categories || !this.categoriesContainer) return;
        
        if (categories.length === 0) {
            this.categoriesContainer.innerHTML = '<div class="alert alert-info">Keine Kategorien vorhanden</div>';
            return;
        }
        
        this.categoriesContainer.innerHTML = `
            <div class="list-group">
                ${categories.map(cat => `
                    <a href="#" class="list-group-item medianeo-category" data-id="${cat.id}">
                        <i class="rex-icon fa-folder-o"></i>
                        ${cat.name}
                    </a>
                `).join('')}
            </div>
        `;
        
        // Bind category clicks
        this.categoriesContainer.querySelectorAll('.medianeo-category').forEach(category => {
            category.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadCategory(parseInt(category.dataset.id));
            });
        });
    }

    renderFiles(files) {
        if (!files || !this.filesContainer) return;
        
        if (files.length === 0) {
            this.filesContainer.innerHTML = '<div class="alert alert-info">Keine Dateien in dieser Kategorie</div>';
            return;
        }
        
        this.filesContainer.innerHTML = `
            <div class="medianeo-file-grid">
                ${files.map(file => `
                    <div class="medianeo-file ${this.selectedMedia.has(file.id) ? 'selected' : ''}" 
                         data-id="${file.id}">
                        ${this.getPreviewHtml(file)}
                        <div class="medianeo-file-info">
                            <span class="medianeo-file-name">${file.filename}</span>
                            ${file.title ? `<span class="medianeo-file-title">${file.title}</span>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Bind file selection
        this.filesContainer.querySelectorAll('.medianeo-file').forEach(file => {
            file.addEventListener('click', () => {
                file.classList.toggle('selected');
                this.toggleFileSelection(parseInt(file.dataset.id));
            });
        });
    }

    toggleFileSelection(fileId) {
        if (this.selectedMedia.has(fileId)) {
            this.selectedMedia.delete(fileId);
        } else {
            this.selectedMedia.set(fileId, true);
        }
    }

    applySelection() {
        // Clear current preview
        this.previewList.innerHTML = '';
        
        // Load previews for selected media
        this.selectedMedia.forEach((value, mediaId) => {
            this.loadMediaPreview(mediaId);
        });
        
        // Clear selection
        this.selectedMedia.clear();
    }

    updateValue() {
        const mediaIds = Array.from(this.previewList.children).map(item => item.dataset.mediaId);
        this.input.value = mediaIds.join(',');
        
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        this.input.dispatchEvent(event);
    }

    openPicker() {
        // Reset selection
        this.selectedMedia.clear();
        
        // Show modal
        this.modal.modal('show');
    }

    buildUrl(action, params = {}) {
        // Use simple index.php for backend
        const urlParams = {
            'rex-api-call': 'medianeo',
            func: action,
            _csrf_token: this.config.csrf_token,
            ...params
        };
        
        // Convert to query string
        const queryString = Object.entries(urlParams)
            .map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(value))
            .join('&');
            
        return 'index.php?' + queryString;
    }

    showError(message) {
        if (typeof rex !== 'undefined' && rex.showErrorNotice) {
            rex.showErrorNotice(message);
        } else {
            alert(message);
        }
    }

    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
}

// Initialize on document ready
$(document).on('rex:ready', function() {
    document.querySelectorAll('input.medianeo').forEach(input => {
        if (!input.dataset.medianeoInitialized) {
            new MediaNeoPicker(input);
            input.dataset.medianeoInitialized = 'true';
        }
    });
});
