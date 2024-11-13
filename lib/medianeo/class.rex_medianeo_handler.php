<?php
// Path: redaxo/src/addons/medianeo/lib/class.rex_medianeo_handler.php

class rex_medianeo_handler {
    
    const MEDIA_MANAGER_TYPE = 'medianeo_preview';
    private $addon;
    
    public function __construct() {
        $this->addon = rex_addon::get('medianeo');
    }
    
    /**
     * Handle incoming AJAX requests
     *
     * @throws rex_exception
     * @return void
     */
    public function handleRequest() {
        // Check CSRF token
        if (!rex_csrf_token::factory('medianeo')->isValid()) {
            throw new rex_exception('CSRF token invalid');
        }
        
        $func = rex_request('func', 'string');
        
        switch($func) {
            case 'get_category':
                return $this->getCategoryData();
            case 'get_media':
                return $this->getMediaData();
            case 'get_categories':
                return $this->getAllCategories();
            case 'search':
                return $this->searchMedia();
            default:
                throw new rex_exception('Unknown function: ' . $func);
        }
    }
    
    /**
     * Get category data including subcategories and files
     *
     * @return void
     */
    protected function getCategoryData() {
        $categoryId = rex_request('category_id', 'int', 0);
        
        // Get categories
        $categories = $this->getCategories($categoryId);
        
        // Get files from current category
        $files = $this->getFilesFromCategory($categoryId);
        
        rex_response::sendJson([
            'categories' => $categories,
            'files' => $files,
            'breadcrumb' => $this->getBreadcrumb($categoryId)
        ]);
    }
    
    /**
     * Get all categories for the category tree
     *
     * @return void
     */
    protected function getAllCategories() {
        $categories = $this->getCategoryTree();
        rex_response::sendJson([
            'categories' => $categories
        ]);
    }
    
    /**
     * Get single media data
     *
     * @return void
     * @throws rex_exception
     */
    protected function getMediaData() {
        $mediaId = rex_request('media_id', 'int');
        
        $qry = 'SELECT id, filename, title, category_id, createdate, createuser, updatedate, updateuser 
                FROM ' . rex::getTable('media') . ' 
                WHERE id = :id';
        $sql = rex_sql::factory();
        $media = $sql->getArray($qry, ['id' => $mediaId]);
        
        if(!empty($media)) {
            $mediaObj = rex_media::get($media[0]['filename']);
            if($mediaObj) {
                $media[0]['isImage'] = $mediaObj->isImage();
                $media[0]['extension'] = $mediaObj->getExtension();
                $media[0]['filesize'] = $mediaObj->getSize();
                
                if($mediaObj->isImage()) {
                    $media[0]['width'] = $mediaObj->getWidth();
                    $media[0]['height'] = $mediaObj->getHeight();
                }
                
                // Add preview URL
                $media[0]['preview_url'] = $this->getPreviewUrl($mediaObj);
            }
            rex_response::sendJson($media[0]);
        }
        
        throw new rex_exception('Media not found: ' . $mediaId);
    }
    
    /**
     * Search for media files
     *
     * @return void
     */
    protected function searchMedia() {
        $searchTerm = rex_request('q', 'string');
        $categoryId = rex_request('category_id', 'int', -1);
        
        $where = [];
        $params = [];
        
        // Search in filename and title
        $where[] = '(filename LIKE :search OR title LIKE :search)';
        $params['search'] = '%' . $searchTerm . '%';
        
        // Filter by category if specified
        if($categoryId >= 0) {
            $where[] = 'category_id = :category_id';
            $params['category_id'] = $categoryId;
        }
        
        $qry = 'SELECT id, filename, title, category_id, createdate, updatedate 
                FROM ' . rex::getTable('media') . '
                WHERE ' . implode(' AND ', $where) . '
                ORDER BY updatedate DESC
                LIMIT 100';
                
        $sql = rex_sql::factory();
        $files = $sql->getArray($qry, $params);
        
        // Add additional information to each file
        $files = array_map(function($file) {
            $mediaObj = rex_media::get($file['filename']);
            if($mediaObj) {
                $file['isImage'] = $mediaObj->isImage();
                $file['extension'] = $mediaObj->getExtension();
                $file['preview_url'] = $this->getPreviewUrl($mediaObj);
            }
            return $file;
        }, $files);
        
        rex_response::sendJson([
            'files' => $files
        ]);
    }
    
    /**
     * Get categories at specified level
     *
     * @param int $parentId
     * @return array
     */
    protected function getCategories($parentId) {
        $qry = 'SELECT id, name, path 
                FROM ' . rex::getTable('media_category') . ' 
                WHERE parent_id = :parent_id 
                ORDER BY name ASC';
        $sql = rex_sql::factory();
        return $sql->getArray($qry, ['parent_id' => $parentId]);
    }
    
    /**
     * Get complete category tree
     *
     * @param int $parentId
     * @param int $level
     * @return array
     */
    protected function getCategoryTree($parentId = 0, $level = 0) {
        $categories = $this->getCategories($parentId);
        
        foreach($categories as &$category) {
            $category['level'] = $level;
            $category['children'] = $this->getCategoryTree($category['id'], $level + 1);
        }
        
        return $categories;
    }
    
    /**
     * Get files from specified category
     *
     * @param int $categoryId
     * @return array
     */
    protected function getFilesFromCategory($categoryId) {
        $qry = 'SELECT id, filename, title, category_id, createdate, updatedate 
                FROM ' . rex::getTable('media') . ' 
                WHERE category_id = :category_id 
                ORDER BY updatedate DESC';
        $sql = rex_sql::factory();
        $files = $sql->getArray($qry, ['category_id' => $categoryId]);
        
        // Add additional information to each file
        return array_map(function($file) {
            $mediaObj = rex_media::get($file['filename']);
            if($mediaObj) {
                $file['isImage'] = $mediaObj->isImage();
                $file['extension'] = $mediaObj->getExtension();
                $file['preview_url'] = $this->getPreviewUrl($mediaObj);
            }
            return $file;
        }, $files);
    }
    
    /**
     * Get category breadcrumb
     *
     * @param int $categoryId
     * @return array
     */
    protected function getBreadcrumb($categoryId) {
        $breadcrumb = [];
        
        // Add root element
        $breadcrumb[] = [
            'id' => 0,
            'name' => rex_i18n::msg('pool_root_category')
        ];
        
        if($categoryId > 0) {
            $category = rex_media_category::get($categoryId);
            if($category) {
                // Get all parent categories
                $path = explode('|', $category->getPath());
                foreach($path as $id) {
                    if($id != '' && $id != '0') {
                        $cat = rex_media_category::get($id);
                        if($cat) {
                            $breadcrumb[] = [
                                'id' => $cat->getId(),
                                'name' => $cat->getName()
                            ];
                        }
                    }
                }
                
                // Add current category
                $breadcrumb[] = [
                    'id' => $category->getId(),
                    'name' => $category->getName()
                ];
            }
        }
        
        return $breadcrumb;
    }
    
    /**
     * Get preview URL for media object
     *
     * @param rex_media $media
     * @return string
     */
    protected function getPreviewUrl(rex_media $media) {
        if($media->isImage()) {
            if(rex_addon::get('media_manager')->isAvailable()) {
                return rex_media_manager::getUrl(self::MEDIA_MANAGER_TYPE, $media->getFileName());
            }
            return rex_url::media($media->getFileName());
        }
        
        // Return file type icon
        return $this->getFileTypeIcon($media->getExtension());
    }
    
    /**
     * Get icon for file type
     *
     * @param string $extension
     * @return string
     */
    protected function getFileTypeIcon($extension) {
        $icons = [
            'pdf' => 'fa-file-pdf-o',
            'doc' => 'fa-file-word-o',
            'docx' => 'fa-file-word-o',
            'xls' => 'fa-file-excel-o',
            'xlsx' => 'fa-file-excel-o',
            'zip' => 'fa-file-archive-o',
            'rar' => 'fa-file-archive-o',
            'mp3' => 'fa-file-audio-o',
            'wav' => 'fa-file-audio-o',
            'mp4' => 'fa-file-video-o',
            'mov' => 'fa-file-video-o',
            'avi' => 'fa-file-video-o',
        ];
        
        return isset($icons[$extension]) ? $icons[$extension] : 'fa-file-o';
    }
    
    /**
     * Register media manager type
     */
    public static function registerMediaManagerType() {
        if(rex_addon::get('media_manager')->isAvailable()) {
            $sql = rex_sql::factory();
            $sql->setQuery('SELECT * FROM ' . rex::getTable('media_manager_type') . ' WHERE name = ?', [self::MEDIA_MANAGER_TYPE]);
            
            if($sql->getRows() == 0) {
                $sql->setTable(rex::getTable('media_manager_type'));
                $sql->setValue('name', self::MEDIA_MANAGER_TYPE);
                $sql->setValue('description', 'MediaNeo Preview Type');
                $sql->insert();
                
                $typeId = $sql->getLastId();
                
                // Add effects
                $effects = [
                    [
                        'effect' => 'resize',
                        'params' => json_encode([
                            'width' => 400,
                            'height' => 400,
                            'style' => 'maximum',
                            'allow_enlarge' => 0
                        ])
                    ]
                ];
                
                foreach($effects as $position => $effect) {
                    $sql->setTable(rex::getTable('media_manager_type_effect'));
                    $sql->setValue('type_id', $typeId);
                    $sql->setValue('effect', $effect['effect']);
                    $sql->setValue('parameters', $effect['params']);
                    $sql->setValue('priority', $position + 1);
                    $sql->insert();
                }
            }
        }
    }
    
    /**
     * Initialize MediaNeo
     */
    public static function init() {
        if(rex::isBackend()) {
            // Register AJAX endpoint
            rex_extension::register('PAGES_PREPARED', function($ep) {
                $page = new rex_be_page('medianeo_ajax', 'MediaNeo AJAX');
                $page->setHidden(true);
                $page->setPath(rex_path::addon('medianeo', 'pages/ajax.php'));
                
                $mainPage = rex_be_controller::getPageObject('medianeo');
                if($mainPage) {
                    $mainPage->addSubpage($page);
                }
            });
            
            // Create media manager type on addon installation
            rex_extension::register('PACKAGE_SETUP', function($ep) {
                if($ep->getParam('package') == 'medianeo') {
                    self::registerMediaManagerType();
                }
            });
        }
    }
}

// Initialize the handler
rex_medianeo_handler::init();
