// Path: redaxo/src/addons/medianeo/assets/js/filepond-integration.js

/**
 * MediaNeo FilePond Integration
 * 
 * This script enhances the integration between MediaNeo and FilePond.
 */
(function() {
    // Check if FilePond is available
    if (typeof FilePond === 'undefined') {
        console.error('FilePond is not available. MediaNeo requires FilePond for file upload functionality.');
        return;
    }
    
    // Configuration
    const config = window.rex.medianeo || {};
    
    // Register FilePond plugins if available
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
    
    // Configure FilePond defaults when used within MediaNeo
    FilePond.setOptions({
        // Localize FilePond labels based on REDAXO language
        labelIdle: config.lang === 'de_de' ? 
            'Dateien hierher ziehen oder <span class="filepond--label-action">durchsuchen</span>' : 
            'Drag & Drop your files or <span class="filepond--label-action">Browse</span>',
        labelFileTypeNotAllowed: config.lang === 'de_de' ? 
            'Dateityp nicht erlaubt' : 
            'File type not allowed',
        labelFileProcessing: config.lang === 'de_de' ? 
            'Wird hochgeladen' : 
            'Uploading',
        labelFileProcessingComplete: config.lang === 'de_de' ? 
            'Upload abgeschlossen' : 
            'Upload complete',
        labelFileProcessingError: config.lang === 'de_de' ? 
            'Fehler beim Upload' : 
            'Error during upload',
        labelButtonRemoveItem: config.lang === 'de_de' ? 
            'Entfernen' : 
            'Remove',
        labelButtonAbortItemLoad: config.lang === 'de_de' ? 
            'Abbrechen' : 
            'Abort',
        labelButtonRetryItemLoad: config.lang === 'de_de' ? 
            'Wiederholen' : 
            'Retry',
        labelButtonProceed: config.lang === 'de_de' ? 
            'Fortfahren' : 
            'Proceed',

        // Styling
        stylePanelLayout: 'compact',
        styleLoadIndicatorPosition: 'center bottom',
        styleProgressIndicatorPosition: 'right bottom',
        styleButtonRemoveItemPosition: 'right top',
        styleButtonProcessItemPosition: 'right bottom',
        
        // Credits
        credits: false,
        
        // Other defaults
        allowMultiple: true,
        allowReorder: true
    });

    // Track active FilePond instances
    const filepondInstances = new Map();

    // Enhanced initialization function for FilePond within MediaNeo
    window.initMediaNeoFilepond = function(selector = '.medianeo-filepond', options = {}) {
        document.querySelectorAll(selector).forEach(function(input) {
            // Get parent MediaNeo instance if available
            const modalContent = input.closest('.modal-content');
            const mediaNeoPicker = modalContent ? modalContent.mediaNeoPicker : null;
            
            // Destroy existing instance if there is one
            if (filepondInstances.has(input)) {
                console.log('Destroying existing FilePond instance');
                const oldInstance = filepondInstances.get(input);
                oldInstance.destroy();
                filepondInstances.delete(input);
                // Reset the input field
                input.value = '';
            }
            
            // Default options
            const defaultOptions = {
                allowMultiple: true,
                allowReorder: true,
                server: {
                    url: config.filepond_api_url,
                    process: {
                        method: 'POST',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        withCredentials: false,
                        ondata: (formData) => {
                            formData.append('func', 'upload');
                            formData.append('category_id', mediaNeoPicker?.currentCategory || 0);
                            formData.append('_csrf_token', config.csrf_token);
                            return formData;
                        }
                    }
                },
                onprocessfile: (error, file) => {
                    if (!error && mediaNeoPicker) {
                        // Speichere Kategorie
                        const currentCategory = mediaNeoPicker.currentCategory;
                        
                        // Wenn Server-Antwort vorhanden, Datei zur Auswahl hinzufügen
                        if (file.serverId) {
                            console.log('File uploaded successfully, ID:', file.serverId);
                            
                            // Warte kurz, bis die Datei im System verfügbar ist
                            setTimeout(() => {
                                // Reload current category after successful upload
                                mediaNeoPicker.loadCategory(currentCategory);
                                
                                // Versuche die Datei zu finden und zu selektieren
                                setTimeout(() => {
                                    const fileId = parseInt(file.serverId);
                                    if (!isNaN(fileId)) {
                                        const fileElement = mediaNeoPicker.filesContainer.querySelector(`.medianeo-file[data-id="${fileId}"]`);
                                        if (fileElement) {
                                            fileElement.classList.add('selected');
                                            mediaNeoPicker.toggleFileSelection(fileId);
                                        }
                                    }
                                }, 300);
                            }, 500);
                        } else {
                            // Fallback: Einfach nur Kategorie neu laden
                            mediaNeoPicker.loadCategory(currentCategory);
                        }
                    }

                    // Remove file from FilePond after processing is complete
                    if (input.pond) {
                        // We must wait a bit to avoid issues with FilePond's internal state
                        setTimeout(() => {
                            // Only remove successfully processed files
                            if (!error) {
                                input.pond.removeFile(file.id);
                            }
                        }, 1000);
                    }
                }
            };
            
            // Merge with custom options
            const mergedOptions = Object.assign({}, defaultOptions, options);
            
            try {
                // Create FilePond instance
                const pond = FilePond.create(input, mergedOptions);
                
                // Store FilePond instance in map for tracking
                filepondInstances.set(input, pond);
                
                // Store reference to FilePond instance on the input
                input.pond = pond;
                
                // Store reference to FilePond instance in MediaNeo if available
                if (mediaNeoPicker) {
                    mediaNeoPicker.filepondInstance = pond;
                }
                
                // Add instance to parent modal for easier access
                if (modalContent) {
                    modalContent.filepondInstance = pond;
                }
                
                console.log('FilePond initialized for', input);
            } catch (e) {
                console.error('Error initializing FilePond:', e);
            }
        });
    };

    // Handle modal events to properly manage FilePond instances
    $(document).on('shown.bs.modal', '#medianeo-modal', function(e) {
        console.log('Modal shown, initializing FilePond');
        // Wait a short time to ensure the DOM is ready
        setTimeout(() => {
            initMediaNeoFilepond('.medianeo-filepond');
        }, 100);
    });
    
    // Cleanup FilePond when the modal is closed
    $(document).on('hidden.bs.modal', '#medianeo-modal', function(e) {
        console.log('Modal hidden, cleaning up FilePond');
        const filepondInputs = e.target.querySelectorAll('.medianeo-filepond');
        filepondInputs.forEach(input => {
            if (filepondInstances.has(input)) {
                const pond = filepondInstances.get(input);
                // Clear all files but don't destroy the instance yet
                pond.removeFiles();
            }
        });
    });
    
    // Reinitialize FilePond when the page is refreshed
    $(document).on('rex:ready', function() {
        // Initialize any visible FilePond elements
        initMediaNeoFilepond();
    });
})();