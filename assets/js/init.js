(function () {
    'use strict';

    function initMediaNeoFields() {
        document.querySelectorAll('input.medianeo').forEach(function (input) {
            if (input.dataset.medianeoInitialized === 'true') {
                return;
            }

            if (typeof window.MediaNeoPicker === 'function') {
                var picker = new window.MediaNeoPicker(input);
                if (picker && picker.isReady) {
                    input.dataset.medianeoInitialized = 'true';
                }
            }
        });
    }

    function ensureWidgetButtons() {
        if (typeof jQuery === 'undefined') {
            return;
        }

        jQuery('.rex-js-widget-media').each(function () {
            var widget = jQuery(this);
            if (widget.find('.medianeo-button').length) {
                return;
            }

            var buttons = widget.find('.btn-popup').first();
            if (!buttons.length) {
                return;
            }

            buttons.after(
                '<button class="btn btn-popup medianeo-button" type="button" title="MediaNeo">'
                + '<i class="rex-icon fa-image"></i>'
                + '</button>'
            );
        });
    }

    function bindWidgetButtonHandler() {
        if (typeof jQuery === 'undefined') {
            return;
        }

        jQuery(document).on('click', '.medianeo-button', function (event) {
            event.preventDefault();

            var widget = jQuery(this).closest('.rex-js-widget-media');
            var input = widget.find('input[type="text"]').first();
            if (!input.length) {
                return;
            }

            if (!input.hasClass('medianeo')) {
                input.addClass('medianeo');
            }

            initMediaNeoFields();
            input.trigger('medianeo:open');
        });
    }

    window.initMediaNeoFields = initMediaNeoFields;

    if (typeof jQuery !== 'undefined') {
        jQuery(document).on('rex:ready', function () {
            initMediaNeoFields();
            ensureWidgetButtons();
        });
        bindWidgetButtonHandler();
    } else {
        document.addEventListener('DOMContentLoaded', initMediaNeoFields);
    }
})();
