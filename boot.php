<?php
// Path: redaxo/src/addons/medianeo/boot.php

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
    
    // Register Extension Point für die Page
    rex_extension::register('PAGES_PREPARED', function (rex_extension_point $ep) {
        $page = $ep->getSubject();
        
        // Registriere die Ajax-Seite
        $ajaxPage = new rex_be_page('ajax', rex_i18n::msg('medianeo_ajax'));
        $ajaxPage->setPath($this->getPath('pages/ajax.php'));
        $ajaxPage->setHidden(true);
        
        // Füge die Ajax-Seite als Subpage hinzu
        if (isset($page['medianeo'])) {
            $page['medianeo']->addSubpage($ajaxPage);
        }
        
        return $page;
    });
    
}
