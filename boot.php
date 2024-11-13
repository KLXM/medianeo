<?php
// Path: redaxo/src/addons/medianeo/boot.php

if (rex::isBackend() && rex::getUser()) {
    // Add Sortable.js
    rex_view::addJsFile('https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js');
    
    // Add MediaNeo assets
    rex_view::addCssFile($this->getAssetsUrl('css/medianeo.css'));
    rex_view::addJsFile($this->getAssetsUrl('js/medianeo.js'));

    // Check if filepond_uploader is available
    $hasFilepond = rex_addon::get('filepond_uploader')->isAvailable();
    
    // Add custom data for JavaScript
    rex_view::setJsProperty('medianeo', [
        'csrf_token' => rex_csrf_token::factory('medianeo')->getValue(),
        'has_filepond' => $hasFilepond,
        'filepond_api_url' => $hasFilepond ? rex_url::backendController(['rex-api-call' => 'filepond_uploader']) : null
    ]);
}
