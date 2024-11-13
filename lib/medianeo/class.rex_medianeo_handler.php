<?php
// Path: redaxo/src/addons/medianeo/lib/class.rex_medianeo_handler.php

class rex_medianeo_handler {
    
    const MEDIA_MANAGER_TYPE = 'medianeo_preview';

    public function getCategoryData() {
        $categoryId = rex_request('category_id', 'int', 0);
        
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
        
        return [
            'categories' => $categories,
            'files' => $files,
            'breadcrumb' => $breadcrumb
        ];
    }
    
    public function getMediaData() {
        $mediaId = rex_request('media_id', 'int');
        
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
    }
    
    public function searchMedia() {
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
    }

    public static function registerMediaManagerType() {
        if (!rex_addon::get('media_manager')->isAvailable()) {
            return;
        }

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
    }
}<?php
// Path: redaxo/src/addons/medianeo/lib/class.rex_medianeo_handler.php

class rex_medianeo_handler {
    
    const MEDIA_MANAGER_TYPE = 'medianeo_preview';

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
    
    protected function getCategoryData() {
        $categoryId = rex_request('category_id', 'int', 0);
        
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
        
        return rex_response::sendJson([
            'categories' => $categories,
            'files' => $files,
            'breadcrumb' => $breadcrumb
        ]);
    }
    
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
                if ($media[0]['isImage']) {
                    $media[0]['preview_url'] = rex_media_manager::getUrl(self::MEDIA_MANAGER_TYPE, $media[0]['filename']);
                }
            }
            return rex_response::sendJson($media[0]);
        }
        
        throw new rex_exception('Media not found: ' . $mediaId);
    }
    
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
        
        return rex_response::sendJson([
            'files' => $files
        ]);
    }

    public static function registerMediaManagerType() {
        if (!rex_addon::get('media_manager')->isAvailable()) {
            return;
        }

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
    }
}
