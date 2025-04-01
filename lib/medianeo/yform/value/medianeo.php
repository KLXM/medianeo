<?php
// Path: redaxo/src/addons/medianeo/lib/yform/value/medianeo.php

/**
 * YForm value field for medianeo with filepond integration
 */
class rex_yform_value_medianeo extends rex_yform_value_abstract
{
    /**
     * Clean media value string
     * 
     * @param string $value
     * @return string
     */
    protected static function cleanValue($value)
    {
        return implode(',', array_filter(array_map('trim', explode(',', str_replace('"', '', $value))), 'strlen'));
    }

    /**
     * Check for deleted files before validation
     */
    public function preValidateAction(): void
    {
        if ($this->params['send']) {
            // Get original value from database
            $originalValue = '';
            if (isset($this->params['main_id']) && $this->params['main_id'] > 0) {
                $sql = rex_sql::factory();
                $sql->setQuery('SELECT ' . $sql->escapeIdentifier($this->getName()) . 
                              ' FROM ' . $sql->escapeIdentifier($this->params['main_table']) . 
                              ' WHERE id = ' . (int)$this->params['main_id']);
                if ($sql->getRows() > 0) {
                    $originalValue = self::cleanValue($sql->getValue($this->getName()));
                }
            }

            // Get new value from form
            $newValue = '';
            if (isset($_REQUEST['FORM'])) {
                foreach ($_REQUEST['FORM'] as $form) {
                    if (isset($form[$this->getId()])) {
                        $newValue = self::cleanValue($form[$this->getId()]);
                        break;
                    }
                }
            }

            // Identify deleted media
            $originalFiles = array_filter(explode(',', $originalValue));
            $newFiles = array_filter(explode(',', $newValue));
            $deletedFiles = array_diff($originalFiles, $newFiles);

            // Process deleted files
            foreach ($deletedFiles as $mediaId) {
                try {
                    // Get media object
                    $sql = rex_sql::factory();
                    $sql->setQuery('SELECT filename FROM ' . rex::getTable('media') . ' WHERE id = :id', [':id' => $mediaId]);
                    if ($sql->getRows() === 0) {
                        continue;
                    }
                    
                    $filename = $sql->getValue('filename');
                    $media = rex_media::get($filename);
                    
                    if ($media) {
                        // Check if the file is still used in other records
                        $inUse = false;
                        $sql = rex_sql::factory();
                        
                        // Search all YForm tables for this media
                        $yformTables = rex_yform_manager_table::getAll();
                        foreach ($yformTables as $table) {
                            foreach ($table->getFields() as $field) {
                                if ($field->getType() === 'value' && 
                                    in_array($field->getTypeName(), ['medianeo', 'filepond', 'upload', 'media'])) {
                                    
                                    $tableName = $table->getTableName();
                                    $fieldName = $field->getName();
                                    // Create search pattern for the media ID
                                    $searchPattern = '%,' . $mediaId . ',%';
                                    $currentId = (int)$this->params['main_id'];

                                    $query = "SELECT id FROM $tableName WHERE ($fieldName LIKE :pattern OR $fieldName = :id) AND id != :current_id";
                                    
                                    try {
                                        $result = $sql->getArray($query, [
                                            ':pattern' => $searchPattern, 
                                            ':id' => $mediaId,
                                            ':current_id' => $currentId
                                        ]);
                                        
                                        if (count($result) > 0) {
                                            $inUse = true;
                                            break 2;
                                        }
                                    } catch (Exception $e) {
                                        // Continue with next field if query fails
                                        continue;
                                    }
                                }
                            }
                        }

                        // Delete media if not used elsewhere
                        if (!$inUse) {
                            // Try using filepond_uploader API if available
                            $filepondAvailable = rex_addon::get('filepond_uploader')->isAvailable();
                            
                            if ($filepondAvailable) {
                                // Use filepond API to delete the file
                                $api = new rex_api_filepond_uploader();
                                $_REQUEST['filename'] = $filename;
                                $_REQUEST['func'] = 'delete';
                                
                                try {
                                    $api->execute();
                                } catch (Exception $e) {
                                    // Fallback to standard media service
                                    rex_media_service::deleteMedia($filename);
                                }
                            } else {
                                // Use standard REDAXO media service
                                rex_media_service::deleteMedia($filename);
                            }
                        }
                    }
                } catch (Exception $e) {
                    // Ignore errors during deletion
                }
            }
        }
    }

    /**
     * Handle form entry
     */
    public function enterObject()
    {
        $this->setValue(self::cleanValue($this->getValue()));

        if ($this->params['send']) {
            $value = '';
            
            if (isset($_REQUEST['FORM'])) {
                foreach ($_REQUEST['FORM'] as $form) {
                    if (isset($form[$this->getId()])) {
                        $value = $form[$this->getId()];
                        break;
                    }
                }
            } elseif ($this->params['real_field_names']) {
                if (isset($_REQUEST[$this->getName()])) {
                    $value = $_REQUEST[$this->getName()];
                    $this->setValue($value);
                }
            }

            $errors = [];
            if ($this->getElement('required') == 1 && $value == '') {
                $errors[] = $this->getElement('empty_value', rex_i18n::msg('yform_values_medianeo_error_empty'));
            }

            if (count($errors) > 0) {
                $this->params['warning'][$this->getId()] = $this->params['error_class'];
                $this->params['warning_messages'][$this->getId()] = implode(', ', $errors);
            }

            $this->setValue($value);
            
            // Add value to pools
            $this->params['value_pool']['email'][$this->getName()] = $value;
            if ($this->saveInDb()) {
                $this->params['value_pool']['sql'][$this->getName()] = $value;
            }
        }

        // Prepare template variables
        $this->params['form_output'][$this->getId()] = $this->parse('value.medianeo.tpl.php', [
            'value' => $this->getValue(),
            'multiple' => $this->getElement('multiple') == 1,
            'types' => $this->getElement('types') ?: 'image/*',
            'maxfiles' => $this->getElement('maxfiles') ?: 10,
            'skip_meta' => $this->getElement('skip_meta') == 1,
            'category' => $this->getElement('category') ?: 0
        ]);
    }

    /**
     * Get field description
     * 
     * @return string
     */
    public function getDescription(): string
    {
        return 'medianeo|name|label|types|maxfiles[=10]|category[=0]|multiple[=0]|skip_meta[=0]|notice';
    }

    /**
     * Get field definitions
     * 
     * @return array
     */
    public function getDefinitions(): array
    {
        $filepondAvailable = rex_addon::get('filepond_uploader')->isAvailable();
        
        return [
            'type' => 'value',
            'name' => 'medianeo',
            'values' => [
                'name' => ['type' => 'name', 'label' => rex_i18n::msg('yform_values_defaults_name')],
                'label' => ['type' => 'text', 'label' => rex_i18n::msg('yform_values_defaults_label')],
                'types' => [
                    'type' => 'text',
                    'label' => rex_i18n::msg('yform_values_medianeo_types'),
                    'notice' => rex_i18n::msg('yform_values_medianeo_types_notice'),
                    'default' => 'image/*'
                ],
                'maxfiles' => [
                    'type' => 'text',
                    'label' => rex_i18n::msg('yform_values_medianeo_maxfiles'),
                    'notice' => rex_i18n::msg('yform_values_medianeo_maxfiles_notice'),
                    'default' => '10'
                ],
                'category' => [
                    'type' => 'text',
                    'label' => rex_i18n::msg('yform_values_medianeo_category'),
                    'notice' => rex_i18n::msg('yform_values_medianeo_category_notice'),
                    'default' => '0'
                ],
                'multiple' => [
                    'type' => 'boolean',
                    'label' => rex_i18n::msg('yform_values_medianeo_multiple'),
                    'default' => '1'
                ],
                'skip_meta' => [
                    'type' => 'boolean',
                    'label' => rex_i18n::msg('yform_values_medianeo_skip_meta'),
                    'default' => '0',
                    'disabled' => !$filepondAvailable
                ],
                'required' => ['type' => 'boolean', 'label' => rex_i18n::msg('yform_values_defaults_required')],
                'notice' => ['type' => 'text', 'label' => rex_i18n::msg('yform_values_defaults_notice')],
                'empty_value' => [
                    'type' => 'text',
                    'label' => rex_i18n::msg('yform_values_medianeo_empty_value'),
                    'default' => rex_i18n::msg('yform_values_medianeo_error_empty')
                ]
            ],
            'description' => rex_i18n::msg('yform_values_medianeo_description'),
            'db_type' => ['text'],
            'requires_output_method' => true,
            'multiple_output' => false,
            'notice' => $filepondAvailable ? 
                rex_i18n::msg('yform_values_medianeo_with_filepond') : 
                rex_i18n::msg('yform_values_medianeo_without_filepond'),
            'hidden' => false
        ];
    }

    /**
     * Get search field for Tablemanager
     * 
     * @param array $params
     */
    public static function getSearchField($params)
    {
        $params['searchForm']->setValueField('text', [
            'name' => $params['field']->getName(),
            'label' => $params['field']->getLabel(),
            'notice' => rex_i18n::msg('yform_values_medianeo_search_note')
        ]);
    }

    /**
     * Get search filter for Tablemanager
     * 
     * @param array $params
     * @return string
     */
    public static function getSearchFilter($params)
    {
        $sql = rex_sql::factory();
        $value = $params['value'];
        $field = $params['field']->getName();

        if ($value == '(empty)') {
            return ' (' . $sql->escapeIdentifier($field) . ' = "" or ' . $sql->escapeIdentifier($field) . ' IS NULL) ';
        }
        if ($value == '!(empty)') {
            return ' (' . $sql->escapeIdentifier($field) . ' <> "" and ' . $sql->escapeIdentifier($field) . ' IS NOT NULL) ';
        }

        $pos = strpos($value, '*');
        if ($pos !== false) {
            $value = str_replace('%', '\%', $value);
            $value = str_replace('*', '%', $value);
            return $sql->escapeIdentifier($field) . ' LIKE ' . $sql->escape($value);
        }
        return $sql->escapeIdentifier($field) . ' = ' . $sql->escape($value);
    }

    /**
     * Get list value for Tablemanager
     * 
     * @param array $params
     * @return string
     */
    public static function getListValue($params)
    {
        $value = $params['subject'];
        $mediaIds = array_filter(explode(',', self::cleanValue($value)));
        
        if (empty($mediaIds)) {
            return '';
        }
        
        $output = [];
        
        if (rex::isBackend()) {
            foreach ($mediaIds as $mediaId) {
                // Get filename from media ID
                $sql = rex_sql::factory();
                $sql->setQuery('SELECT filename FROM ' . rex::getTable('media') . ' WHERE id = :id', [':id' => $mediaId]);
                
                if ($sql->getRows() === 0) {
                    continue;
                }
                
                $filename = $sql->getValue('filename');
                $media = rex_media::get($filename);
                
                if (!$media) {
                    continue;
                }
                
                if ($media->isImage()) {
                    $thumb = rex_media_manager::getUrl('rex_media_small', $filename);
                    $output[] = sprintf(
                        '<div class="rex-medianeo-list-item">
                            <a href="%s" title="%s" target="_blank">
                                <img src="%s" alt="%s" style="max-width: 100px; max-height: 80px;">
                                <span class="filename">%s</span>
                            </a>
                        </div>',
                        $media->getUrl(),
                        rex_escape($filename),
                        $thumb,
                        rex_escape($filename),
                        rex_escape($filename)
                    );
                } else {
                    $icon = 'fa-file-o';
                    $extension = $media->getExtension();
                    
                    // Determine icon based on file extension
                    switch($extension) {
                        case 'pdf': $icon = 'fa-file-pdf-o'; break;
                        case 'doc':
                        case 'docx': $icon = 'fa-file-word-o'; break;
                        case 'xls':
                        case 'xlsx': $icon = 'fa-file-excel-o'; break;
                        case 'ppt':
                        case 'pptx': $icon = 'fa-file-powerpoint-o'; break;
                        case 'zip':
                        case 'rar': $icon = 'fa-file-archive-o'; break;
                        case 'mp3':
                        case 'wav':
                        case 'ogg': $icon = 'fa-file-audio-o'; break;
                        case 'mp4':
                        case 'avi':
                        case 'mov': $icon = 'fa-file-video-o'; break;
                    }
                    
                    $output[] = sprintf(
                        '<div class="rex-medianeo-list-item">
                            <a href="%s" title="%s" target="_blank">
                                <span class="rex-icon %s" style="font-size: 2em; display: inline-block; margin: 10px;"></span>
                                <span class="filename">%s</span>
                            </a>
                        </div>',
                        $media->getUrl(),
                        rex_escape($filename),
                        $icon,
                        rex_escape($filename)
                    );
                }
            }
            
            return '<div class="rex-medianeo-list">' . implode('', $output) . '</div>';
        }
        
        // For frontend, just return the media IDs
        return implode(',', $mediaIds);
    }
}