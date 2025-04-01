<?php
// Path: redaxo/src/addons/medianeo/ytemplates/bootstrap/value.medianeo.tpl.php

$class       = $this->getElement('required') ? 'form-is-required ' : '';
$class_group = trim('form-group ' . $class . $this->getWarningClass());

// Clean value (remove quotes and spaces)
$value = str_replace(['"', ' '], '', $this->getValue() ?: '');
$mediaIds = array_filter(explode(',', $value));

// Check if filepond is available
$hasFilepond = rex_addon::get('filepond_uploader')->isAvailable();

// Get medianeo specific attributes
$multiple = $this->getElement('multiple') == 1;
$allowedTypes = $this->getElement('types') ?: 'image/*';
$maxFiles = $this->getElement('maxfiles') ?: 10;
$skipMeta = $this->getElement('skip_meta') == 1;
$category = $this->getElement('category') ?: 0;

// Set additional medianeo attributes
$attributes = [
    'class' => 'medianeo',
    'data-medianeo-multiple' => $multiple ? 'true' : 'false',
    'data-medianeo-types' => $allowedTypes,
    'data-medianeo-maxfiles' => $maxFiles,
    'data-medianeo-category' => $category
];

// If filepond is available, add filepond attributes
if ($hasFilepond) {
    $attributes['data-filepond-types'] = $allowedTypes;
    $attributes['data-filepond-maxfiles'] = $maxFiles;
    $attributes['data-filepond-cat'] = $category;
    $attributes['data-filepond-skip-meta'] = $skipMeta ? 'true' : 'false';
    
    // Set filepond session variables
    rex_set_session('filepond_token', rex_config::get('filepond_uploader', 'api_token', ''));
    if ($skipMeta) {
        rex_set_session('filepond_no_meta', true);
    }
}
?>

<div class="<?= $class_group ?>" id="<?= $this->getHTMLId() ?>">
    <label class="control-label" for="<?= $this->getFieldId() ?>"><?= $this->getLabel() ?></label>
    
    <input type="text" 
           id="<?= $this->getFieldId() ?>"
           name="<?= $this->getFieldName() ?>" 
           value="<?= $value ?>"
           <?php foreach ($attributes as $attr => $val): ?>
           <?= $attr ?>="<?= $val ?>"
           <?php endforeach; ?>
    />

    <?php if ($notice = $this->getElement('notice')): ?>
        <p class="help-block small"><?= rex_i18n::translate($notice, false) ?></p>
    <?php endif ?>

    <?php if (isset($this->params['warning_messages'][$this->getId()]) && !$this->params['hide_field_warning_messages']): ?>
        <p class="help-block text-warning small"><?= rex_i18n::translate($this->params['warning_messages'][$this->getId()], false) ?></p>
    <?php endif ?>
</div>