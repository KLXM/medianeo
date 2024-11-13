<?php
// Path: redaxo/src/addons/medianeo/lib/api.php

class rex_api_medianeo extends rex_api_function
{
    protected $published = true;

    public function execute()
    {
        try {
            // Check if user is logged in
            if (!rex::getUser()) {
                throw new rex_api_exception('Backend user must be logged in');
            }

            $func = rex_request('func', 'string');
            $handler = new rex_medianeo_handler();
            
            switch($func) {
                case 'get_category':
                    $result = $handler->getCategoryData();
                    break;
                    
                case 'get_media':
                    $result = $handler->getMediaData();
                    break;
                    
                case 'search':
                    $result = $handler->searchMedia();
                    break;
                    
                default:
                    throw new rex_api_exception('Unknown function: ' . $func);
            }
            
            // Clean output buffers and send JSON response
            rex_response::cleanOutputBuffers();
            rex_response::sendJson([
                'success' => true,
                'data' => $result
            ]);
            exit;
            
        } catch (Exception $e) {
            rex_response::cleanOutputBuffers();
            rex_response::setStatus(rex_response::HTTP_INTERNAL_ERROR);
            rex_response::sendJson([
                'success' => false,
                'error' => $e->getMessage()
            ]);
            exit;
        }
    }
}
