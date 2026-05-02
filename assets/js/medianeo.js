(function () {
    'use strict';

    function parseBool(value, fallbackValue) {
        if (value === undefined || value === null || value === '') {
            return fallbackValue;
        }
        return value === true || value === 'true' || value === '1' || value === 1;
    }

    function parseIntSafe(value, fallbackValue) {
        var parsed = parseInt(value, 10);
        return Number.isNaN(parsed) ? fallbackValue : parsed;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function extractExtension(filename) {
        if (!filename || filename.indexOf('.') === -1) {
            return '';
        }
        return filename.split('.').pop().toLowerCase();
    }

    function mimePatternMatches(pattern, file) {
        if (!pattern) {
            return true;
        }

        var normalized = pattern.trim().toLowerCase();
        if (!normalized) {
            return true;
        }

        var extension = (file.extension || extractExtension(file.filename)).toLowerCase();
        var isImage = !!file.isImage;

        if (normalized.indexOf('/') === -1) {
            return extension === normalized.replace(/^\./, '');
        }

        if (normalized === 'image/*') {
            return isImage;
        }
        if (normalized === 'video/*') {
            return ['mp4', 'mov', 'avi', 'mpeg', 'mpg', 'webm'].indexOf(extension) !== -1;
        }
        if (normalized === 'audio/*') {
            return ['mp3', 'wav', 'ogg', 'aac', 'm4a'].indexOf(extension) !== -1;
        }
        if (normalized === 'application/pdf') {
            return extension === 'pdf';
        }
        if (normalized === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return extension === 'docx';
        }
        if (normalized === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            return extension === 'xlsx';
        }
        if (normalized === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
            return extension === 'pptx';
        }

        return extension === normalized.replace(/^.*\//, '');
    }

    function translations(config) {
        return (config && config.translations) ? config.translations : {};
    }

    function t(config, key, fallback) {
        var tr = translations(config);
        return tr[key] || fallback;
    }

    class MediaNeoPicker {
        constructor(input) {
            this.input = input;
            this.config = (window.rex && window.rex.medianeo) ? window.rex.medianeo : {};

            this.multiple = parseBool(input.dataset.medianeoMultiple, true);
            this.maxFiles = parseIntSafe(input.dataset.medianeoMaxfiles || this.config.max_files, this.multiple ? 30 : 1);
            this.startCategory = parseIntSafe(input.dataset.medianeoCategory, 0);
            this.allowedTypes = String(input.dataset.medianeoTypes || this.config.allowed_types || '')
                .split(',')
                .map(function (item) { return item.trim(); })
                .filter(function (item) { return item !== ''; });

            this.currentCategory = this.startCategory;
            this.selectedMedia = new Map();
            this.pendingSelectionFilename = '';
            this.categorySearchTerm = '';
            this.categoryCache = {
                _root: [],
            };
            this.filepondAvailable = typeof FilePond !== 'undefined';
            this.isReady = false;

            if (typeof this.createElements !== 'function' || typeof this.bindEvents !== 'function') {
                this.showError('MediaNeo konnte nicht initialisiert werden (JS-Cache/Version). Bitte Seite neu laden.');
                return;
            }

            this.init();

            if (!this.filepondAvailable && !MediaNeoPicker.filePondWarningShown) {
                this.showError('FilePond ist nicht verfuegbar. Upload ist deaktiviert, Auswahl aus dem Mediapool funktioniert weiterhin.');
                MediaNeoPicker.filePondWarningShown = true;
            }
        }

        init() {
            this.createElements();
            this.initSortablePreview();
            this.bindEvents();
            this.loadInitialValues();
            this.isReady = true;
        }

        initSortablePreview() {
            if (typeof Sortable === 'undefined' || !this.previewList) {
                return;
            }

            if (this.sortablePreview) {
                this.sortablePreview.destroy();
            }

            this.sortablePreview = Sortable.create(this.previewList, {
                animation: 150,
                ghostClass: 'medianeo-preview-item-ghost',
                chosenClass: 'medianeo-preview-item-chosen',
                dragClass: 'medianeo-preview-item-drag',
                onEnd: this.updateValue.bind(this),
            });
        }

        createElements() {
            this.container = document.createElement('div');
            this.container.className = 'medianeo-container';

            this.previewList = document.createElement('div');
            this.previewList.className = 'medianeo-preview-list';
            this.container.appendChild(this.previewList);

            var controls = document.createElement('div');
            controls.className = 'medianeo-controls';
            controls.innerHTML =
                '<button type="button" class="btn btn-default medianeo-add-button">'
                + '<i class="rex-icon fa-plus"></i> ' + escapeHtml(t(this.config, 'add', 'Medium hinzufuegen'))
                + '</button>';
            this.container.appendChild(controls);

            this.input.parentNode.insertBefore(this.container, this.input.nextSibling);

            if (!document.querySelector('#medianeo-modal')) {
                this.createModal();
            }

            this.modalElement = document.querySelector('#medianeo-modal');
            this.modal = window.jQuery(this.modalElement);
            this.filesContainer = this.modalElement.querySelector('.medianeo-files');
            this.categoriesContainer = this.modalElement.querySelector('.medianeo-categories');
            this.categoryFilterInput = this.modalElement.querySelector('.medianeo-category-filter');
            this.searchInput = this.modalElement.querySelector('.medianeo-search');
            this.breadcrumbContainer = this.modalElement.querySelector('.medianeo-breadcrumb');
            this.filepondInput = this.modalElement.querySelector('.medianeo-filepond');
            this.selectionCounter = this.modalElement.querySelector('.medianeo-selection-counter');
            this.applyButton = this.modalElement.querySelector('.medianeo-apply');
        }

        createModal() {
            var modal = document.createElement('div');
            modal.id = 'medianeo-modal';
            modal.className = 'modal fade';
            modal.setAttribute('tabindex', '-1');
            modal.setAttribute('role', 'dialog');

            modal.innerHTML =
                '<div class="modal-dialog medianeo-dialog" role="document">'
                + '  <div class="modal-content">'
                + '    <div class="modal-header">'
                + '      <button type="button" class="close" data-dismiss="modal" aria-label="Close">'
                + '        <span aria-hidden="true">&times;</span>'
                + '      </button>'
                + '      <h4 class="modal-title">' + escapeHtml(t(this.config, 'select', 'Medien auswaehlen')) + '</h4>'
                + '    </div>'
                + '    <div class="modal-body">'
                + '      <div class="medianeo-content">'
                + '        <aside class="medianeo-categories-container">'
                + '          <div class="medianeo-categories-head">'
                + '            <strong>' + escapeHtml(t(this.config, 'categories', 'Kategorien')) + '</strong>'
                + '            <input type="text" class="form-control input-sm medianeo-category-filter" placeholder="' + escapeHtml(t(this.config, 'category_filter', 'Kategorien filtern')) + '">'
                + '          </div>'
                + '          <div class="medianeo-categories"></div>'
                + '        </aside>'
                + '        <section class="medianeo-files-container">'
                + '          <div class="medianeo-breadcrumb"></div>'
                + '          <div class="medianeo-toolbar">'
                + '            <div class="input-group">'
                + '              <span class="input-group-addon"><i class="rex-icon fa-search"></i></span>'
                + '              <input type="text" class="form-control medianeo-search" placeholder="' + escapeHtml(t(this.config, 'search', 'Suchen...')) + '">'
                + '            </div>'
                + '          </div>'
                + '          <div class="medianeo-upload-container">'
                + '            <label class="medianeo-upload-title">' + escapeHtml(t(this.config, 'upload', 'Upload')) + '</label>'
                + '            <input type="text" class="medianeo-filepond" value="">'
                + '          </div>'
                + '          <div class="medianeo-files"></div>'
                + '        </section>'
                + '      </div>'
                + '    </div>'
                + '    <div class="modal-footer">'
                + '      <span class="medianeo-selection-counter"></span>'
                + '      <button type="button" class="btn btn-default medianeo-clear-selection">' + escapeHtml(t(this.config, 'clear_selection', 'Auswahl leeren')) + '</button>'
                + '      <button type="button" class="btn btn-default" data-dismiss="modal">' + escapeHtml(t(this.config, 'cancel', 'Abbrechen')) + '</button>'
                + '      <button type="button" class="btn btn-primary medianeo-apply">' + escapeHtml(t(this.config, 'apply', 'Uebernehmen')) + '</button>'
                + '    </div>'
                + '  </div>'
                + '</div>';

            document.body.appendChild(modal);
        }

        bindEvents() {
            var self = this;

            this.container.querySelector('.medianeo-add-button').addEventListener('click', function () {
                self.openPicker();
            });

            this.input.addEventListener('medianeo:open', function () {
                self.openPicker();
            });

            if (!MediaNeoPicker.modalEventsBound) {
                var debouncedSearch = this.debounce(function () {
                    var activeSearchPicker = MediaNeoPicker.activePicker;
                    if (!activeSearchPicker) {
                        return;
                    }
                    activeSearchPicker.performSearch(activeSearchPicker.searchInput.value);
                }, 250);

                this.modal.on('shown.bs.modal', function () {
                    var activeShownPicker = MediaNeoPicker.activePicker;
                    if (!activeShownPicker) {
                        return;
                    }

                    activeShownPicker.searchInput.value = '';
                    activeShownPicker.categoryFilterInput.value = '';
                    activeShownPicker.loadCategory(activeShownPicker.startCategory);
                    if (window.initMediaNeoFilepond && activeShownPicker.filepondAvailable) {
                        window.initMediaNeoFilepond(activeShownPicker.filepondInput, activeShownPicker);
                    }
                });

                this.modalElement.querySelector('.medianeo-apply').addEventListener('click', function () {
                    var activeApplyPicker = MediaNeoPicker.activePicker;
                    if (!activeApplyPicker) {
                        return;
                    }
                    activeApplyPicker.applySelection();
                });

                this.modalElement.querySelector('.medianeo-clear-selection').addEventListener('click', function () {
                    var activeClearPicker = MediaNeoPicker.activePicker;
                    if (!activeClearPicker) {
                        return;
                    }

                    activeClearPicker.selectedMedia.clear();
                    activeClearPicker.renderSelectionState();
                    activeClearPicker.filesContainer.querySelectorAll('.medianeo-file.selected').forEach(function (el) {
                        el.classList.remove('selected');
                    });
                });

                this.searchInput.addEventListener('input', debouncedSearch);

                this.categoryFilterInput.addEventListener('input', function () {
                    var activeCategoryPicker = MediaNeoPicker.activePicker;
                    if (!activeCategoryPicker) {
                        return;
                    }
                    activeCategoryPicker.filterCategories(activeCategoryPicker.categoryFilterInput.value);
                });

                this.categoriesContainer.addEventListener('click', function (event) {
                    var activeCategoryPicker = MediaNeoPicker.activePicker;
                    if (!activeCategoryPicker) {
                        return;
                    }

                    var toggle = event.target.closest('[data-toggle-cat]');
                    if (toggle) {
                        event.preventDefault();
                        activeCategoryPicker.toggleCategoryNode(parseIntSafe(toggle.dataset.toggleCat, 0));
                        return;
                    }

                    var link = event.target.closest('.medianeo-category-link[data-id]');
                    if (link) {
                        event.preventDefault();
                        activeCategoryPicker.loadCategory(parseIntSafe(link.dataset.id, 0));
                    }
                });

                MediaNeoPicker.modalEventsBound = true;
            }
        }

        loadInitialValues() {
            var value = String(this.input.value || '').trim();
            if (!value) {
                this.updateValue();
                return;
            }

            var ids = value.split(',').map(function (id) { return id.trim(); }).filter(Boolean);
            for (var i = 0; i < ids.length; i += 1) {
                this.loadMediaPreview(ids[i]);
            }
        }

        async loadMediaPreview(mediaId) {
            try {
                var response = await fetch(this.buildUrl('get_media', { media_id: mediaId }), { credentials: 'same-origin' });
                var result = await response.json();
                if (!result.success || !result.data) {
                    return;
                }
                this.addPreviewItem(result.data);
            } catch (error) {
                console.error(error);
            }
        }

        async loadCategory(categoryId) {
            this.currentCategory = categoryId;

            try {
                var response = await fetch(this.buildUrl('get_category', { category_id: categoryId }), { credentials: 'same-origin' });
                var result = await response.json();
                if (!result.success) {
                    throw new Error(result.error || 'Failed to load category.');
                }

                this.renderBreadcrumb(result.data.breadcrumb || []);
                await this.syncCategoryTree(result.data.breadcrumb || [], result.data.categories || []);
                this.renderCategories();
                this.renderFiles(result.data.files || []);
                this.renderSelectionState();
            } catch (error) {
                console.error(error);
                this.showError(error.message || 'Category loading failed.');
            }
        }

        normalizeCategory(category, parentId) {
            var id = parseIntSafe(category.id, 0);
            var existing = this.categoryCache[id] || {};

            return Object.assign({}, existing, {
                id: id,
                name: String(category.name || ('Kategorie ' + id)),
                parent_id: parentId,
                hasChildren: !!category.hasChildren,
                open: existing.open === true,
                childrenLoaded: existing.childrenLoaded === true,
                children: Array.isArray(existing.children) ? existing.children : [],
            });
        }

        cacheCategoryChildren(parentId, categories) {
            var normalized = [];
            for (var i = 0; i < categories.length; i += 1) {
                var cat = this.normalizeCategory(categories[i], parentId);
                this.categoryCache[cat.id] = cat;
                normalized.push(cat);
            }

            if (parentId === 0) {
                this.categoryCache._root = normalized;
            } else {
                var parent = this.categoryCache[parentId] || { id: parentId, name: 'Kategorie ' + parentId };
                parent.children = normalized;
                parent.childrenLoaded = true;
                parent.open = parent.open !== false;
                this.categoryCache[parentId] = parent;
            }
        }

        async ensureCategoryChildren(parentId, preloadedChildren) {
            if (Array.isArray(preloadedChildren)) {
                this.cacheCategoryChildren(parentId, preloadedChildren);
                return;
            }

            if (parentId === 0 && this.categoryCache._root.length) {
                return;
            }

            if (parentId > 0 && this.categoryCache[parentId] && this.categoryCache[parentId].childrenLoaded) {
                return;
            }

            var response = await fetch(this.buildUrl('get_category', { category_id: parentId }), { credentials: 'same-origin' });
            var result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to load categories.');
            }

            this.cacheCategoryChildren(parentId, result.data.categories || []);
        }

        async syncCategoryTree(breadcrumb, currentChildren) {
            await this.ensureCategoryChildren(0, this.currentCategory === 0 ? currentChildren : null);

            var idsInPath = (breadcrumb || [])
                .map(function (item) { return parseIntSafe(item.id, 0); })
                .filter(function (id) { return id > 0; });

            for (var i = 0; i < idsInPath.length; i += 1) {
                var pathId = idsInPath[i];
                if (!this.categoryCache[pathId]) {
                    this.categoryCache[pathId] = {
                        id: pathId,
                        name: 'Kategorie ' + pathId,
                        parent_id: 0,
                        hasChildren: true,
                        open: false,
                        childrenLoaded: false,
                        children: [],
                    };
                }
                this.categoryCache[pathId].open = true;
                await this.ensureCategoryChildren(pathId);
            }

            if (this.currentCategory > 0 && Array.isArray(currentChildren)) {
                await this.ensureCategoryChildren(this.currentCategory, currentChildren);
            }
        }

        async performSearch(term) {
            if (!term || term.length < 2) {
                this.loadCategory(this.currentCategory);
                return;
            }

            try {
                var response = await fetch(this.buildUrl('search', {
                    q: term,
                    category_id: this.currentCategory,
                }), { credentials: 'same-origin' });
                var result = await response.json();
                if (!result.success) {
                    throw new Error(result.error || 'Search failed.');
                }
                this.renderFiles(result.data.files || []);
                this.renderSelectionState();
            } catch (error) {
                console.error(error);
                this.showError('Search failed.');
            }
        }

        renderBreadcrumb(items) {
            if (!items.length) {
                this.breadcrumbContainer.innerHTML = '';
                return;
            }

            var html = '<ol class="breadcrumb">';
            for (var i = 0; i < items.length; i += 1) {
                var item = items[i];
                var isLast = i === items.length - 1;
                html += '<li class="' + (isLast ? 'active' : '') + '">';
                if (isLast) {
                    html += escapeHtml(item.name);
                } else {
                    html += '<a href="#" data-id="' + item.id + '">' + escapeHtml(item.name) + '</a>';
                }
                html += '</li>';
            }
            html += '</ol>';
            this.breadcrumbContainer.innerHTML = html;

            var self = this;
            this.breadcrumbContainer.querySelectorAll('a[data-id]').forEach(function (link) {
                link.addEventListener('click', function (event) {
                    event.preventDefault();
                    self.loadCategory(parseIntSafe(link.dataset.id, 0));
                });
            });
        }

        renderCategories() {
            var rootCategories = this.categoryCache._root || [];
            var needle = this.categorySearchTerm;

            var html = '<div class="medianeo-cat-tree">';
            html += '<div class="medianeo-cat-header">';
            html += '<a href="#" class="medianeo-category-link medianeo-cat-home ' + (this.currentCategory === 0 ? 'active' : '') + '" data-id="0">'
                + '<i class="rex-icon fa-home"></i> '
                + escapeHtml(t(this.config, 'root', 'Hauptkategorie'))
                + '</a>';
            html += '</div>';

            html += this.renderCategoryChildren(rootCategories, 0, needle);
            html += '</div>';

            if (!rootCategories.length) {
                this.categoriesContainer.innerHTML = '<div class="alert alert-info">' + escapeHtml(t(this.config, 'no_categories', 'Keine Kategorien vorhanden')) + '</div>';
                return;
            }

            if (needle && html.indexOf('medianeo-cat-node') === -1) {
                this.categoriesContainer.innerHTML = '<div class="medianeo-cat-search-empty">Keine Kategorien gefunden</div>';
                return;
            }

            this.categoriesContainer.innerHTML = html;
        }

        renderCategoryChildren(categories, depth, needle) {
            if (!categories || !categories.length) {
                return '';
            }

            var html = '<div class="medianeo-cat-children" data-depth="' + depth + '">';
            for (var i = 0; i < categories.length; i += 1) {
                var category = categories[i];
                var id = parseIntSafe(category.id, 0);
                var name = String(category.name || ('Kategorie ' + id));
                var lowerName = name.toLowerCase();
                var hasKids = !!category.hasChildren;
                var expanded = category.open === true;
                var childHtml = '';

                if ((expanded || needle) && category.childrenLoaded && Array.isArray(category.children)) {
                    childHtml = this.renderCategoryChildren(category.children, depth + 1, needle);
                }

                if (needle && lowerName.indexOf(needle) === -1 && !childHtml) {
                    continue;
                }

                var padding = ((depth + 1) * 14) + 8;
                html += '<div class="medianeo-cat-node" data-cat-id="' + id + '">';
                html += '<div class="medianeo-cat-row">';
                html += '<a href="#" class="medianeo-category-link ' + (this.currentCategory === id ? 'active' : '') + '" data-id="' + id + '" data-name="' + escapeHtml(lowerName) + '" style="padding-left:' + padding + 'px">';

                if (hasKids) {
                    html += '<i class="rex-icon ' + ((expanded || !!needle && !!childHtml) ? 'fa-chevron-down' : 'fa-chevron-right') + ' medianeo-cat-toggle" data-toggle-cat="' + id + '"></i>';
                } else {
                    html += '<i class="rex-icon fa-folder-o medianeo-cat-folder-icon"></i>';
                }

                html += '<span class="medianeo-cat-label">' + escapeHtml(name) + '</span>';
                html += '</a>';
                html += '</div>';

                if ((expanded || !!needle && !!childHtml) && childHtml) {
                    html += childHtml;
                }

                html += '</div>';
            }

            html += '</div>';
            return html;
        }

        filterCategories(query) {
            this.categorySearchTerm = String(query || '').toLowerCase().trim();
            this.renderCategories();
        }

        async toggleCategoryNode(categoryId) {
            if (!categoryId || !this.categoryCache[categoryId]) {
                return;
            }

            var node = this.categoryCache[categoryId];
            if (!node.hasChildren) {
                return;
            }

            if (!node.childrenLoaded) {
                await this.ensureCategoryChildren(categoryId);
            }

            node.open = !node.open;
            this.renderCategories();
        }

        renderFiles(files) {
            var filtered = files.filter(this.isFileAllowed.bind(this));
            if (!filtered.length) {
                this.filesContainer.innerHTML = '<div class="medianeo-no-files">' + escapeHtml(t(this.config, 'no_files', 'Keine Dateien in dieser Kategorie')) + '</div>';
                return;
            }

            var html = '<div class="medianeo-file-grid">';
            for (var i = 0; i < filtered.length; i += 1) {
                var file = filtered[i];
                var selected = this.selectedMedia.has(file.id);
                var selectedByFilename = this.pendingSelectionFilename && this.pendingSelectionFilename === file.filename;
                if (selectedByFilename) {
                    this.selectedMedia.set(file.id, file);
                    this.pendingSelectionFilename = '';
                    selected = true;
                }

                html += '<article class="medianeo-file ' + (selected ? 'selected' : '') + '" data-id="' + file.id + '">'
                    + this.getPreviewHtml(file)
                    + '<div class="medianeo-file-info">'
                    + '<strong class="medianeo-file-name" title="' + escapeHtml(file.filename) + '">' + escapeHtml(file.filename) + '</strong>'
                    + (file.title ? '<span class="medianeo-file-title" title="' + escapeHtml(file.title) + '">' + escapeHtml(file.title) + '</span>' : '')
                    + '</div>'
                    + '</article>';
            }
            html += '</div>';
            this.filesContainer.innerHTML = html;

            var self = this;
            this.filesContainer.querySelectorAll('.medianeo-file').forEach(function (item) {
                item.addEventListener('click', function () {
                    self.toggleFileSelection(parseIntSafe(item.dataset.id, 0), item);
                });
            });
        }

        isFileAllowed(file) {
            if (!this.allowedTypes.length) {
                return true;
            }
            for (var i = 0; i < this.allowedTypes.length; i += 1) {
                if (mimePatternMatches(this.allowedTypes[i], file)) {
                    return true;
                }
            }
            return false;
        }

        getPreviewHtml(file) {
            if (file.isImage) {
                var imageUrl = 'index.php?rex_media_type=rex_media_small&rex_media_file=' + encodeURIComponent(file.filename);
                return '<img src="' + imageUrl + '" class="medianeo-preview" alt="' + escapeHtml(file.title || file.filename) + '">';
            }
            return '<div class="medianeo-preview medianeo-icon"><i class="rex-icon ' + this.getFileIcon(file.extension) + '"></i></div>';
        }

        getFileIcon(extension) {
            var icons = {
                pdf: 'fa-file-pdf-o',
                doc: 'fa-file-word-o',
                docx: 'fa-file-word-o',
                xls: 'fa-file-excel-o',
                xlsx: 'fa-file-excel-o',
                ppt: 'fa-file-powerpoint-o',
                pptx: 'fa-file-powerpoint-o',
                mp3: 'fa-file-audio-o',
                wav: 'fa-file-audio-o',
                mp4: 'fa-file-video-o',
                mov: 'fa-file-video-o',
                zip: 'fa-file-archive-o',
                rar: 'fa-file-archive-o',
            };
            return icons[String(extension || '').toLowerCase()] || 'fa-file-o';
        }

        toggleFileSelection(fileId, item) {
            if (!fileId) {
                return;
            }

            if (!this.multiple) {
                this.selectedMedia.clear();
                this.filesContainer.querySelectorAll('.medianeo-file.selected').forEach(function (el) {
                    el.classList.remove('selected');
                });
            }

            if (this.selectedMedia.has(fileId)) {
                this.selectedMedia.delete(fileId);
                item.classList.remove('selected');
            } else {
                if (this.maxFiles > 0 && this.selectedMedia.size >= this.maxFiles) {
                    this.showError('Maximale Anzahl erreicht (' + this.maxFiles + ').');
                    return;
                }
                this.selectedMedia.set(fileId, true);
                item.classList.add('selected');
            }

            this.renderSelectionState();
        }

        renderSelectionState() {
            var count = this.selectedMedia.size;
            if (this.selectionCounter) {
                this.selectionCounter.textContent = t(this.config, 'selection', 'Auswahl') + ': ' + count;
            }
            if (this.applyButton) {
                this.applyButton.disabled = count === 0;
            }
        }

        async applySelection() {
            var selectedIds = Array.from(this.selectedMedia.keys());
            if (!selectedIds.length) {
                return;
            }

            if (!this.multiple) {
                this.previewList.innerHTML = '';
            }

            var existingIds = new Set(Array.from(this.previewList.children).map(function (item) {
                return parseIntSafe(item.dataset.mediaId, 0);
            }));

            for (var i = 0; i < selectedIds.length; i += 1) {
                var mediaId = selectedIds[i];
                if (!existingIds.has(mediaId)) {
                    await this.loadMediaPreview(mediaId);
                }
            }

            this.selectedMedia.clear();
            this.renderSelectionState();
            this.modal.modal('hide');
        }

        addPreviewItem(media) {
            if (!this.multiple && this.previewList.children.length > 0) {
                this.previewList.innerHTML = '';
            }

            if (this.maxFiles > 0 && this.previewList.children.length >= this.maxFiles) {
                return;
            }

            var item = document.createElement('div');
            item.className = 'medianeo-preview-item';
            item.dataset.mediaId = media.id;
            item.innerHTML =
                this.getPreviewHtml(media)
                + '<div class="medianeo-preview-info">'
                + '<span class="medianeo-preview-title" title="' + escapeHtml(media.title || media.filename) + '">' + escapeHtml(media.title || media.filename) + '</span>'
                + '<button type="button" class="medianeo-remove" aria-label="Remove"><i class="rex-icon fa-times"></i></button>'
                + '</div>';

            var self = this;
            item.querySelector('.medianeo-remove').addEventListener('click', function () {
                item.remove();
                self.updateValue();
            });

            this.previewList.appendChild(item);
            this.updateValue();
        }

        updateValue() {
            var values = Array.from(this.previewList.children).map(function (item) {
                return item.dataset.mediaId;
            });
            this.input.value = values.join(',');
            this.input.dispatchEvent(new Event('change', { bubbles: true }));
        }

        openPicker() {
            MediaNeoPicker.activePicker = this;
            this.selectedMedia.clear();
            this.renderSelectionState();
            this.modal.modal('show');
        }

        handleUploadResult(serverId) {
            this.pendingSelectionFilename = this.extractUploadedFilename(serverId);
            this.loadCategory(this.currentCategory);
        }

        extractUploadedFilename(serverId) {
            if (!serverId) {
                return '';
            }

            if (typeof serverId === 'object') {
                return String(serverId.filename || serverId.originalname || '');
            }

            var value = String(serverId).trim();
            if (!value) {
                return '';
            }

            if (value.charAt(0) === '{') {
                try {
                    var parsed = JSON.parse(value);
                    return String(parsed.filename || parsed.originalname || '');
                } catch (_error) {
                    return value;
                }
            }

            return value;
        }

        buildUrl(func, params) {
            var base = this.config.api_url || 'index.php';
            var query = Object.assign({
                'rex-api-call': 'medianeo',
                func: func,
                _csrf_token: this.config.csrf_token || '',
            }, params || {});

            var entries = Object.keys(query).map(function (key) {
                return encodeURIComponent(key) + '=' + encodeURIComponent(query[key]);
            });

            return base + (base.indexOf('?') === -1 ? '?' : '&') + entries.join('&');
        }

        showError(message) {
            if (window.rex && window.rex.showErrorNotice) {
                window.rex.showErrorNotice(message);
            } else {
                alert(message);
            }
        }

        debounce(fn, wait) {
            var timer = null;
            return function () {
                var args = arguments;
                clearTimeout(timer);
                timer = setTimeout(function () {
                    fn.apply(null, args);
                }, wait);
            };
        }
    }

    MediaNeoPicker.activePicker = null;
    MediaNeoPicker.modalEventsBound = false;
    MediaNeoPicker.filePondWarningShown = false;

    window.MediaNeoPicker = MediaNeoPicker;
})();
