<?php
// Path: redaxo/src/addons/medianeo/boot.php

if (rex::isBackend() && rex::getUser()) {
    // Add Bootstrap CSS if not already included

        rex_view::addCssFile('https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css');
        rex_view::addJsFile('https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js');

    
    // Add Sortable.js
    rex_view::addJsFile('https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js');
    
    // Add MediaNeo assets
    rex_view::addCssFile($this->getAssetsUrl('css/medianeo.css'));
    rex_view::addJsFile($this->getAssetsUrl('js/medianeo.js'));
    
    // Add initialization
    rex_view::addJsFile($this->getAssetsUrl('js/init.js'));
    
    // Add custom data for JavaScript
    rex_view::setJsProperty('medianeo', [
        'ajax_url' => rex_url::backendController(['page' => 'medianeo/ajax']),
        'csrf_token' => rex_csrf_token::factory('medianeo')->getValue(),
        'i18n' => [
            'select_media' => rex_i18n::msg('medianeo_select_media', ''),
            'apply' => rex_i18n::msg('medianeo_apply', 'Übernehmen'),
            'cancel' => rex_i18n::msg('medianeo_cancel', 'Abbrechen'),
            'no_media_found' => rex_i18n::msg('medianeo_no_media_found', 'Keine Medien gefunden'),
            'loading' => rex_i18n::msg('medianeo_loading', 'Laden...')
        ]
    ]);
}
