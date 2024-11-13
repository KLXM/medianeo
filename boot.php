<?php
// Path: redaxo/src/addons/medianeo/boot.php

if (rex::isBackend() && rex::getUser()) {
    // Add assets only when needed
    if (rex_be_controller::getCurrentPage() == 'mediapool' || 
        rex_be_controller::getCurrentPage() == 'medianeo') {
        
        rex_view::addCssFile($this->getAssetsUrl('css/medianeo.css'));
        
        // Add dependencies
        rex_view::addJsFile('https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js');
        
        // Add main script
        rex_view::addJsFile($this->getAssetsUrl('js/medianeo.js'));
    }
}

// Register extension point for custom mediapool buttons
rex_extension::register('MEDIA_LIST_FUNCTIONS', function (rex_extension_point $ep) {
    $params = $ep->getParams();
    $subject = $ep->getSubject();
    
    // Add MediaNeo button if field has medianeo class
    if (rex_request('opener_input_field', 'string') != '') {
        $subject .= '<a class="btn btn-xs btn-select medianeo-select" href="#">MediaNeo</a>';
    }
    
    return $subject;
});
