<?php
// Path: redaxo/src/addons/medianeo/pages/index.php

$func = rex_request('func', 'string');

if ($func == 'update') {
    // Handle settings updates
    $this->setConfig('allowed_types', rex_post('allowed_types', 'string', ''));
    $this->setConfig('preview_size', rex_post('preview_size', 'int', 150));
    
    // Präfix medianeo_ für den Sprachschlüssel hinzufügen
    echo rex_view::success($this->i18n('medianeo_settings_saved'));
}

$content = '';

// Build form
$formElements = [];

$n = [];
// Präfix medianeo_ für den Sprachschlüssel hinzufügen
$n['label'] = '<label for="allowed_types">' . $this->i18n('medianeo_allowed_types') . '</label>';
$n['field'] = '<input class="form-control" type="text" id="allowed_types" name="allowed_types" value="' . $this->getConfig('allowed_types') . '"/>';
// Präfix medianeo_ für den Sprachschlüssel hinzufügen
$n['note'] = $this->i18n('medianeo_allowed_types_note');
$formElements[] = $n;

$n = [];
// Präfix medianeo_ für den Sprachschlüssel hinzufügen
$n['label'] = '<label for="preview_size">' . $this->i18n('medianeo_preview_size') . '</label>';
$n['field'] = '<input class="form-control" type="number" id="preview_size" name="preview_size" value="' . $this->getConfig('preview_size', 150) . '"/>';
// Eventuell auch Hinweistext anpassen, falls vorhanden
$n['note'] = $this->i18n('medianeo_preview_size_note');
$formElements[] = $n;

$fragment = new rex_fragment();
$fragment->setVar('elements', $formElements, false);
$content .= $fragment->parse('core/form/form.php');

// Build buttons
$formElements = [];

$n = [];
$n['field'] = '<button class="btn btn-save rex-form-aligned" type="submit" name="save" value="1">' . rex_i18n::msg('save') . '</button>';
$formElements[] = $n;

$fragment = new rex_fragment();
$fragment->setVar('elements', $formElements, false);
$buttons = $fragment->parse('core/form/submit.php');

// Build full page
$fragment = new rex_fragment();
$fragment->setVar('class', 'edit', false);
// Präfix medianeo_ für den Sprachschlüssel hinzufügen
$fragment->setVar('title', $this->i18n('medianeo_settings'), false);
$fragment->setVar('body', $content, false);
$fragment->setVar('buttons', $buttons, false);
$content = $fragment->parse('core/page/section.php');

$content = '
<form action="' . rex_url::currentBackendPage() . '" method="post">
    <input type="hidden" name="func" value="update" />
    ' . $content . '
</form>';

echo $content;
