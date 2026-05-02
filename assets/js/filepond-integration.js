(function () {
    'use strict';

    if (typeof FilePond === 'undefined') {
        return;
    }

    var config = (window.rex && window.rex.medianeo) ? window.rex.medianeo : {};
    var fallbackInstances = new Map();
    var originalWidgetWatchers = new Map();

    function parseAllowedTypes(raw) {
        return String(raw || '')
            .split(',')
            .map(function (entry) { return entry.trim(); })
            .filter(function (entry) { return entry !== ''; });
    }

    function parseJsonSafely(value) {
        if (!value || typeof value !== 'string') {
            return null;
        }
        try {
            return JSON.parse(value);
        } catch (_error) {
            return null;
        }
    }

    function localizedLabel(fallbackDe, fallbackEn) {
        if (config.lang === 'de_de') {
            return fallbackDe;
        }
        return fallbackEn;
    }

    function clearOriginalWatcher(input) {
        if (!originalWidgetWatchers.has(input)) {
            return;
        }

        var watcher = originalWidgetWatchers.get(input);
        if (watcher.intervalId) {
            clearInterval(watcher.intervalId);
        }
        originalWidgetWatchers.delete(input);
    }

    function clearFallbackInstance(input) {
        if (!fallbackInstances.has(input)) {
            return;
        }

        var instance = fallbackInstances.get(input);
        if (instance && instance.destroy) {
            instance.destroy();
        }
        fallbackInstances.delete(input);
        input.pond = null;
        input.value = '';
    }

    function applyOriginalWidgetAttributes(input, mediaNeoPicker) {
        var allowedTypes = parseAllowedTypes((mediaNeoPicker && mediaNeoPicker.allowedTypes)
            ? mediaNeoPicker.allowedTypes.join(',')
            : config.allowed_types);

        input.setAttribute('data-widget', 'filepond');
        input.setAttribute('data-filepond-lang', config.lang || 'de_de');
        input.setAttribute('data-filepond-types', allowedTypes.length ? allowedTypes.join(',') : 'image/*');
        input.setAttribute('data-filepond-maxsize', String(Number(config.max_filesize) > 0 ? Number(config.max_filesize) : 200));
        input.setAttribute('data-filepond-maxfiles', String(Number(config.max_files) > 0 ? Number(config.max_files) : 30));
        input.setAttribute('data-filepond-chunk-enabled', (config.enable_chunks === true || config.enable_chunks === '1' || config.enable_chunks === '|1|') ? 'true' : 'false');
        input.setAttribute('data-filepond-chunk-size', String(Number(config.chunk_size) > 0 ? Number(config.chunk_size) : 5));
        input.setAttribute('data-filepond-cat', String(mediaNeoPicker ? mediaNeoPicker.currentCategory : 0));
        input.setAttribute('data-filepond-skip-meta', 'true');
        input.setAttribute('data-filepond-title-required', 'false');
        input.value = '';
    }

    function bootOriginalWidget(input, mediaNeoPicker) {
        if (typeof window.initFilePond !== 'function') {
            return input;
        }

        var uploadContainer = input.closest('.medianeo-upload-container');
        if (uploadContainer) {
            uploadContainer.querySelectorAll('.filepond--root').forEach(function (root) {
                root.remove();
            });
        }

        var replacement = input.cloneNode(false);
        input.parentNode.replaceChild(replacement, input);
        input = replacement;

        applyOriginalWidgetAttributes(input, mediaNeoPicker);
        window.initFilePond();

        var seenValues = new Set();
        var lastValue = '';
        var intervalId = setInterval(function () {
            var currentValue = String(input.value || '').trim();
            if (!currentValue || currentValue === lastValue) {
                return;
            }

            lastValue = currentValue;
            currentValue.split(',').map(function (item) {
                return item.trim();
            }).filter(function (item) {
                return item !== '';
            }).forEach(function (filename) {
                if (seenValues.has(filename)) {
                    return;
                }
                seenValues.add(filename);
                if (mediaNeoPicker) {
                    mediaNeoPicker.handleUploadResult(filename);
                }
            });
        }, 250);

        originalWidgetWatchers.set(input, {
            intervalId: intervalId,
        });

        return input;
    }

    if (FilePond.registerPlugin) {
        if (typeof FilePondPluginFileValidateType !== 'undefined') {
            FilePond.registerPlugin(FilePondPluginFileValidateType);
        }
        if (typeof FilePondPluginFileValidateSize !== 'undefined') {
            FilePond.registerPlugin(FilePondPluginFileValidateSize);
        }
        if (typeof FilePondPluginImagePreview !== 'undefined') {
            FilePond.registerPlugin(FilePondPluginImagePreview);
        }
    }

    FilePond.setOptions({
        labelIdle: localizedLabel('Dateien hierher ziehen oder <span class="filepond--label-action">durchsuchen</span>', 'Drag & Drop your files or <span class="filepond--label-action">Browse</span>'),
        labelFileTypeNotAllowed: localizedLabel('Dateityp nicht erlaubt', 'File type not allowed'),
        labelFileProcessing: localizedLabel('Wird hochgeladen', 'Uploading'),
        labelFileProcessingComplete: localizedLabel('Upload abgeschlossen', 'Upload complete'),
        labelFileProcessingError: localizedLabel('Fehler beim Upload', 'Upload error'),
        labelButtonRemoveItem: localizedLabel('Entfernen', 'Remove'),
        credits: false,
        stylePanelLayout: 'compact',
        allowReorder: true,
    });

    window.initMediaNeoFilepond = function (input, mediaNeoPicker) {
        if (!input) {
            return null;
        }

        clearOriginalWatcher(input);
        clearFallbackInstance(input);

        if (typeof window.initFilePond === 'function') {
            var widgetInput = bootOriginalWidget(input, mediaNeoPicker);
            if (mediaNeoPicker) {
                mediaNeoPicker.filepondInput = widgetInput;
            }
            return null;
        }

        var allowedTypes = parseAllowedTypes((mediaNeoPicker && mediaNeoPicker.allowedTypes) ? mediaNeoPicker.allowedTypes.join(',') : config.allowed_types);

        var processOptions = {
            url: config.filepond_api_url,
            method: 'POST',
            withCredentials: false,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
            ondata: function (formData) {
                formData.append('func', 'upload');
                formData.append('fieldName', input.name || 'filepond');
                formData.append('category_id', mediaNeoPicker ? mediaNeoPicker.currentCategory : 0);
                formData.append('_csrf_token', config.csrf_token || '');
                return formData;
            },
            onload: function (responseText) {
                var parsed = parseJsonSafely(responseText);
                if (parsed && parsed.filename) {
                    return parsed.filename;
                }
                return responseText;
            },
            onerror: function (responseText) {
                var parsed = parseJsonSafely(responseText);
                if (parsed && parsed.error) {
                    return parsed.error;
                }
                return responseText;
            },
        };

        var options = {
            allowMultiple: true,
            allowReorder: true,
            maxFiles: Number(config.max_files) > 0 ? Number(config.max_files) : null,
            maxFileSize: Number(config.max_filesize) > 0 ? String(config.max_filesize) + 'MB' : null,
            acceptedFileTypes: allowedTypes.length ? allowedTypes : null,
            chunkUploads: config.enable_chunks === true || config.enable_chunks === '1' || config.enable_chunks === '|1|',
            chunkSize: Number(config.chunk_size) > 0 ? Number(config.chunk_size) * 1024 * 1024 : 5 * 1024 * 1024,
            server: {
                process: processOptions,
            },
            onprocessfile: function (error, file) {
                if (!error && mediaNeoPicker) {
                    mediaNeoPicker.handleUploadResult(file.serverId || file.filename || '');
                }

                if (!error && input.pond) {
                    setTimeout(function () {
                        if (input.pond) {
                            input.pond.removeFile(file.id);
                        }
                    }, 600);
                }
            },
        };

        var pond = FilePond.create(input, options);
        fallbackInstances.set(input, pond);
        input.pond = pond;
        return pond;
    };

    if (typeof jQuery !== 'undefined') {
        jQuery(document).on('hidden.bs.modal', '#medianeo-modal', function (event) {
            var inputs = event.target.querySelectorAll('.medianeo-filepond');
            inputs.forEach(function (input) {
                clearOriginalWatcher(input);
                clearFallbackInstance(input);
            });
        });
    }
})();
