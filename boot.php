<?php
// Path: redaxo/src/addons/medianeo/boot.php

// MediaNeo benötigt filepond_uploader
if (!rex_addon::get('filepond_uploader')->isAvailable()) {
    echo rex_view::error('Das AddOn "filepond_uploader" wird für MediaNeo benötigt. Bitte installieren Sie es zuerst.');
    return;
}

if (rex::isBackend() && rex::getUser()) {
    $assetVersion = '?v=' . rawurlencode((string) $this->getVersion());

    // FilePond sollte bereits geladen sein durch filepond_uploader
    filepond_helper::getStyles();
    filepond_helper::getScripts();
    
    // Add Sortable.js
    rex_view::addJsFile('https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js');
    
    // Add MediaNeo assets
    rex_view::addCssFile($this->getAssetsUrl('css/medianeo.css') . $assetVersion);
    rex_view::addJsFile($this->getAssetsUrl('js/medianeo.js') . $assetVersion);
    rex_view::addJsFile($this->getAssetsUrl('js/filepond-integration.js') . $assetVersion);
    
    // Add init.js for REDAXO widgets integration
    rex_view::addJsFile($this->getAssetsUrl('js/init.js') . $assetVersion);
    
    // Add custom data for JavaScript
    rex_view::setJsProperty('medianeo', [
        'csrf_token' => rex_csrf_token::factory('medianeo')->getValue(),
        'api_url' => rex_url::backendController(['rex-api-call' => 'medianeo']),
        'filepond_api_url' => rex_url::backendController(['rex-api-call' => 'filepond_uploader']),
        'lang' => rex_i18n::getLanguage(),
        'media_url' => rex_url::media(''),
        'media_manager_url' => rex_url::backendController(['rex_media_type' => 'rex_media_small', 'rex_media_file' => '']),
        'allowed_types' => $this->getConfig('allowed_types', ''),
        'preview_size' => $this->getConfig('preview_size', 150),
        'max_filesize' => (int) rex_config::get('filepond_uploader', 'max_filesize', 200),
        'max_files' => (int) rex_config::get('filepond_uploader', 'max_files', 30),
        'enable_chunks' => rex_config::get('filepond_uploader', 'enable_chunks', false),
        'chunk_size' => (int) rex_config::get('filepond_uploader', 'chunk_size', 5),
        'translations' => [
            'add' => (string) $this->i18n('medianeo_media_add'),
            'select' => (string) $this->i18n('medianeo_select_media'),
            'categories' => (string) $this->i18n('medianeo_categories'),
            'root' => (string) $this->i18n('medianeo_root_category'),
            'search' => (string) $this->i18n('medianeo_search'),
            'upload' => (string) $this->i18n('medianeo_upload'),
            'cancel' => (string) $this->i18n('medianeo_cancel'),
            'apply' => (string) $this->i18n('medianeo_apply'),
            'no_categories' => (string) $this->i18n('medianeo_no_categories'),
            'no_files' => (string) $this->i18n('medianeo_no_files'),
            'selection' => (string) $this->i18n('medianeo_selection_count'),
            'clear_selection' => (string) $this->i18n('medianeo_clear_selection'),
            'category_filter' => (string) $this->i18n('medianeo_category_filter'),
        ],
    ]);
    
    // Set session token for filepond
    rex_set_session('filepond_token', rex_config::get('filepond_uploader', 'api_token', ''));
    
    // Demo page interactions
    rex_view::addJsFile($this->getAssetsUrl('js/demo.js') . $assetVersion);

    // Add YForm extension to support medianeo field type
    if (rex_addon::get('yform')->isAvailable()) {
        rex_yform::addTemplatePath($this->getPath('ytemplates'));
    }
}