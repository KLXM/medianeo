<?php

$html = [];
$html[] = '<div class="medianeo-demo">';
$html[] = '  <div class="alert alert-info">' . $this->i18n('medianeo_demo_hint') . '</div>';
$html[] = '  <div class="row">';
$html[] = '    <div class="col-md-6">';
$html[] = '      <h4>' . $this->i18n('medianeo_demo_single') . '</h4>';
$html[] = '      <input type="text" class="medianeo" name="medianeo_demo_single" value="" data-medianeo-multiple="false" data-medianeo-maxfiles="1" data-medianeo-category="0">';
$html[] = '    </div>';
$html[] = '    <div class="col-md-6">';
$html[] = '      <h4>' . $this->i18n('medianeo_demo_multi') . '</h4>';
$html[] = '      <input type="text" class="medianeo" name="medianeo_demo_multi" value="" data-medianeo-multiple="true" data-medianeo-maxfiles="8" data-medianeo-category="0">';
$html[] = '    </div>';
$html[] = '  </div>';
$html[] = '  <hr>';
$html[] = '  <button type="button" class="btn btn-default" data-medianeo-demo-values="1">' . $this->i18n('medianeo_demo_show_values') . '</button>';
$html[] = '  <pre class="medianeo-demo-output" style="margin-top:12px; min-height:80px;"></pre>';
$html[] = '</div>';

echo implode('', $html);
