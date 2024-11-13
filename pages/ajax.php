<?php
// Path: redaxo/src/addons/medianeo/pages/ajax.php

$handler = new rex_medianeo_handler();

try {
    $handler->handleRequest();
} catch(Exception $e) {
    rex_response::sendJson([
        'error' => $e->getMessage()
    ]);
}
