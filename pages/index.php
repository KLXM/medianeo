<?php

$addon = rex_addon::get('medianeo');
echo rex_view::title($addon->i18n('medianeo_title'));
rex_be_controller::includeCurrentPageSubPath();
