<?php
// Path: redaxo/src/addons/medianeo/lib/class.rex_medianeo_filepond_handler.php

/**
 * Handler class for integration between medianeo and filepond_uploader
 */
class rex_medianeo_filepond_handler {
    
    /**
     * Check if FilePond is available
     * 
     * @return bool
     */
    public static function isFilePondAvailable() {
        return rex_addon::get('filepond_uploader')->isAvailable();
    }
    
    /**
     * Get FilePond API URL
     * 
     * @return string|null
     */
    public static function getFilePondApiUrl() {
        if (self::isFilePondAvailable()) {
            return rex_url::backendController(['rex-api-call' => 'filepond_uploader']);
        }
        return null;
    }
    
    /**
     * Get FilePond API token
     * 
     * @return string|null
     */
    public static function getFilePondApiToken() {
        if (self::isFilePondAvailable()) {
            return rex_config::get('filepond_uploader', 'api_token', '');
        }
        return null;
    }
    
    /**
     * Set FilePond session token for frontend usage
     */
    public static function setFilePondSessionToken() {
        if (self::isFilePondAvailable() && !rex::isBackend()) {
            rex_login::startSession();
            rex_set_session('filepond_token', self::getFilePondApiToken());
        }
    }
    
    /**
     * Get FilePond configuration for JavaScript
     * 
     * @return array
     */
    public static function getFilePondConfig() {
        $config = [];
        
        if (!self::isFilePondAvailable()) {
            return $config;
        }
        
        // Basic FilePond configuration
        $config = [
            'enabled' => true,
            'api_url' => self::getFilePondApiUrl(),
            'max_filesize' => rex_config::get('filepond_uploader', 'max_filesize', 10),
            'allowed_types' => rex_config::get('filepond_uploader', 'allowed_types', 'image/*'),
            'chunk_size' => rex_config::get('filepond_uploader', 'chunk_size', 5) * 1024 * 1024,
            'chunk_enabled' => rex_config::get('filepond_uploader', 'enable_chunks', true),
            'lang' => rex_config::get('filepond_uploader', 'lang', rex_i18n::getLanguage()),
            'skip_meta' => false
        ];
        
        return $config;
    }
    
    /**
     * Initialize FilePond with medianeo integration
     * 
     * @param string $selector jQuery selector for the input elements
     * @param array $options Custom FilePond options
     * @return string JavaScript code
     */
    public static function initializeFilePond($selector = '.medianeo-filepond', $options = []) {
        if (!self::isFilePondAvailable()) {
            return '';
        }
        
        $default_options = [
            'allowMultiple' => true,
            'allowReorder' => true,
            'server' => [
                'url' => self::getFilePondApiUrl(),
                'process' => [
                    'method' => 'POST',
                    'headers' => [
                        'X-Requested-With' => 'XMLHttpRequest'
                    ],
                    'withCredentials' => false,
                ]
            ],
            'labelIdle' => 'Dateien hierher ziehen oder <span class="filepond--label-action">durchsuchen</span>'
        ];
        
        // Merge with custom options
        $merged_options = array_merge($default_options, $options);
        
        // Create JavaScript code
        $js = "
        if (typeof FilePond !== 'undefined') {
            document.querySelectorAll('" . $selector . "').forEach(function(input) {
                // Create FilePond instance
                const pond = FilePond.create(input, " . json_encode($merged_options) . ");
                
                // Store reference to the instance
                input.pond = pond;
            });
        }
        ";
        
        return $js;
    }
    
    /**
     * Get HTML code for a FilePond input
     * 
     * @param string $name Input name
     * @param string $value Current value
     * @param array $attributes Additional HTML attributes
     * @return string HTML code
     */
    public static function getFilePondInput($name, $value = '', $attributes = []) {
        if (!self::isFilePondAvailable()) {
            return '';
        }
        
        // Default attributes
        $default_attrs = [
            'data-widget' => 'filepond',
            'data-filepond-cat' => rex_config::get('filepond_uploader', 'category_id', 0),
            'data-filepond-maxfiles' => rex_config::get('filepond_uploader', 'max_files', 30),
            'data-filepond-types' => rex_config::get('filepond_uploader', 'allowed_types', 'image/*'),
            'data-filepond-maxsize' => rex_config::get('filepond_uploader', 'max_filesize', 10),
            'data-filepond-lang' => rex_config::get('filepond_uploader', 'lang', rex_i18n::getLanguage()),
            'data-filepond-chunk-enabled' => rex_config::get('filepond_uploader', 'enable_chunks', true) ? 'true' : 'false',
            'data-filepond-chunk-size' => rex_config::get('filepond_uploader', 'chunk_size', 5) * 1024 * 1024
        ];
        
        // Merge with custom attributes
        $merged_attrs = array_merge($default_attrs, $attributes);
        
        // Build HTML attributes string
        $html_attrs = '';
        foreach ($merged_attrs as $key => $val) {
            $html_attrs .= ' ' . htmlspecialchars($key) . '="' . htmlspecialchars($val) . '"';
        }
        
        return '<input type="hidden" name="' . htmlspecialchars($name) . '" value="' . htmlspecialchars($value) . '"' . $html_attrs . '>';
    }
}