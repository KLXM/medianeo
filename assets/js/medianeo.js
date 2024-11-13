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
        
        // Bind events
        this.bindEvents();
    }

    createElements() {
        // Create preview container
        this.container = document.createElement('div');
        this.container.className = 'medianeo-container';

        // Create preview list
        this.previewList = document.createElement('div');
        this.previewList.className = 'medianeo-preview-list';
        this.container.appendChild(this.previewList);

        // Insert container after input
        this.input.parentNode.insertBefore(this.container, this.input.nextSibling);
        
        // Create offcanvas if it doesn't exist
        if (!document.querySelector('.medianeo-offcanvas')) {
            this.createOffcanvas();
        }
    }

    createOffcanvas() {
        const offcanvas = document.createElement('div');
        offcanvas.className = 'medianeo-offcanvas offcanvas offcanvas-end';
        offcanvas.innerHTML = `
            <div class="offcanvas-header">
                <nav class="medianeo-breadcrumb"></nav>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
            </div>
            <div class="offcanvas-body">
                <div class="row">
                    <div class="col-md-4">
                        <div class="medianeo-categories"></div>
                    </div>
                    <div class="col-md-8">
                        <div class="medianeo-search mb-3">
                            <input type="text" class="form-control" placeholder="Suchen...">
                        </div>
                        <div class="medianeo-files"></div>
                    </div>
                </div>
            </div>
            <div class="offcanvas-footer">
                <div class="btn-toolbar justify-content-end">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="offcanvas">Abbrechen</button>
                    <button type="button" class="btn btn-primary medianeo-apply">Übernehmen</button>
                </div>
            </div>
        `;
        document.body.appendChild(offcanvas);
        
        // Initialize Bootstrap Offcanvas
        this.offcanvas = new bootstrap.Offcanvas(offcanvas);
        
        // Store references to important elements
        this.filesContainer = offcanvas.querySelector('.medianeo-files');
        this.categoriesContainer = offcanvas.querySelector('.medianeo-categories');
        this.searchInput = offcanvas.querySelector('.medianeo-search input');
        this.breadcrumbContainer = offcanvas.querySelector('.medianeo-breadcrumb');
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

    bindEvents() {
        // Bind search input
        if (this.searchInput) {
            this.searchInput.addEventListener('input', debounce(() => {
                this.performSearch(this.searchInput.value);
            }, 300));
        }

        // Bind category clicks
        if (this.categoriesContainer) {
            this.categoriesContainer.addEventListener('click', (e) => {
                const category = e.target.closest('.medianeo-category');
                if (category) {
                    this.loadCategory(category.dataset.id);
                }
            });
        }

        // Bind apply button
        const applyBtn = document.querySelector('.medianeo-apply');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applySelection();
                this.offcanvas.hide();
            });
        }

        // Handle custom open event
        this.input.addEventListener('medianeo:open', () => {
            this.openPicker();
        });

        // Create and bind add button
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'btn btn-primary medianeo-add';
        addButton.innerHTML = '<i class="rex-icon fa-plus"></i> Medium hinzufügen';
        addButton.addEventListener('click', () => this.openPicker());
        this.container.appendChild(addButton);
    }

    async loadCategory(categoryId) {
        this.currentCategory = categoryId;
        try {
            const response = await fetch(this.buildUrl('get_category', { category_id: categoryId }));
            const data = await response.json();
            
            this.renderBreadcrumb(data.breadcrumb);
            this.renderCategories(data.categories);
            this.renderFiles(data.files);
            
        } catch (error) {
            console.error('Error loading category:', error);
            this.showError('Fehler beim Laden der Kategorie');
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
            const data = await response.json();
            
            this.renderFiles(data.files);
            
        } catch (error) {
            console.error('Error searching:', error);
            this.showError('Fehler bei der Suche');
        }
    }

    async loadMediaPreview(mediaId) {
        try {
            const response = await fetch(this.buildUrl('get_media', { media_id: mediaId }));
            const media = await response.json();
            
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
                <button type="button" class="medianeo-remove">
                    <i class="rex-icon fa-times"></i>
                </button>
            </div>
        `;

        // Bind remove button
        previewItem.querySelector('.medianeo-remove').addEventListener('click', () => {
            previewItem.remove();
            this.updateValue();
        });

        this.previewList.appendChild(previewItem);
        this.updateValue();
    }

    getPreviewHtml(media) {
        if (media.isImage) {
            return `<img src="${media.preview_url || this.getMediaUrl(media.filename)}" alt="${media.title || media.filename}">`;
        }
        
        const icon = this.getFileIcon(media.extension);
        return `<i class="rex-icon ${icon}"></i>`;
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
        
        this.breadcrumbContainer.innerHTML = breadcrumb.map((item, index) => `
            <span class="medianeo-breadcrumb-item ${index === breadcrumb.length - 1 ? 'active' : ''}" 
                  data-id="${item.id}">
                ${index > 0 ? '<i class="rex-icon fa-angle-right"></i>' : ''}
                ${item.name}
            </span>
        `).join('');
        
        // Bind click events
        this.breadcrumbContainer.querySelectorAll('.medianeo-breadcrumb-item').forEach(item => {
            item.addEventListener('click', () => {
                if (!item.classList.contains('active')) {
                    this.loadCategory(item.dataset.id);
                }
            });
        });
    }

    renderCategories(categories) {
        if (!categories || !this.categoriesContainer) return;
        
        this.categoriesContainer.innerHTML = `
            <ul class="medianeo-category-list">
                ${categories.map(cat => `
                    <li class="medianeo-category" data-id="${cat.id}">
                        <i class="rex-icon fa-folder"></i>
                        ${cat.name}
                    </li>
                `).join('')}
            </ul>
        `;
    }

    renderFiles(files) {
        if (!files || !this.filesContainer) return;
        
        if (files.length === 0) {
            this.filesContainer.innerHTML = '<div class="medianeo-no-files">Keine Dateien gefunden</div>';
            return;
        }
        
        this.filesContainer.innerHTML = `
            <div class="medianeo-file-grid">
                ${files.map(file => `
                    <div class="medianeo-file" data-id="${file.id}">
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
                this.toggleFileSelection(file.dataset.id);
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
        
        // Load root category
        this.loadCategory(0);
        
        // Show offcanvas
        this.offcanvas.show();
    }

    buildUrl(action, params = {}) {
        const url = new URL(this.config.ajax_url, window.location.origin);
        url.searchParams.set('func', action);
        url.searchParams.set('_csrf_token', this.config.csrf_token);
        
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
        
        return url.toString();
    }

    getMediaUrl(filename) {
        return `index.php?rex_media_type=rex_mediapool_detail&rex_media_file=${filename}`;
    }

    showError(message) {
        if (typeof rex !== 'undefined' && rex.showErrorNotice) {
            rex.showErrorNotice(message);
        } else {
            alert(message);
        }
    }
}

// Helper function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
