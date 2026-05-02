(function () {
    'use strict';

    function initDemoOutput() {
        var button = document.querySelector('[data-medianeo-demo-values="1"]');
        if (!button) {
            return;
        }

        button.addEventListener('click', function () {
            var single = document.querySelector('input[name="medianeo_demo_single"]');
            var multi = document.querySelector('input[name="medianeo_demo_multi"]');
            var output = document.querySelector('.medianeo-demo-output');
            if (!output) {
                return;
            }

            var payload = {
                single: single ? single.value : '',
                multi: multi ? multi.value : '',
            };

            output.textContent = JSON.stringify(payload, null, 2);
        });
    }

    if (typeof jQuery !== 'undefined') {
        jQuery(document).on('rex:ready', initDemoOutput);
    } else {
        document.addEventListener('DOMContentLoaded', initDemoOutput);
    }
})();
