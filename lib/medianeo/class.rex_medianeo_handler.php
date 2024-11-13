// Path: lib/medianeo/class.rex_medianeo_handler.php

class rex_medianeo_handler {
    
    public function handleRequest() {
        $func = rex_request('func', 'string');
        
        switch($func) {
            case 'get_category':
                return $this->getCategoryData();
            case 'get_media':
                return $this->getMediaData();
            default:
                throw new rex_exception('Unknown function: ' . $func);
        }
    }
    
    protected function getCategoryData() {
        $categoryId = rex_request('category_id', 'int', 0);
        
        // Get categories
        $categories = [];
        $qry = 'SELECT id, name FROM ' . rex::getTable('media_category') . ' WHERE parent_id = :parent_id ORDER BY name ASC';
        $sql = rex_sql::factory();
        $categories = $sql->getArray($qry, ['parent_id' => $categoryId]);
        
        // Get files from current category
        $files = [];
        $qry = 'SELECT id, filename, title, updatedate 
                FROM ' . rex::getTable('media') . ' 
                WHERE category_id = :category_id 
                ORDER BY updatedate DESC';
        $sql = rex_sql::factory();
        $files = $sql->getArray($qry, ['category_id' => $categoryId]);
        
        // Add file information
        foreach($files as &$file) {
            $mediaObj = rex_media::get($file['filename']);
            if($mediaObj) {
                $file['isImage'] = $mediaObj->isImage();
                $file['extension'] = $mediaObj->getExtension();
            }
        }
        
        return rex_response::sendJson([
            'categories' => $categories,
            'files' => $files
        ]);
    }
    
    protected function getMediaData() {
        $mediaId = rex_request('media_id', 'int');
        
        $qry = 'SELECT id, filename, title, category_id 
                FROM ' . rex::getTable('media') . ' 
                WHERE id = :id';
        $sql = rex_sql::factory();
        $media = $sql->getArray($qry, ['id' => $mediaId]);
        
        if(!empty($media)) {
            $mediaObj = rex_media::get($media[0]['filename']);
            if($mediaObj) {
                $media[0]['isImage'] = $mediaObj->isImage();
                $media[0]['extension'] = $mediaObj->getExtension();
            }
            return rex_response::sendJson($media[0]);
        }
        
        throw new rex_exception('Media not found: ' . $mediaId);
    }

    /**
     * Register the necessary pages and permissions
     */
    public static function init() {
        if(rex::isBackend()) {
            // Add to mediapool page structure
            rex_extension::register('PAGES_PREPARED', function() {
                $page = new rex_be_page('medianeo', rex_i18n::msg('mediapool'));
                $page->setPath(rex_path::addon('mediapool', 'pages/medianeo.php'));
                $page->setHidden(true);
                
                $mediapoolPage = rex_be_controller::getPageObject('mediapool');
                if($mediapoolPage) {
                    $mediapoolPage->addSubpage($page);
                }
            });
            
            // Add necessary assets
            rex_view::addJsFile(rex_url::addonAssets('mediapool', 'js/medianeo.js'));
            rex_view::addCssFile(rex_url::addonAssets('mediapool', 'css/medianeo.css'));
            
            // Add Sortable.js for drag & drop functionality
            rex_view::addJsFile('https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js');
        }
    }
}

// Initialize the handler
rex_medianeo_handler::init();
