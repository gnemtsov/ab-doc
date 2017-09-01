//---------------------------------------------------------------------------------------//
//-----------------обработчики событий во всех сообщениях--------------------------------//
//---------------------------------------------------------------------------------------//

function attach_allmessage_events_handlers(tm_id) {
    var tm_wrap_id = 'tm_wrap_' + tm_id;
    var eye_id = 'task-message-eye-' + tm_id;
    var collapsed_id = 'task-message-collapsed-' + tm_id;
    var $message = $('#tm_wrap_' + tm_id),
        $updated = $('#tm_updated_' + tm_id),
        $content = $('#m_content_' + tm_id),
        $overlay = $('#m_content_' + tm_id + ' .overlay'),
        $files = $('#m_files_' + tm_id),
        $drop_zone = $('#tm_dropzone_' + tm_id);

    //скрытие/показ сообщений
    $('#' + eye_id).on('click', function (e) {
        e.preventDefault();
        $.post("ajax_task_message_eye_toggle.php", { tm_id: tm_id })
            .done(function (data) {
                if (data == 1) {
                    $('#' + tm_wrap_id).addClass('message-wrap-eye');
                    $('#' + eye_id).addClass('active-ico');
                } else {
                    $('#' + tm_wrap_id).removeClass('message-wrap-eye');
                    $('#' + eye_id).removeClass('active-ico');
                }
            });
    });

    //сворачивание/разворачивание сообщений
    $message.on('click', '.expander', function (e) {
        e.preventDefault();
        ReloadMessage(tm_id, 0, 0).then( function(){
            UpdateStickyBlocks(1, $('#tm_wrap_'+tm_id).find('.message-meta').get(0)); 
            UpdateNavPanel(); 
        });
    });
    $message.on('click', '.collapser', function (e) {
        e.preventDefault();
        ReloadMessage(tm_id, 1, 0).then( function () {
            UpdateStickyBlocks(1, $('#tm_wrap_'+tm_id).find('.message-meta').get(0)); 
            UpdateNavPanel();
        });
    });

    //лупа для больших изображений
    function backgroundReposition(e, image){
        var X = e.offsetX ? e.offsetX : e.pageX - image.offsetLeft,
            Y = e.offsetY ? e.offsetY : e.pageY - image.offsetTop;
        image.style['background-position-x'] = Math.round((X / image.width)*100) + '%';
        image.style['background-position-y'] = Math.round((Y / image.height)*100) + '%';        
    }
    $content.on('mouseup', 'img', function (e) {
        var $img = $(this);
        if(e.which === 1 && $img.attr('width') > $content.width() && $content.attr('modified') === '0' && $content.attr('waiting') === '0'){
            if($img.attr('src').indexOf('data:image/svg+xml;base64') === -1){
                if($content.attr('editable') === '1') {
                    $content.data('editor').disable();
                }
                var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + this.width + '" height="' + this.height + '"/>';
                $img.css('background-image', 'url('+ $img.attr('src') +')');
                $img.css('cursor', 'crosshair');
                image_zooming_id = $img.attr('src').split('/').pop().split('.')[0];
                $img.attr('id', image_zooming_id);
                $img.attr('src', 'data:image/svg+xml;base64,'+btoa(svg));
                backgroundReposition(e, this);
            }else{
                $img.trigger('mouseout');
            }
        }  
    });
    $content.on('mousemove', 'img', function (e) {
        if(this.getAttribute('src').indexOf('data:image/svg+xml;base64') !== -1){
            backgroundReposition(e, this);
        }
    });
    $content.on('mouseout', 'img', function (e) {
        var $img = $(this);
        if($img.attr('src').indexOf('data:image/svg+xml;base64') !== -1){
            image_zooming_id = '';
            $img.attr( 'src', $img.css('background-image').replace(/url\(("|')(.+)("|')\)/gi, '$2') );
            $img.removeAttr('id').removeAttr('style');
            if($content.attr('editable') === '1') {
                $content.data('editor').enable();
            }
        }
    });

}

//---------------------------------------------------------------------------------------//
//------------обработчики событий в редактируемых для пользователя сообщениях------------//
//---------------------------------------------------------------------------------------//

//обработчики для редактируемых сообщений
function attach_editablemessage_events_handlers(tm_id) {
    var $updated = $('#tm_updated_' + tm_id),
        $content = $('#m_content_' + tm_id),
        $files = $('#m_files_' + tm_id),
        $drop_zone = $('#tm_dropzone_' + tm_id),
        $clip = $drop_zone.find('#clip');

    //редактор Quill from https://quilljs.com
    var toolbar_options = [
        'bold', 'italic', 'underline', 'strike', { 'size': [] }, { 'color': [] }, { 'background': [] }, 'blockquote', 'code-block', 'link', { 'list': 'ordered' }, { 'list': 'bullet' }, 'clean'
    ];
    var editor_options = {
        placeholder: tfu_js['type_your_text'],
        theme: 'bubble',
        modules: {
            toolbar: toolbar_options
        },
    };

    var editor = new Quill('#m_content_' + tm_id, editor_options);
    $content.data("editor", editor);

    editor.on('text-change', function () {

        $updated.addClass('pending');
        $content.attr("modified", 1);

        //если это первое сообщение обновляем заголовок задачи
        if (Number($content.attr('starter_message')) === 1) {
            var title = editor.getText(0, 41);
            var nl_pos = title.indexOf('\n');
            if (nl_pos > 0) {
                title = title.substring(0, nl_pos);
            }
            if (title.length > 40) {
                title = title.substring(0, 40) + '..';
            }
            //устанавливаем название
            $('#t_title').text(title);
            document.title = '#' + $('#t_id').text() + "  " + title;
        }

        //если изменилась высота содержимого обновляем sticky_kit
        if ($content.height() != $content.attr("data-height")) {
            $content.attr("data-height", $content.height());
            UpdateStickyBlocks(1, $('#tm_wrap_' + tm_id).find('.message-meta').get(0));
            $(document.body).trigger("sticky_kit:recalc");
        }

        try{
            window.abtasks_event.description = { 'tm_id': $content.attr("tm_id") };
            socket.emit('typing', window.abtasks_event);
        }catch(error){}

    });

    //обработчики событий в редакторе
    $(editor.root).bind({

        //вставка изображения из буфера обмена
        paste: function (e) {

            if (isFilePaste(e.originalEvent)) {
                e.preventDefault();
                e.stopPropagation();

                var item = e.originalEvent.clipboardData.items[0];
                var blob = item.getAsFile();

                if (item.kind === "file" && item.type === "image/png" && blob !== null) {

                    $updated.addClass('pending');
                    $content.attr('waiting', Number($content.attr('waiting')) + 1);
                    paste_index = editor.getSelection(true).index;
                    editor.insertEmbed(paste_index, 'image', 'img/ajax-loader.gif', 'silent');

                    //загружаем картинку в S3
                    var guid = GetGUID();
                    var key = SYSNAME + '/tasks/' + $('#t_id').text() + '/' + tm_id + '/embedded/' + guid + '.png';
                    var params = {
                        file: blob,
                        content_type: "image/png",
                        content_disposition: guid + '.png',
                        key: key,
                        policy: $('#tm_wrap_' + tm_id + '>.content-wrap>.s3-policy').text(),
                        signature: $('#tm_wrap_' + tm_id + '>.content-wrap>.s3-signature').text()
                    };

                    s3Uploader(params).then(
                        function (key) {

                            var delta = { ops: [] };
                            if(paste_index){
                                delta.ops.push({ "retain": paste_index });
                            }
                            delta.ops.push( { "delete": 1 } );
                            delta.ops.push( { "insert": { "image": AWS_CDN_ENDPOINT + key } } );
                            editor.updateContents(delta, 'silent');

                            $(editor.root).find("img[src$='" + AWS_CDN_ENDPOINT + key + "']").one('load', function () {
                                $content.attr('waiting', Number($content.attr('waiting')) - 1);
                                delta.ops = [];
                                if(paste_index){
                                    delta.ops.push({ "retain": paste_index });
                                }
                                delta.ops.push( { "retain": 1, attributes: { width: this.naturalWidth, height: this.naturalHeight } } );
                                editor.updateContents(delta, 'user');
                            });

                        },
                        function (error) { console.log(error); }
                    );

                }

            }

        },

        //вставка файлов путем перетаскивания
        dragover: function (e) {
            if ($("html").hasClass("ie")) {
                e.preventDefault();
            }
        },
        drop: function (e) {

            if ($content.attr('moving') !== '1') {
                e.preventDefault();
                e.stopPropagation();

                var uploaders = new Array(),
                    non_image_files = new Array();

                //прицеливаемся
                var drop_range = RangeFromPoint(e.originalEvent.clientX, e.originalEvent.clientY),
                    drop_blot = Parchment.find(drop_range.startContainer),
                    drop_offset = drop_blot.offset(editor.scroll) + drop_range.startOffset;

                //разбираем файлы
                var files = e.originalEvent.dataTransfer.files;
                for (var i = 0, f; f = files[i]; i++) {
                    //вставляем в сообщение только картинки, остальные файлы загрузим, как приложения
                    if (!f.type.match('image.*')) {
                        non_image_files.push(f);
                        continue;
                    }

                    $updated.addClass('pending');
                    $content.attr('waiting', Number($content.attr('waiting')) + 1);
                    editor.insertEmbed(drop_offset, 'image', 'img/ajax-loader.gif', 'silent');

                    //загружаем картинку в S3 и добавляем promise в массив uploaders
                    var guid = GetGUID();
                    var key = SYSNAME + '/tasks/' + $('#t_id').text() + '/' + tm_id + '/embedded/' + guid + '.png';
                    var params = {
                        file: f,
                        content_type: f.type,
                        content_disposition: f.name,
                        key: key,
                        policy: $('#tm_wrap_' + tm_id + '>.content-wrap>.s3-policy').text(),
                        signature: $('#tm_wrap_' + tm_id + '>.content-wrap>.s3-signature').text()
                    };
                    uploaders.push(s3Uploader(params));
                }

                //по завершении загрузки всех картинок проставляем картинкам src и сохраняем сообщение
                Promise.all(uploaders).then(
                    function (keys) {
                        var img_load = 0,
                            delta = { ops: [] };
                        keys.forEach(function (key, i, keys) {
                            var retain = drop_offset + i;

                            delta.ops = [];
                            if(retain){
                                delta.ops.push({ "retain": retain });
                            }
                            delta.ops.push( { "delete": 1 } );
                            delta.ops.push( { "insert": { "image": AWS_CDN_ENDPOINT + key } } );
                            editor.updateContents(delta, 'silent');

                            $(editor.root).find("img[src$='" + AWS_CDN_ENDPOINT + key + "']").one('load', function () {
                                img_load++;
                                if (img_load === keys.length) {
                                    $content.attr('waiting', Number($content.attr('waiting')) - keys.length);
                                }

                                delta.ops = [];
                                if(retain){
                                    delta.ops.push({ "retain": retain });
                                }
                                delta.ops.push( { "retain": 1, attributes: { width: this.naturalWidth, height: this.naturalHeight } } );
                                editor.updateContents(delta, 'user');
                            });
                        });
                    },
                    function (error) { console.log(error); }
                );

                //загрузить прочие файлы, как приложения
                if(non_image_files.length > 0){
                    $drop_zone.data('files', non_image_files).trigger('drop');                    
                }

            }

        }

    });

    //перемещение изображений
    $(editor.root).on('dragstart', 'img', function (e) {
        $content.attr('moving', 1);
    });
    $(editor.root).on('dragend', 'img', function (e) {
        $content.attr('moving', 0);
    });

    //click по изображению
    $(editor.root).on('mousedown', 'img', function (e) {
        if(e.which === 1){
            CaretBeforeElement(this);
        }
    });

    jQuery.fn.scrollComplete = function (fn, ms) {
        var timer = null;
        this.scroll(function () {
            if (timer) { clearTimeout(timer); }
            timer = setTimeout(fn, ms);
        });
    }

    //загрузка файлов-приложений
    $clip.bind({
        click: function (e) {
            e.stopPropagation();
        },
        change: function (e) {
            e.preventDefault();
            e.stopPropagation();
            $drop_zone.data('files', this.files).trigger('drop');
            return false;
        }
    });    
    $drop_zone.bind({
        click: function (e) {
            e.preventDefault();
            e.stopPropagation();
            $(this).find('#clip').trigger('click');
            return false;
        },
        dragenter: function (e) {
            e.preventDefault();
            e.stopPropagation();
            $(this).addClass('highlighted');
            return false;
        },
        dragover: function (e) {
            e.preventDefault();
            e.stopPropagation();
            $(this).addClass('highlighted');
            return false;
        },
        dragleave: function (e) {
            $(this).removeClass('highlighted');
            return false;
        },
        drop: function (e) {
            e.preventDefault();
            e.stopPropagation();

            var files = ( $(this).data('files') ? $(this).data('files') : e.originalEvent.dataTransfer.files );
            $(this).removeData('files');
            $(this).removeClass('highlighted');

            var uploaders = new Array();
            $.each(files, function (i, file) {

                var guid = GetGUID(),
                    key = SYSNAME + '/tasks/' + $('#t_id').text() + '/' + tm_id + '/' + guid;

                var fname = '<td class="file-name">' + file.name + '</td>',
                    fsize = '<td class="file-size">(' + GetSize(file['size']) + ')</td>',
                    progress = '<td class="file-progress"><div class="progress"><div class="progress-bar" style="width: 0%;"></div></div></td>',
                    remove_button = '<td class="remove-button"><span class="glyphicon glyphicon-remove abort" aria-label="Del"></span></td>';

                var $li = $('<li>').append('<table class="li-file"><tr>' + fname + fsize + progress + remove_button + '</tr></table>');

                $files.append($li);
                $files.attr('waiting', Number($files.attr('waiting')) + 1);
                $updated.addClass('pending');

                var params = {
                    file: file,
                    content_type: 'application/octet-stream',
                    content_disposition: file.name,
                    key: key,
                    policy: $('#tm_wrap_' + tm_id + '>.content-wrap>.s3-policy').text(),
                    signature: $('#tm_wrap_' + tm_id + '>.content-wrap>.s3-signature').text(),
                    onprogress: function (percents) {
                        $li.find('.progress-bar').css('width', percents + '%');
                    }
                };

                var uploader = s3Uploader(params);
                uploaders.push(
                    uploader.then(
                        function (key) {

                            if (key === 'abort') {
                                return Promise.resolve("abort");
                            }

                            $li.find('td.file-name').html('<a href="' + AWS_CDN_ENDPOINT + key + '">' + file.name + '</a>');
                            $li.find('span.abort').removeClass('abort').addClass('remove');
                            $updated.html(tfu_js['saving']);

                            return updateMessageFiles(tm_id).done(function (data) {

                                if (data.error){
                                    ShowAlert('danger', data.error in tfu_js ? tfu_js[data.error] : data.error);
                                } else {
                                    task = data;
                                    UpdateTaskUI(task);

                                    $li.find('td.file-progress').html('&nbsp;');
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

                            });

                        },
                        function (Error) { console.log(Error); }
                    )
                );

                $li.find('span.abort').on('click', function () {
                    uploader.abort();
                    $(this).closest('li').fadeOut('slow', function () {
                        $(this).remove();
                    });
                });

            });

            Promise.all(uploaders).then(
                function (data) {
                    $files.attr('waiting', Number($files.attr('waiting')) - uploaders.length);
                    if ($content.attr('modified') === '0' && $content.attr('waiting') === '0' && $files.attr('waiting') === '0') {
                        $updated.removeClass('pending');
                    }
                },
                function (error) { console.log(error); }
            );

            return false;
        }
    });

    //удаление приложенных файлов
    $files.on('click', 'span.remove', function () {
        var $li = $(this).closest('li'),
            $a = $li.find('td.file-name a'),
            href = $a.attr('href');

        $a.replaceWith($a.text());
        $(this).replaceWith('<img src="img/ajax-loader.gif" style="margin: -5px -1px 0px 0px;">');
        $files.attr('waiting', Number($files.attr('waiting')) + 1);
        $updated.html(tfu_js['saving']).addClass('pending');

        $.when(
            updateMessageFiles(tm_id),
            $.ajax({
                method: 'POST',
                url: 'ajax_delete_file.php',
                data: { href: href },
                dataType: 'json'
            })            
        ).done(function (data1, data2) {

            if (data1[0].error){
                ShowAlert('danger', data1[0].error in tfu_js ? tfu_js[data1[0].error] : data1[0].error);
            } else {
                task = data1[0];
                UpdateTaskUI(task);

                $li.fadeOut('slow', function () {
                    $(this).remove();
                });
                $files.attr('waiting', Number($files.attr('waiting')) - 1);

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

            if (data2[0].error){
                ShowAlert('danger', data2[0].error in tfu_js ? tfu_js[data2[0].error] : data2[0].error);
            }

        });
    });

    //удаление сообщений
    $drop_zone.on('click', 'span.glyphicon-trash', function (e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).replaceWith(HTML_yesno);
    });
    $drop_zone.on('click', 'a.confirm-no', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var HTML_trash = '<span class="glyphicon glyphicon-trash" aria-label="Del"></span>';
        $(this).closest('span').replaceWith(HTML_trash);
    });
    $drop_zone.on('click', 'a.confirm-yes', function (e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).closest('span').replaceWith('<img src="img/ajax-loader.gif">');
        $.post("ajax_delete_message.php", { t_id: $('#t_id').text(), tm_id: tm_id })
            .done(function (data) {
                if (data == 'success') {
                    $('#tm_wrap_' + tm_id).fadeOut('slow', function () {
                        $(this).remove();
                    });
                    
                    try{
                        window.abtasks_event.description = { 'tm_id': tm_id };
                        socket.emit('deleted', window.abtasks_event);
                    }catch(error){}
                }
            });
    });

}