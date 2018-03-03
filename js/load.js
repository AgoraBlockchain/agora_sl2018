var $root = $('html, body');

$('document').ready(function () {

    //activate wow.js
    new WOW().init();

    //loading overlay
    setTimeout(
        function () {
            $('#loading-overlay').css({
                'visibility': 'hidden',
                'opacity': '0'
            });
        }, 50);

    //smooth scrolling to sections
    $(".menu-item").on('click', function (event) {
        var href = $.attr(this, 'href');

        $root.animate({
            scrollTop: $(href).offset().top
        }, 800, function () {
            window.location.hash = href;
        });

        return false;
    });
});