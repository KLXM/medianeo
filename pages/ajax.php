<?php
// Path: redaxo/src/addons/medianeo/pages/ajax.php

// Ensure this is an AJAX request
if ('XMLHttpRequest' != rex_request::server('HTTP_X_REQUESTED_WITH', 'string', '')) {
    rex_response::setStatus(rex_response::HTTP_BAD_REQUEST);
    rex_response::sendJson(['error' => 'Only AJAX requests are allowed']);
    exit();
}

try {
    $handler = new rex_medianeo_handler();
    $handler->handleRequest();
    
} catch (Exception $e) {
    rex_response::setStatus(rex_response::HTTP_INTERNAL_ERROR);
    rex_response::sendJson([
        'error' => $e->getMessage(),
        'trace' => rex::isDebugMode() ? $e->getTraceAsString() : null
    ]);
}

exit();
