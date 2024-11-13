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
        'csrf_token' => rex_csrf_token::factory('medianeo')->getValue(),
        'ajax_url' => rex_url::backendController(['page' => 'medianeo/ajax']), // Dies ist die korrekte AJAX-URL
        'media_url' => rex_url::backendController(['page' => 'mediapool/media'])
    ]);
}

// Register Extension Point für die Page
rex_extension::register('PAGES_PREPARED', function (rex_extension_point $ep) {
    $page = new rex_be_page('medianeo', 'MediaNeo');
    $page->setHidden(true);
    
    // Registriere die Ajax-Seite
    $ajaxPage = new rex_be_page('ajax', 'Ajax');
    $ajaxPage->setPath($this->getPath('pages/ajax.php'));
    $ajaxPage->setHidden(true);
    $page->addSubpage($ajaxPage);
    
    // Füge die Seite zu REDAXO hinzu
    $pages = $ep->getSubject();
    if (isset($pages['mediapool'])) {
        $pages['mediapool']->addSubpage($page);
    }
    
    return $pages;
});
