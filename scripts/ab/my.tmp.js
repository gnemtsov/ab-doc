//из буфера обмена вставляется файл?
function isFilePaste(event) {
    return event &&
        event.clipboardData &&
        event.clipboardData.items &&
        $.inArray('Files', event.clipboardData.types) > -1;
}

//s3 file uploader
function s3Uploader(params, onprogress) {
	console.log(params);
	
	var request = createObjectS3Params(params);
	request.httpUploadProgress = function (progress, response) {
		var progressPercents = progress.loaded * 100.0 / progress.total;
		
		if (onprogress instanceof Function) {
			onprogress.call(this, Math.round(progress));
		}		
	};

	var reqPromise = request.promise();

	return new Promise( function (resolve, reject) {
		reqPromise.then(
			function (data) {
				resolve(params.Key);
			},
			function (err) {
				reject(err);
			}
		);
	});

    /*var form = new FormData();
    form.append('AWSAccessKeyId', AWS_ACCESS_KEY);
    form.append('acl', 'public-read');
    form.append('key', params.key);
    form.append('Content-Type', params.content_type);
    form.append('Content-Disposition', "attachment; filename*=UTF-8''" + encodeRFC5987ValueChars(params.content_disposition));
    //form.append('policy', params.policy);
    //form.append('signature', params.signature);
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

    return promise;*/
}

// from core.js
function GetGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function encodeRFC5987ValueChars(str) {
    return encodeURIComponent(str).
        // Замечание: хотя RFC3986 резервирует "!", RFC5987 это не делает, так что нам не нужно избегать этого
        replace(/['()]/g, escape). // i.e., %27 %28 %29
        replace(/\*/g, '%2A').
        // Следующее не требуется для кодирования процентов для RFC5987, так что мы можем разрешить немного больше читаемости через провод: |`^
        replace(/%(?:7C|60|5E)/g, unescape);
}

// Create editor
function initQuill(id, docKey) {
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
        $content.attr("modified", 1);
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
				console.log('paste', item);
                if (item.kind === "file" && item.type === "image/png" && blob !== null) {

                    //$updated.addClass('pending');
                    $content.attr('waiting', Number($content.attr('waiting')) + 1);
                    paste_index = editor.getSelection(true).index;
                    editor.insertEmbed(paste_index, 'image', 'img/ajax-loader.gif', 'silent');

                    //загружаем картинку в S3
                    var guid = GetGUID();
                    var key = USERID + '/files/embedded/' + guid + '.png';
                    var params = {
                        Body: blob,
                        ContentType: "image/png",
                        ContentDisposition: guid + '.png',
                        Key: key
                        //ACL: 'public-read'
                        //policy: $('#tm_wrap_' + tm_id + '>.content-wrap>.s3-policy').text(),
                        //signature: $('#tm_wrap_' + tm_id + '>.content-wrap>.s3-signature').text()
                    };

					var onprogress = function(p) {
						console.log(p, '%');
					}

                    s3Uploader(params, onprogress).then(
                        function (key) {
							console.log(key);
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
                        function (error) { console.log(params, error); }
                    );

                }

            }

        }
	})
}



//document.ready
$(function () {
	//saving.. messages content every 3 seconds
    setInterval(function () {
        $('#editor').each(function (index, element) {
            $(element).attr('modified', 0);
        });
    }, 3000);
});
