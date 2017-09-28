//global vars
var HTML_yesno = '<span class="delete-confirm">' + tfu_js['are_you_sure'] + '&nbsp;&nbsp;<a href="" class="confirm-yes">' + tfu_js['yes'] + '</a>&nbsp;&nbsp;<a href="" class="confirm-no">' + tfu_js['no'] + '</span>';
var isTouchDevice = (('ontouchstart' in window) || ('onmsgesturechange' in window));
var image_zooming_id = '';

var Parchment = Quill.import('parchment');
var Delta = Quill.import('delta');

//sticky-kit!
window.currMq = undefined;
var mqDetector = new Object(),
    mqSelectors = new Array();
var UpdateStickyBlocks = function (force, meta_element) {
    if (typeof force == "undefined") force = 0;
    if (typeof meta_element == "undefined") meta_element = 0;
    for (var i = 0; i <= mqSelectors.length; i++) {
        if (mqSelectors[i].is(":visible")) {
            if (window.currMq != mqSelectors[i].attr("class") || force == 1) {
                window.currMq = mqSelectors[i].attr("class");
                if (window.currMq == 'visible-xs') {
                    $(".message-meta").trigger("sticky_kit:detach");
                } else {
                    if (meta_element != 0) {
                        ElementUpdateSticky(meta_element);
                    } else {
                        $(":not(.message-collapsed) > .message-meta").each(function (index) {
                            ElementUpdateSticky(this);
                        });
                    }
                }
            }
            break;
        }
    }

    function ElementUpdateSticky(element) {
        var element_height = $(element).height();
        var parent_height = $(element).parent().height();
        if ($(element).hasClass('is_stuck'))
            parent_height = $(element).parent().parent().height();
        if (parent_height - element_height > 200)
            $(element).stick_in_parent();
        else
            $(element).trigger("sticky_kit:detach");
    }
};

//realtime
try {

    socket.on('typing', function (event) {
        $('#tm_updated_' + event['tm_id']).text(tfu_js['typing']);
    });

    socket.on('saved', function (event) {
        $('#tm_updated_' + event['tm_id']).fadeOut('slow', function () {
            $(this).addClass('outdated');
            $('#nav-panel-refresh').css('display', 'block');
            $(this).text(event['tm_updated']);
            $(this).fadeIn('slow');
        });
    });

    socket.on('deleted', function (event) {
        $('#tm_updated_' + event['tm_id']).addClass('outdated');
        $('#nav-panel-refresh').css('display', 'block');
    });

    socket.on('added', function (event) {
        $('#nav-panel-refresh').css('display', 'block');
    });

} catch(error) {}

//onbeforeunload
window.onbeforeunload = function (e) {
    if ($('.pending').length || $(document).find('.loadFacebookG').length) {

        if (typeof e == "undefined") {
            e = window.event;
        }
        if (e) {
            e.returnValue = tfu_js['changes_pending'];
        }
        return tfu_js['changes_pending'];

    }
}

//document.ready
$(function () {

    //update task
    UpdateTaskUI(task);

    //actions handler
    $('body').on('click', 'span[data-active=1]', ActionsHandler);

    //sticky-kit
    mqDetector = $("#mq-detector");
    mqSelectors = [
        mqDetector.find(".visible-xs"),
        mqDetector.find(".visible-sm"),
        mqDetector.find(".visible-md"),
        mqDetector.find(".visible-lg")
    ];
    UpdateStickyBlocks(1);
    $(window).on('resize', UpdateStickyBlocks);

    //cancel image zoom on key press
    document.body.onkeydown = function (e) {
        if (image_zooming_id !== '') {
            $('#' + image_zooming_id).trigger('mouseout');
        }
    };

    //nav-panel
    UpdateNavPanel();
    $(window).scroll(function () {
        UpdateNavArrows();
    });

    //nav-panel: scroll up
    $('#nav-panel').on('click', '#nav-panel-up', function (e) {
        e.preventDefault();
        $(document).scrollTop(0);
    });

    //nav-panel: scroll down
    $('#nav-panel').on('click', '#nav-panel-down', function (e) {
        e.preventDefault();
        $(document).scrollTop($(document).height() - $(window).height() - 240);
    });

    //nav-panel: expand
    $('#nav-panel').on('click', '#nav-panel-expand:not(.disabled)', function (e) {
        this.className = this.className + " disabled";
        setTimeout(function() {
            var expanders = new Array();
            $('.message-collapsed .content-wrap .message-content').each(function (index, element) {
                expanders.push( ReloadMessage(Number($(element).attr('tm_id')), 0, 0) );
            });
            Promise.all(expanders).then(
                function () { UpdateStickyBlocks(1); UpdateNavPanel(); },
                function () { console.log(error); }
            );
        }, 100);
        e.preventDefault();
    });

    //nav-panel: collapse
    $('#nav-panel').on('click', '#nav-panel-collapse:not(.disabled)', function (e) {
        this.className = this.className + " disabled";
        setTimeout(function() {
            var collapsers = new Array();
            $('.message-content').slice(0, -3).each(function (index, element) {
                collapsers.push( ReloadMessage(Number($(element).attr('tm_id')), 1, 0) );
            });
            Promise.all(collapsers).then(
                function () { UpdateStickyBlocks(1); UpdateNavPanel(); },
                function () { console.log(error); }
            );
        }, 100);
        e.preventDefault();
    });

    //nav-panel: reload
    $('#nav-panel').on('click', '#nav-panel-refresh:not(.disabled)', function (e) {
        e.preventDefault();
        this.className = this.className + " disabled";
        setTimeout(function() {
            var updaters = new Array();
            $('.outdated').each(function (index, element) {
                var tm_id = Number( $(element).parents('.message-wrap').find('.message-content').attr('tm_id') );
                updaters.push( ReloadMessage(tm_id, 0, 1) );
                $(element).removeClass('outdated');
            });
            updaters.push( GetNewMessages() );
            Promise.all(updaters).then(
                function () { UpdateStickyBlocks(1); UpdateNavPanel(); },
                function () { console.log(error); }
            );        
        }, 100);
    });

    //copy task and message ids to clipboard
    $('.container').on('click', '[data-clipboard]', function (e) {
        e.preventDefault();
        var result =  copyToClipboard('text/html', $(this).attr('data-clipboard'));
        $(this).attr(
            'data-original-title', 
            result === 'ok' ? tfu_js['copied'] : tfu_js['copy failed']
        ).tooltip('show');
    });
    $('.container').on('mouseout', '[data-clipboard]', function (e) {
        $(this).attr('data-original-title', tfu_js['click to copy']);
    });    

    //new message
    $('#add-message').on('click', function (e) {
        e.preventDefault();
        //user adds second message and hint hasn't been shown yet
        if ($('.content-wrap [data-new-message=1]').length && $('.advice-add-message').attr('show-advice') == '1') {
            $('#add-message').hide();
            $('#add-message').after('<div class="text-center add-message-preloader"><img src="img/ajax-loader.gif"></div>');
            $.post('ajax_update_user_environment.php',
                { e_param_name: 'advice-add-message question', e_param_value: 1 },
                function (response) {
                    $('.add-message-preloader').remove();
                    $('.advice-add-message').attr('show-advice', '0');
                    $('.advice-add-message').show();
                    tm_id = $(".message-content").last().attr('tm_id');
                    $("html, body").animate({ scrollTop: $("#tm_wrap_" + tm_id).offset().top }, 1000);
                }
            );
        }
        else {
            addMessage();
        }
    });

    //aprove new message
    $('.add-new-message').on('click', function (e) {
        e.preventDefault();
        $('.advice-add-message').hide();
        $('#add-message').show();
        addMessage();
    });
    //cancel new message
    $('.cancel-new-message').on('click', function (e) {
        e.preventDefault();
        $('.advice-add-message').hide();
        $('#add-message').show();
    });



    //messages events handlers
    $('.message-content').each(function (index, element) {

        var tm_id = $(element).attr('tm_id');

        attach_allmessage_events_handlers(tm_id);

        if (!$('#tm_wrap_' + tm_id).hasClass('message-collapsed')) {
            prepare_old_images(tm_id);
            prepare_old_files(tm_id);
        }

        if (Number($('#m_content_' + tm_id).attr('editable'))) {
            attach_editablemessage_events_handlers(tm_id);
        }

    });


    //saving.. messages content every 3 seconds
    setInterval(function () {

        $('.message-content[modified="1"]').each(function (index, element) {
            var tm_id = Number($(element).attr('tm_id')),
                $updated = $('#tm_updated_' + tm_id),
                $content = $('#m_content_' + tm_id),
                $editor = $('#m_content_' + tm_id + ' >.ql-editor'),
                $files = $('#m_files_' + tm_id);

            $updated.show();
            $content.attr("modified", 0);

            $.post(
                "ajax_update_message_content.php",
                {
                    tm_id: tm_id,
                    content: $editor.html(),
                    title: $('#t_title').text()
                },
                function (data) {

                    if (data.error){
                        ShowAlert('danger', data.error in tfu_js ? tfu_js[data.error] : data.error);
                    } else {
                        task = data;
                        UpdateTaskUI(task);

                        $updated.fadeOut('slow', function () {
                            if ($content.attr('modified') === '0' && $content.attr('waiting') === '0' && $files.attr('waiting') === '0') {
                                $(this).removeClass('pending');
                            }
                            $(this).text(task.t_updated).fadeIn('fast');
                        });

                        try{
                            window.abtasks_event.description = { 'tm_id': tm_id, 'tm_updated': task.t_updated };
                            socket.emit('saved', window.abtasks_event);
                        }catch(error){}
                    }                

                },
                "json"
            );
        });

    }, 3000);

});


//---------------------------------------------------------------------------------------//
//-----------------------------------functions-------------------------------------------//
//---------------------------------------------------------------------------------------//

//подготовить изображения, которые были приложены до внедрения Quill
function prepare_old_images(tm_id) {

    $('#m_content_' + tm_id).find('img[key]').each(function (index, element) {
        url = AWS_CDN_ENDPOINT + $(element).attr('key');
        $(element).attr('src', url)
            .removeClass('loading')
            .removeAttr('key alt data-dump-image');
    });

}

//подготовить файлы, которые были приложены до внедрения Quill
function prepare_old_files(tm_id) {
    var $files = $('#m_files_' + tm_id);
    if ($files.find('li.check-for-old-message-files').length) {
        $.post(
            "ajax_get_old_message_files.php",
            { t_id: $('#t_id').text(), tm_id: tm_id },
            function (data) { $files.html(data); }
        );
    }
}

//записать в БД на сервере текущий набор файлов сообщения
function updateMessageFiles(tm_id) {

    var files = new Array();
    $('#m_files_' + tm_id + ' li').each(function (index) {
        var $a = $(this).find('.file-name a');
        if ($a.length !== 0) {
            files.push({
                'name': $a.text(),
                'url': $a.attr('href'),
                'size': $(this).find('.file-size').text().replace(/[()]/g, '')
            });
        }
    });

    return $.ajax({
        method: 'POST',
        url: 'ajax_update_message_files.php',
        data: { tm_id: tm_id, files: JSON.stringify(files) },
        dataType: 'json'
    });

}

//из буфера обмена вставляется файл?
function isFilePaste(event) {
    return event &&
        event.clipboardData &&
        event.clipboardData.items &&
        $.inArray('Files', event.clipboardData.types) > -1;
}


//добавить новое сообщение
function addMessage() {
    $('#add-message').attr('disabled', 'disabled');
    var add_button = $('#add-message');
    var loader_image = document.createElement("IMG");
    loader_image.src = 'img/ajax-loader.gif';
    loader_image.style.marginLeft = 'auto';
    loader_image.style.marginRight = 'auto';
    loader_image.style.display = 'block';
    $(loader_image).insertBefore(add_button.parent().parent());
    $.post("ajax_new_message.php", { t_id: $('#t_id').text() })
        .done(function (data) {
            var new_message = $(data).hide();
            $(loader_image).replaceWith(new_message);
            add_button.text(tfu_js['add_more_message']);
            $(new_message).fadeIn(1000);
            var tm_id = $(".message-content").last().attr('tm_id');
            attach_allmessage_events_handlers(tm_id);
            attach_editablemessage_events_handlers(tm_id);
            UpdateStickyBlocks(1, $('#tm_wrap_' + tm_id).find('.message-meta').get(0));
            $("html, body").animate({ scrollTop: $("#tm_wrap_" + tm_id).offset().top }, 1000);
            $("#m_content_" + tm_id).data("editor").focus();
            $('#add-message').removeAttr('disabled');
            $("#m_content_" + tm_id).attr('data-new-message', '1');

            try{
                window.abtasks_event.description = { 'tm_id': tm_id };
                socket.emit('added', window.abtasks_event);
            }catch(error){}
            
        });
}

//перезагрузить сообщение
function ReloadMessage(tm_id, collapse, force) {
    var $message = $('#tm_wrap_' + tm_id),
        $overlay = $('#tm_wrap_' + tm_id + ' .overlay'),
        $update = $('#tm_updated_' + tm_id),
        $content = $('#m_content_' + tm_id);

    if (!force && ($message.attr('data-loaded') === '1' || collapse === 1)) {
        if (collapse) {
            $message.addClass('message-collapsed');
            $overlay.removeClass('collapser').addClass('expander');
            if ($content.attr('editable') === '1') {
                $content.data("editor").disable();
            }
        } else {
            $message.removeClass('message-collapsed');
            $overlay.removeClass('expander').addClass('collapser');
            if ($content.attr('editable') === '1') {
                $content.data("editor").enable();
            }
        }
        return Promise.resolve('success');
    } else {
        $update.html(tfu_js['loading']);
        return $.post("ajax_get_task_message.php", { tm_id: tm_id, collapsed: collapse })
            .done(function (data) {
                if (data === 'wbscC0dWNLfd6ldHmRrl') {
                    $message.fadeOut('slow', function () {
                        $(this).remove();
                    });
                } else {
                    $message.replaceWith($(data));
                    attach_allmessage_events_handlers(tm_id);
                    if (!collapse) {
                        prepare_old_images(tm_id);
                        prepare_old_files(tm_id);
                    }
                    if ($(data).find('.message-content[editable="1"]').length) {
                        attach_editablemessage_events_handlers(tm_id);
                    }
                }
            });
    }
}

//получить новые сообщения
function GetNewMessages() {
    return $.post(
        "ajax_task_get_new_messages.php",
        {
            t_id: $('#t_id').text(),
            tm_id: $('.message-content:last').attr('tm_id')
        },
        function (data) {
            $('#add-message').parents('.row').before(data);
            $('.message-unhandled').each(function (index, element) {
                var $message = $(element),
                    $content = $message.find('.message-content'),
                    tm_id = $content.attr('tm_id');
                attach_allmessage_events_handlers(tm_id);
                if (Number($content.attr('editable'))) {
                    attach_editablemessage_events_handlers(tm_id);
                }
                $message.removeClass('message-unhandled');
            });
        }
    );
}

//обновить навигационную панель
function UpdateNavPanel() {
    if ($('.message-collapsed').length) {
        $('#nav-panel-collapse').hide();
        $('#nav-panel-expand').css('display', 'block');
    } else if ($('.message-wrap').length > 3) {
        $('#nav-panel-collapse').css('display', 'block');
        $('#nav-panel-expand').hide();
    } else {
        $('#nav-panel-collapse').hide();
        $('#nav-panel-expand').hide();
    }
    if (!$('.outdated').length) {
        $('#nav-panel-refresh').hide();
    }
    UpdateNavArrows();
    $('#nav-panel a').removeClass('disabled');
}

function UpdateNavArrows() {
    if ($(window).scrollTop() + $(window).height() / 2 > $(document).height() / 2) {
        $('#nav-panel-up').css('display', 'block');
        $('#nav-panel-down').hide();
    } else {
        $('#nav-panel-up').hide();
        $('#nav-panel-down').css('display', 'block');
    }
}

//получить range по координатам
function RangeFromPoint(clientX, clientY) {
    // insert the image standards-based way
    if (document.caretPositionFromPoint) {
        var pos = document.caretPositionFromPoint(clientX, clientY);
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse();
        // insert the image WebKit way
    } else if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(clientX, clientY);
        // insert the image IE way
    } else if (document.body.createTextRange) {
        range = document.body.createTextRange();
        range.moveToPoint(clientX, clientY);
    }
    return range;
}

//установка курсора перед элементом
function CaretBeforeElement(element) {
    var range = document.createRange();
    range.setStartBefore(element);
    range.collapse(true);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
} 

//
var copyToClipboard = (function () {
    var data = null,
        type = '',
        result = 'ok';

    document.addEventListener("copy", function (e) {
        if (data !== null) {
            try {
                e.clipboardData.setData(type, data);
                e.preventDefault();
            } catch(err){
                result = 'fail';
            } finally {
                data = null;
            }
        }
    });

    return function (t, d) {
        type = t;
        data = d;
        document.execCommand("copy");
        return result;
    };
})();
