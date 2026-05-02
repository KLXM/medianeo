<?php

$func = rex_request('func', 'string');

if ('update' === $func) {
    $this->setConfig('allowed_types', rex_post('allowed_types', 'string', ''));
    $this->setConfig('preview_size', rex_post('preview_size', 'int', 150));

    echo rex_view::success($this->i18n('medianeo_settings_saved'));
}

$content = '';
$formElements = [];

$n = [];
$n['label'] = '<label for="allowed_types">' . $this->i18n('medianeo_allowed_types') . '</label>';
$n['field'] = '<input class="form-control" type="text" id="allowed_types" name="allowed_types" value="' . htmlspecialchars((string) $this->getConfig('allowed_types'), ENT_QUOTES) . '"/>';
$n['note'] = $this->i18n('medianeo_allowed_types_note');
$formElements[] = $n;

$n = [];
$n['label'] = '<label for="preview_size">' . $this->i18n('medianeo_preview_size') . '</label>';
$n['field'] = '<input class="form-control" type="number" id="preview_size" name="preview_size" min="80" max="600" value="' . (int) $this->getConfig('preview_size', 150) . '"/>';
$n['note'] = $this->i18n('medianeo_preview_size_note');
$formElements[] = $n;

$fragment = new rex_fragment();
$fragment->setVar('elements', $formElements, false);
$content .= $fragment->parse('core/form/form.php');

$formElements = [];
$n = [];
$n['field'] = '<button class="btn btn-save rex-form-aligned" type="submit" name="save" value="1">' . rex_i18n::msg('save') . '</button>';
$formElements[] = $n;

$fragment = new rex_fragment();
$fragment->setVar('elements', $formElements, false);
$buttons = $fragment->parse('core/form/submit.php');

$fragment = new rex_fragment();
$fragment->setVar('class', 'edit', false);
$fragment->setVar('title', $this->i18n('medianeo_settings'), false);
$fragment->setVar('body', $content, false);
$fragment->setVar('buttons', $buttons, false);
$content = $fragment->parse('core/page/section.php');

$content = '<form action="' . rex_url::currentBackendPage() . '" method="post">'
    . '<input type="hidden" name="func" value="update" />'
    . $content
    . '</form>';

echo $content;
