<?php
// Path: redaxo/src/addons/medianeo/boot.php

// Autoload the API class
rex_autoload::addDirectory(rex_path::addon('medianeo', 'lib'));

if (rex::isBackend() && rex::getUser()) {
    // Add Sortable.js
    rex_view::addJsFile('https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js');
    
    // Add MediaNeo assets
    rex_view::addCssFile($this->getAssetsUrl('css/medianeo.css'));
    rex_view::addJsFile($this->getAssetsUrl('js/medianeo.js'));
    
    // Add custom data for JavaScript
    rex_view::setJsProperty('medianeo', [
        'csrf_token' => rex_csrf_token::factory('medianeo')->getValue()
    ]);
    
    // Register media manager type
    rex_medianeo_handler::registerMediaManagerType();
}
