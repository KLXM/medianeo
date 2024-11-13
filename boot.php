<?php
// Path: redaxo/src/addons/medianeo/boot.php

if (rex::isBackend() && rex::getUser()) {
    // Add assets
    rex_view::addJsFile('https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js');
    rex_view::addCssFile($this->getAssetsUrl('css/medianeo.css'));
    rex_view::addJsFile($this->getAssetsUrl('js/medianeo.js'));

    // Add custom initialization script
    rex_view::addJsFile($this->getAssetsUrl('js/init.js'));
    
    // Add custom data for JavaScript
    rex_view::setJsProperty('medianeo', [
        'ajax_url' => rex_url::backendController(['page' => 'medianeo/ajax']),
        'csrf_token' => rex_csrf_token::factory('medianeo')->getValue(),
        'media_manager_url' => rex_url::backendController(['page' => 'mediapool/medianeo']),
        'i18n' => [
            'select_media' => rex_i18n::msg('medianeo_select_media'),
            'apply' => rex_i18n::msg('medianeo_apply'),
            'cancel' => rex_i18n::msg('medianeo_cancel'),
            'no_media_found' => rex_i18n::msg('medianeo_no_media_found'),
            'loading' => rex_i18n::msg('medianeo_loading')
        ]
    ]);
}
