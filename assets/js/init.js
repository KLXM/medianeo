// Path: redaxo/src/addons/medianeo/assets/js/init.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all MediaNeo fields
    initMediaNeoFields();
    
    // Initialize on rex:ready for PJAX compatibility
    $(document).on('rex:ready', function() {
        initMediaNeoFields();
    });
});

function initMediaNeoFields() {
    // Find all fields that should use MediaNeo
    document.querySelectorAll('input.medianeo').forEach(function(input) {
        // Only initialize if not already initialized
        if (!input.dataset.medianeoInitialized) {
            new MediaNeoPicker(input);
            input.dataset.medianeoInitialized = 'true';
        }
    });
}

// Add compatibility with REX widgets
$(document).on('rex:ready', function() {
    // Add button to REX media widgets
    $('.rex-js-widget-media').each(function() {
        let $widget = $(this);
        if (!$widget.find('.medianeo-button').length) {
            let $buttons = $widget.find('.btn-popup');
            $buttons.after(
                '<button class="btn btn-popup medianeo-button" type="button" title="MediaNeo">' +
                '<i class="rex-icon fa-image"></i>' +
                '</button>'
            );
        }
    });
});

// Handle clicks on MediaNeo buttons in REX widgets
$(document).on('click', '.medianeo-button', function(e) {
    e.preventDefault();
    let $widget = $(this).closest('.rex-js-widget-media');
    let $input = $widget.find('input[type="text"]');
    
    // Initialize MediaNeo for this input if not already done
    if (!$input.hasClass('medianeo')) {
        $input.addClass('medianeo');
        new MediaNeoPicker($input[0]);
    }
    
    // Trigger MediaNeo picker
    $input.trigger('medianeo:open');
});
