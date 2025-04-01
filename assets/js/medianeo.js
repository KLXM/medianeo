// Path: redaxo/src/addons/medianeo/assets/js/medianeo.js

/**
 * MediaNeo - Media Browser mit FilePond Integration
 * 
 * Diese Klasse übernimmt das Media-Browsing und übergibt
 * Upload-Funktionalität an FilePond.
 */
class MediaNeoPicker {
    constructor(input) {
        this.input = input;
        this.selectedMedia = new Map();
        this.currentCategory = 0;
        this.config = window.rex.medianeo || {};
        
        // FilePond sollte verfügbar sein, da es eine Voraussetzung ist
        if (typeof FilePond === 'undefined') {
            console.error('FilePond ist nicht verfügbar. MediaNeo benötigt FilePond für die Funktionalität.');
            return;
        }
        
        this.init();
    }

    init() {
        // DOM-Elemente erstellen
        this.createElements();
        
        // Sortable initialisieren für Drag & Drop
        if (typeof Sortable !== 'undefined') {
            this.initSortable();
        }
        
        // Anfangswerte laden
        this.loadInitialValues();
        
        // Event-Listener für externe Trigger hinzufügen
        this.input.addEventListener('medianeo:open', () => this.openPicker());
    }

    createElements() {
        // Container für Vorschau erstellen
        this.container = document.createElement('div');
        this.container.className = 'medianeo-container';

        // Liste für Vorschau erstellen
        this.previewList = document.createElement('div');
        this.previewList.className = 'medianeo-preview-list';
        this.container.appendChild(this.previewList);

        // Button zum Hinzufügen erstellen
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'btn btn-default medianeo-add-button';
        addButton.innerHTML = '<i class="rex-icon fa-plus"></i> Medium hinzufügen';
        addButton.addEventListener('click', () => this.openPicker());
        this.container.appendChild(addButton);

        // Container nach dem Input einfügen
        this.input.parentNode.insertBefore(this.container, this.input.nextSibling);
        
        // Modal erstellen, falls nicht vorhanden
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
            <div class="modal-dialog medianeo-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                        <h4 class="modal-title">Medien auswählen</h4>
                    </div>
                    <div class="modal-body">
                        <div class="medianeo-content">
                            <div class="medianeo-categories-container">
                                <div class="panel panel-default">
                                    <div class="panel-heading">Kategorien</div>
                                    <div class="panel-body medianeo-categories"></div>
                                </div>
                            </div>
                            <div class="medianeo-files-container">
                                <div class="medianeo-breadcrumb"></div>
                                <div class="medianeo-search-container">
                                    <div class="input-group">
                                        <span class="input-group-addon"><i class="rex-icon fa-search"></i></span>
                                        <input type="text" class="form-control medianeo-search" placeholder="Suchen...">
                                    </div>
                                </div>
                                <div class="medianeo-upload-container">
                                    <div class="panel panel-default">
                                        <div class="panel-heading">Upload</div>
                                        <div class="panel-body">
                                            <input type="file" class="medianeo-filepond" multiple>
                                        </div>
                                    </div>
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
        
        // Referenzen auf wichtige Elemente speichern
        this.modal = $(modal);
        this.filesContainer = modal.querySelector('.medianeo-files');
        this.categoriesContainer = modal.querySelector('.medianeo-categories');
        this.searchInput = modal.querySelector('.medianeo-search');
        this.breadcrumbContainer = modal.querySelector('.medianeo-breadcrumb');
        this.filepondInput = modal.querySelector('.medianeo-filepond');
        
        // Speichere Referenz im Modal für die filepond-Integration
        modal.querySelector('.modal-content').mediaNeoPicker = this;
        
        // Modal-Events binden
        this.modal.on('shown.bs.modal', () => {
            this.loadCategory(0);
            
            // FilePond initialisieren
            if (window.initMediaNeoFilepond) {
                console.log('Initializing FilePond in modal');
                window.initMediaNeoFilepond('.medianeo-filepond');
            }
        });

        this.modal.on('hidden.bs.modal', () => {
            this.selectedMedia.clear();
        });

        modal.querySelector('.medianeo-apply').addEventListener('click', () => {
            this.applySelection();
            this.modal.modal('hide');
        });

        // Suchfeld binden
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
            const mediaIds = value.split(',').filter(id => id.trim() !== '');
            mediaIds.forEach(id => this.loadMediaPreview(id));
        }
    }

    async loadCategory(categoryId) {
        this.currentCategory = categoryId;
        try {
            const url = this.buildUrl('get_category', { category_id: categoryId });
            const response = await fetch(url);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Unknown error occurred');
            }
            
            const data = result.data;
            
            this.renderBreadcrumb(data.breadcrumb);
            this.renderCategories(data.categories);
            this.renderFiles(data.files);
            
            // Vorhandene Auswahl wiederherstellen
            this.restoreSelectionAfterReload();
            
            // FilePond über Kategoriewechsel informieren
            if (this.filepondInput && this.filepondInput.pond) {
                console.log('Updating FilePond category to', this.currentCategory);
                
                // Setze FilePond Server-Options
                this.filepondInput.pond.setOptions({
                    server: {
                        url: this.config.filepond_api_url,
                        process: {
                            method: 'POST',
                            headers: {
                                'X-Requested-With': 'XMLHttpRequest'
                            },
                            withCredentials: false,
                            ondata: (formData) => {
                                formData.append('func', 'upload');
                                formData.append('category_id', this.currentCategory);
                                formData.append('_csrf_token', this.config.csrf_token);
                                return formData;
                            }
                        }
                    }
                });
            }
            
        } catch (error) {
            console.error('Error loading category:', error);
            this.showError(error.message || 'Fehler beim Laden der Kategorie');
        }
    }
    
    // Hilft dabei, die Auswahl nach dem Neuladen der Kategorie wiederherzustellen
    restoreSelectionAfterReload() {
        if (this.selectedMedia.size === 0) return;
        
        // Gehe durch die Datei-Elemente und markiere diejenigen, die bereits ausgewählt waren
        this.filesContainer.querySelectorAll('.medianeo-file').forEach(file => {
            const fileId = parseInt(file.dataset.id);
            if (this.selectedMedia.has(fileId)) {
                file.classList.add('selected');
            }
        });
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
        
        // Click-Events binden
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
        
        // Kategorie-Klicks binden
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
            this.filesContainer.innerHTML = '<div class="medianeo-no-files">Keine Dateien in dieser Kategorie</div>';
            return;
        }
        
        this.filesContainer.innerHTML = `
            <div class="medianeo-file-grid">
                ${files.map(file => `
                    <div class="medianeo-file ${this.selectedMedia.has(parseInt(file.id)) ? 'selected' : ''}" 
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
        
        // Datei-Auswahl binden
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
        
        console.log('Selected media:', Array.from(this.selectedMedia.keys()));
    }
    
    // Datei direkt zur Auswahl hinzufügen (nach Upload mit FilePond)
    addToSelection(fileId) {
        if (!isNaN(fileId) && fileId > 0) {
            this.selectedMedia.set(fileId, true);
            
            // Datei-Element im DOM finden und optisch markieren
            const fileElement = this.filesContainer.querySelector(`.medianeo-file[data-id="${fileId}"]`);
            if (fileElement) {
                fileElement.classList.add('selected');
            }
            
            console.log('Added to selection:', fileId);
            console.log('Selected media:', Array.from(this.selectedMedia.keys()));
        }
    }

    applySelection() {
        // Vorhandene Medien-IDs abrufen
        const existingIds = new Set(
            Array.from(this.previewList.children).map(item => parseInt(item.dataset.mediaId))
        );
        
        // Nur neu ausgewählte Medien hinzufügen
        this.selectedMedia.forEach((value, mediaId) => {
            if (!existingIds.has(mediaId)) {
                this.loadMediaPreview(mediaId);
            }
        });
        
        // Auswahl löschen
        this.selectedMedia.clear();
    }

    updateValue() {
        const mediaIds = Array.from(this.previewList.children).map(item => item.dataset.mediaId);
        this.input.value = mediaIds.join(',');
        
        // Change-Event auslösen
        const event = new Event('change', { bubbles: true });
        this.input.dispatchEvent(event);
    }

    openPicker() {
        // Auswahl zurücksetzen
        this.selectedMedia.clear();
        
        // Modal anzeigen
        this.modal.modal('show');
    }

    buildUrl(action, params = {}) {
        // Simple index.php für Backend
        const urlParams = {
            'rex-api-call': 'medianeo',
            func: action,
            _csrf_token: this.config.csrf_token,
            ...params
        };
        
        // In Query-String umwandeln
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

// Beim Laden initialisieren
$(document).on('rex:ready', function() {
    initMediaNeoFields();
});

// Alle MediaNeo-Felder initialisieren
function initMediaNeoFields() {
    console.log('Initializing MediaNeo fields');
    // Alle Input-Felder mit Klasse "medianeo" finden
    document.querySelectorAll('input.medianeo').forEach(input => {
        // Nur initialisieren, wenn noch nicht initialisiert
        if (!input.dataset.medianeoInitialized) {
            new MediaNeoPicker(input);
            input.dataset.medianeoInitialized = 'true';
        }
    });
}

// Funktion global verfügbar machen
window.initMediaNeoFields = initMediaNeoFields;