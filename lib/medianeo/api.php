<?php
// Path: redaxo/src/addons/medianeo/lib/api.php

class rex_api_medianeo extends rex_api_function
{
    protected $published = true;
    protected $logger;
    
    function execute()
    {
        // Set JSON content type
        header('Content-Type: application/json');
        
        $this->logger = rex_logger::factory();
        
        try {
            // Check permissions
            if (!rex::getUser()->hasPerm('mediapool[]')) {
                throw new rex_api_exception('No permission for mediapool');
            }
            
            $function = rex_request('func', 'string');
            $handler = new rex_medianeo_handler();
            
            // Log request
            $this->logger->info('MediaNeo API call: ' . $function);
            
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
            
            // Return JSON response
            exit(json_encode([
                'success' => true,
                'data' => $result
            ]));
            
        } catch (Exception $e) {
            // Log error
            $this->logger->error('MediaNeo API error: ' . $e->getMessage());
            
            // Return error response
            exit(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));
        }
    }
}
