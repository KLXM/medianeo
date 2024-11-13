<?php
// Path: redaxo/src/addons/medianeo/lib/class.rex_medianeo_handler.php

class rex_medianeo_handler {
    
    const MEDIA_MANAGER_TYPE = 'medianeo_preview';
    
    protected $logger;
    
    public function __construct() {
        $this->logger = rex_logger::factory();
    }

    public function getCategoryData() {
        $categoryId = rex_request('category_id', 'int', 0);
        
        $this->logger->info('Loading category: ' . $categoryId);
        
        try {
            // Get categories
            $qry = 'SELECT id, name, path 
                    FROM ' . rex::getTable('media_category') . ' 
                    WHERE parent_id = :parent_id 
                    ORDER BY name ASC';
            $sql = rex_sql::factory();
            $categories = $sql->getArray($qry, ['parent_id' => $categoryId]);
            
            // Get files from current category
            $qry = 'SELECT id, filename, title, createdate, updatedate, createuser, updateuser 
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
                    if ($file['isImage']) {
                        $file['preview_url'] = rex_media_manager::getUrl(self::MEDIA_MANAGER_TYPE, $file['filename']);
                    }
                }
            }
            
            // Build breadcrumb data
            $breadcrumb = [];
            $breadcrumb[] = ['id' => 0, 'name' => rex_i18n::msg('pool_root_category')];
            
            if ($categoryId > 0) {
                $cat = rex_media_category::get($categoryId);
                if ($cat) {
                    // Get path elements
                    $path = array_filter(explode('|', $cat->getPath()));
                    foreach($path as $pathId) {
                        $pathCat = rex_media_category::get($pathId);
                        if ($pathCat) {
                            $breadcrumb[] = [
                                'id' => $pathCat->getId(),
                                'name' => $pathCat->getName()
                            ];
                        }
                    }
                    // Add current category
                    $breadcrumb[] = [
                        'id' => $cat->getId(),
                        'name' => $cat->getName()
                    ];
                }
            }
            
            $result = [
                'categories' => $categories,
                'files' => $files,
                'breadcrumb' => $breadcrumb
            ];
            
            $this->logger->info('Category data loaded successfully');
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error('Error loading category data: ' . $e->getMessage());
            throw $e;
        }
    }
    
    public function getMediaData() {
        $mediaId = rex_request('media_id', 'int');
        
        try {
            $qry = 'SELECT id, filename, title, category_id, createdate, createuser, updatedate, updateuser 
                    FROM ' . rex::getTable('media') . ' 
                    WHERE id = :id';
            $sql = rex_sql::factory();
            $media = $sql->getArray($qry, ['id' => $mediaId]);
            
            if(empty($media)) {
                throw new rex_api_exception('Media not found: ' . $mediaId);
            }

            $mediaObj = rex_media::get($media[0]['filename']);
            if($mediaObj) {
                $media[0]['isImage'] = $mediaObj->isImage();
                $media[0]['extension'] = $mediaObj->getExtension();
                if ($media[0]['isImage']) {
                    $media[0]['preview_url'] = rex_media_manager::getUrl(self::MEDIA_MANAGER_TYPE, $media[0]['filename']);
                }
            }
                
            return $media[0];
            
        } catch (Exception $e) {
            $this->logger->error('Error loading media data: ' . $e->getMessage());
            throw $e;
        }
    }
    
    public function searchMedia() {
        $searchTerm = rex_request('q', 'string');
        $categoryId = rex_request('category_id', 'int', -1);
        
        try {
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
            foreach($files as &$file) {
                $mediaObj = rex_media::get($file['filename']);
                if($mediaObj) {
                    $file['isImage'] = $mediaObj->isImage();
                    $file['extension'] = $mediaObj->getExtension();
                    if ($file['isImage']) {
                        $file['preview_url'] = rex_media_manager::getUrl(self::MEDIA_MANAGER_TYPE, $file['filename']);
                    }
                }
            }
            
            return [
                'files' => $files
            ];
            
        } catch (Exception $e) {
            $this->logger->error('Error searching media: ' . $e->getMessage());
            throw $e;
        }
    }

    public static function registerMediaManagerType() {
        if (!rex_addon::get('media_manager')->isAvailable()) {
            return;
        }

        try {
            $sql = rex_sql::factory();
            $sql->setQuery('SELECT * FROM ' . rex::getTable('media_manager_type') . ' WHERE name = ?', [self::MEDIA_MANAGER_TYPE]);
            
            if ($sql->getRows() == 0) {
                // Create type
                $sql->setTable(rex::getTable('media_manager_type'));
                $sql->setValue('name', self::MEDIA_MANAGER_TYPE);
                $sql->setValue('description', 'MediaNeo Preview Type');
                $sql->insert();
                
                $typeId = $sql->getLastId();
                
                // Add effects
                $effects = [
                    [
                        'effect' => 'resize',
                        'parameters' => '{"width":400,"height":400,"style":"maximum","allow_enlarge":"0"}'
                    ]
                ];
                
                foreach ($effects as $effect) {
                    $sql->setTable(rex::getTable('media_manager_type_effect'));
                    $sql->setValue('type_id', $typeId);
                    $sql->setValue('effect', $effect['effect']);
                    $sql->setValue('parameters', $effect['parameters']);
                    $sql->setValue('priority', 1);
                    $sql->insert();
                }
            }
            
        } catch (Exception $e) {
            rex_logger::logError(E_WARNING, $e->getMessage(), __FILE__, __LINE__);
        }
    }
}
