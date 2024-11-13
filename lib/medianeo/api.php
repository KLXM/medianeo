<?php
// Path: redaxo/src/addons/medianeo/lib/api.php

class rex_api_medianeo extends rex_api_function
{
    protected $published = true;
    
    function execute()
    {
        $function = rex_request('func', 'string');
        $handler = new rex_medianeo_handler();
        
        try {
            switch($function) {
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
                    throw new rex_api_exception('Unknown function: ' . $function);
            }
            
            return new rex_api_result(true, $result);
            
        } catch (Exception $e) {
            throw new rex_api_exception($e->getMessage());
        }
    }
}
