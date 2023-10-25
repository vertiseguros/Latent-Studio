$(document).ready(function() {
    // For the .bot-ribbon
    $('.bot-ribbon img').click(function() {
        // Remove the 'selected' class only from images within .bot-ribbon
        $('.bot-ribbon .selected').removeClass('selected');
        $(this).addClass('selected');
    });

    // For the .top-ribbon
    $('.top-ribbon img').click(function() {
        // Remove the 'selected' class only from images within .top-ribbon
        $('.top-ribbon .selected').removeClass('selected');
        $(this).addClass('selected');
    });
});