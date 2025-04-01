<?php
// Path: redaxo/src/addons/medianeo/boot.php

// MediaNeo benötigt filepond_uploader
if (!rex_addon::get('filepond_uploader')->isAvailable()) {
    rex_view::addErrorMessage('Das AddOn "filepond_uploader" wird für MediaNeo benötigt. Bitte installieren Sie es zuerst.');
    return;
}

if (rex::isBackend() && rex::getUser()) {
    // FilePond sollte bereits geladen sein durch filepond_uploader
    filepond_helper::getStyles();
    filepond_helper::getScripts();
    
    // Add Sortable.js
    rex_view::addJsFile('https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js');
    
    // Add MediaNeo assets
    rex_view::addCssFile($this->getAssetsUrl('css/medianeo.css'));
    rex_view::addJsFile($this->getAssetsUrl('js/medianeo.js'));
    rex_view::addJsFile($this->getAssetsUrl('js/filepond-integration.js'));
    
    // Add init.js for REDAXO widgets integration
    rex_view::addJsFile($this->getAssetsUrl('js/init.js'));
    
    // Add custom data for JavaScript
    rex_view::setJsProperty('medianeo', [
        'csrf_token' => rex_csrf_token::factory('medianeo')->getValue(),
        'filepond_api_url' => rex_url::backendController(['rex-api-call' => 'filepond_uploader']),
        'lang' => rex_i18n::getLanguage(),
        'media_url' => rex_url::media(''),
        'media_manager_url' => rex_url::backendController(['rex_media_type' => 'rex_media_small', 'rex_media_file' => '']),
        'allowed_types' => $this->getConfig('allowed_types', ''),
        'preview_size' => $this->getConfig('preview_size', 150)
    ]);
    
    // Set session token for filepond
    rex_set_session('filepond_token', rex_config::get('filepond_uploader', 'api_token', ''));
    
    // Add YForm extension to support medianeo field type
    if (rex_addon::get('yform')->isAvailable()) {
        rex_yform::addTemplatePath($this->getPath('ytemplates'));
        
        // Register medianeo as YForm value field type
        if (class_exists('rex_yform_manager_dataset')) {
            rex_extension::register('YFORM_MANAGER_DATA_PAGE_HEADER', function (rex_extension_point $ep) {
                if ($ep->getParam('table') && $ep->getParam('table')->isValid()) {
                    $subject = $ep->getSubject();
                    $subject .= '<script>
                        $(document).on("rex:ready", function() {
                            initMediaNeoFields();
                        });
                    </script>';
                    $ep->setSubject($subject);
                }
            });
        }
    }
}