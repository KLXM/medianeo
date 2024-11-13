<?php
// Path: redaxo/src/addons/medianeo/pages/index.php

$func = rex_request('func', 'string');

if ($func == 'update') {
    // Handle settings updates
    $this->setConfig('allowed_types', rex_post('allowed_types', 'string', ''));
    $this->setConfig('preview_size', rex_post('preview_size', 'int', 150));
    
    echo rex_view::success($this->i18n('settings_saved'));
}

$content = '';

// Build form
$formElements = [];

$n = [];
$n['label'] = '<label for="allowed_types">' . $this->i18n('allowed_types') . '</label>';
$n['field'] = '<input class="form-control" type="text" id="allowed_types" name="allowed_types" value="' . $this->getConfig('allowed_types') . '"/>';
$n['note'] = $this->i18n('allowed_types_note');
$formElements[] = $n;

$n = [];
$n['label'] = '<label for="preview_size">' . $this->i18n('preview_size') . '</label>';
$n['field'] = '<input class="form-control" type="number" id="preview_size" name="preview_size" value="' . $this->getConfig('preview_size', 150) . '"/>';
$formElements[] = $n;

$fragment = new rex_fragment();
$fragment->setVar('elements', $formElements, false);
$content .= $fragment->parse('core/form/form.php');

// Build buttons
$formElements = [];

$n = [];
$n['field'] = '<button class="btn btn-save rex-form-aligned" type="submit" name="save" value="1">' . $this->i18n('save') . '</button>';
$formElements[] = $n;

$fragment = new rex_fragment();
$fragment->setVar('elements', $formElements, false);
$buttons = $fragment->parse('core/form/submit.php');

// Build full page
$fragment = new rex_fragment();
$fragment->setVar('class', 'edit', false);
$fragment->setVar('title', $this->i18n('settings'), false);
$fragment->setVar('body', $content, false);
$fragment->setVar('buttons', $buttons, false);
$content = $fragment->parse('core/page/section.php');

$content = '
<form action="' . rex_url::currentBackendPage() . '" method="post">
    <input type="hidden" name="func" value="update" />
    ' . $content . '
</form>';

echo $content;
