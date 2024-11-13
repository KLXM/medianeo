<?php
// Path: redaxo/src/addons/medianeo/lib/class.rex_medianeo_handler.php

class rex_medianeo_handler {
    
    public function getCategoryData() {
        $categoryId = rex_request('category_id', 'int', 0);
        
        try {
            // Get categories
            $qry = 'SELECT id, name, path 
                    FROM ' . rex::getTable('media_category') . ' 
                    WHERE parent_id = :parent_id 
                    ORDER BY name ASC';
            $sql = rex_sql::factory();
            $categories = $sql->getArray($qry, ['parent_id' => $categoryId]);
            
            // Get files from current category
            $qry = 'SELECT id, filename, title, filetype, createdate, updatedate, createuser, updateuser 
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
            
        } catch (Exception $e) {
            throw new rex_api_exception('Error loading category data: ' . $e->getMessage());
        }
    }
    
    public function getMediaData() {
        $mediaId = rex_request('media_id', 'int');
        
        try {
            $qry = 'SELECT id, filename, title, filetype, category_id, createdate, createuser, updatedate, updateuser 
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
            }
                
            return $media[0];
            
        } catch (Exception $e) {
            throw new rex_api_exception('Error loading media data: ' . $e->getMessage());
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
            
            $qry = 'SELECT id, filename, title, filetype, category_id, createdate, updatedate 
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
                }
            }
            
            return [
                'files' => $files
            ];
            
        } catch (Exception $e) {
            throw new rex_api_exception('Error searching media: ' . $e->getMessage());
        }
    }
}
