//s3 file uploader
function s3Uploader(params) {

    var form = new FormData();
    form.append('AWSAccessKeyId', AWS_ACCESS_KEY);
    form.append('acl', 'public-read');
    form.append('key', params.key);
    form.append('Content-Type', params.content_type);
    form.append('Content-Disposition', "attachment; filename*=UTF-8''" + encodeRFC5987ValueChars(params.content_disposition));
    form.append('policy', params.policy);
    form.append('signature', params.signature);
    form.append('file', params.file);

    var request = new XMLHttpRequest();
    request.upload.addEventListener("progress", function (e) {
        if (e.lengthComputable) {
            var progress = (e.loaded * 100) / e.total;
            if (params.onprogress instanceof Function) {
                params.onprogress.call(this, Math.round(progress));
            }
        }
    }, false);

    var promise = new Promise(function (resolve, reject) {

        request.onload = function () {
            if (/^2[0-9].*$/.test(request.status)) {
                resolve(params.key);
            } else {
                reject(Error('File didn\'t load successfully! :( Error - ' + request.statusText));
            }
        };

        request.onerror = function () {
            reject(Error('There was a network error.'));
        };

        request.onabort = function () {
            resolve('abort');
        };

    });

    promise.abort = function () {
        request.abort();
    };

    request.open('POST', AWS_S3_ENDPOINT, true);
    request.send(form);

    return promise;
}

// from core.js
function encodeRFC5987ValueChars(str) {
    return encodeURIComponent(str).
        // Замечание: хотя RFC3986 резервирует "!", RFC5987 это не делает, так что нам не нужно избегать этого
        replace(/['()]/g, escape). // i.e., %27 %28 %29
        replace(/\*/g, '%2A').
        // Следующее не требуется для кодирования процентов для RFC5987, так что мы можем разрешить немного больше читаемости через провод: |`^
        replace(/%(?:7C|60|5E)/g, unescape);
}

// Create editor
function initQuill(id) {
	/*var $updated = $('#tm_updated_' + tm_id),
        $content = $(id),
        $files = $('#m_files_' + tm_id),
        $drop_zone = $('#tm_dropzone_' + tm_id),
        $clip = $drop_zone.find('#clip');*/
    var $content = $(id);
	
    //редактор Quill from https://quilljs.com
    var toolbar_options = [
        'bold', 'italic', 'underline', 'strike', { 'size': [] }, { 'color': [] }, { 'background': [] }, 'blockquote', 'code-block', 'link', { 'list': 'ordered' }, { 'list': 'bullet' }, 'clean'
    ];
    var editor_options = {
        placeholder: 'type_your_text', // make translation
        theme: 'bubble',
        modules: {
            toolbar: toolbar_options
        },
    };

    var editor = new Quill(id, editor_options);
    $content.data("editor", editor);

    editor.on('text-change', function () {

        //$updated.addClass('pending');
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
        // убрать всё со sticky
        /*if ($content.height() != $content.attr("data-height")) {
            $content.attr("data-height", $content.height());
            UpdateStickyBlocks(1, $('#tm_wrap_' + tm_id).find('.message-meta').get(0));
            $(document.body).trigger("sticky_kit:recalc");
        }*/

        try{
            window.abtasks_event.description = { 'tm_id': $content.attr("tm_id") };
            socket.emit('typing', window.abtasks_event);
        }catch(error){}

    });
}
