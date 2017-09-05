var Parchment = Quill.import('parchment');
var Delta = Quill.import('delta');

//из буфера обмена вставляется файл?
function isFilePaste(event) {
    return event &&
        event.clipboardData &&
        event.clipboardData.items &&
        $.inArray('Files', event.clipboardData.types) > -1;
}

//s3 file uploader
function s3Uploader(params, onprogress) {
	//console.log(params);
	
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
}

//s3 file downloader
function s3Downloader(params, onprogress) {
	var request = getObjectS3Params(params);
	request.httpDownloadProgress = function (progress, response) {
		var progressPercents = progress.loaded * 100.0 / progress.total;
		
		if (onprogress instanceof Function) {
			onprogress.call(this, Math.round(progress));
		}		
	};

	return request.promise();
}

// Loads document with given path into editor with given id
function loadDocument(path, id) {
	var params = {
		Key: path
	};
	
	return s3Downloader(params).then(
		function(data) {
			console.log(data.Body);
			$(id).html(new TextDecoder('utf-8').decode(data.Body));
		},
		function(err) {
			console.log(err);
		}
	);
}

// Saves editor's (#id) content
// s3key is stored as editor's attribute
function saveDocument(id) {
	var params = {
		Key: $(id).attr('s3key'),
		Body: $(id + ' >.ql-editor').html()
	};
	
	return s3Uploader(params);
}

// Init editor and all it's stuff in #id
function initQuill(id, docKey) {
	/*var $updated = $('#tm_updated_' + tm_id),
        $content = $(id),
        $files = $('#m_files_' + tm_id),
        $drop_zone = $('#tm_dropzone_' + tm_id),
        $clip = $drop_zone.find('#clip');*/
    
    // if editor exists, save it's contents before loading new
    if ($('#editor').length > 0) {
		saveDocument('#editor');
	}
    
    // remove old editor
    $('#editor').remove();
    $('#files').remove();
    $('#dropzone').remove();
    // create new
    $(id).append('<div id="editor"></div> <div id="files" class="files"></div> <div id="dropzone" class="filedrag"></div>');
    
    loadDocument(docKey, '#editor')
		.then(function() {
			var $content = $('#editor'),
				$drop_zone = $('#dropzone');
			
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

			var editor = new Quill('#editor', editor_options);
			$content.data('editor', editor);
			$content.attr('s3key', docKey);

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
								function (error) {
									console.log(params, error);
								}
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
					console.log(e);
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
			})
		});
}

// from task.1.js
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

//document.ready
$(function () {
	//saving.. messages content every 3 seconds
    setInterval(function () {
        $('#editor[modified="1"]').each(function (index, element) {
			var $editor = $('#editor');
			
            $(element).attr('modified', 0);
            
            saveDocument('#editor');
        });
    }, 3000);
});
