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
	
	if (params.ContentDisposition) {
		params.ContentDisposition = "attachment; filename*=UTF-8''" + encodeRFC5987ValueChars(params.ContentDisposition);
	}
	
	var request = createObjectS3Params(params);
	request.on('httpUploadProgress', function (progress, response) {
		var progressPercents = progress.loaded * 100.0/ progress.total;
		
		if (onprogress instanceof Function) {
			onprogress.call(this, Math.round(progressPercents));
		}		
	});

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
	request.on('httpDownloadProgress', function (progress, response) {
		var progressPercents = progress.loaded * 100.0/ progress.total;
		
		if (onprogress instanceof Function) {
			onprogress.call(this, Math.round(progressPercents));
		}	
	});

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
	$('#editor-wrap').remove();
	
	// create new
	$(id).append( // TODO: add translation
		'<div id="editor-wrap" class="content-wrap">\
			<div class="updated">\
				<span id="updated"></span>\
			</div>\
			<div id="editor" class="message-content" waiting="0" modified="0"></div>\
			<ul id="files" class="files" waiting="0"></ul>\
			<div id="dropzone" class="filedrag">\
				<div class="drop-files-here">\
					Приложите вложения сюда, рисунки можно помещать сразу в текст.\
					<input id="clip" name="clip" multiple="multiple" type="file>\
				</div>\
			</div>\
		</div>'
	);
	
	loadDocument(docKey, '#editor')
		.then(function(data) {
			var $content = $('#editor'),
				$drop_zone = $('#dropzone'),
				$clip = $drop_zone.find('#clip'),
				$files = $('#files'),
				$updated = $('#updated');
				
			$updated.html('Loaded'); // TODO: load updated time from data
			
			//редактор Quill from https://quilljs.com
			var toolbar_options = [
				'bold', 'italic', 'underline', 'strike', { 'size': [] }, { 'color': [] }, { 'background': [] }, 'blockquote', 'code-block', 'link', { 'list': 'ordered' }, { 'list': 'bullet' }, 'clean'
			];
			var editor_options = {
				placeholder: _translatorData['typeYourText'][LANG],
				theme: 'bubble',
				modules: {
					toolbar: toolbar_options
				},
			};

			var editor = new Quill('#editor', editor_options);
			$content.data('editor', editor);
			$content.attr('s3key', docKey);

			//лупа для больших изображений
			function backgroundReposition(e, image){
				var X = e.offsetX ? e.offsetX : e.pageX - image.offsetLeft,
					Y = e.offsetY ? e.offsetY : e.pageY - image.offsetTop;
				image.style['background-position-x'] = Math.round((X / image.width)*100) + '%';
				image.style['background-position-y'] = Math.round((Y / image.height)*100) + '%';        
			}
			$content.on('mouseup', 'img', function (e) {
				var $img = $(this);
				console.log('Test');
				console.log(e.which === 1, $img.attr('width') > $content.width(), $content.attr('modified') === '0', $content.attr('waiting') === '0');
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

			editor.on('text-change', function () {
				$content.attr("modified", 1);
				$updated.addClass('pending');
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

							$updated.addClass('pending');
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
								Key: key,
								ACL: 'public-read'
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
							
							var _f = f; // f changes on each iteration
							
							var readFilePromise = new Promise ( function(resolve, reject) {
								var fr = new FileReader();
									fr.onload = function(event) {
										resolve(event.target.result);
									};
									fr.onerror = reject;
									fr.readAsArrayBuffer(_f);
							});
							
							//загружаем картинку в S3 и добавляем promise в массив uploaders
							
							//нужен promise, который вернёт key.
							var uploader = new Promise ( function(resolve, reject) {
								readFilePromise.then(
									function(blob) {
										var guid = GetGUID(),
											key = USERID + '/files/embedded/' + guid + '.png';	
																	
										var params = {
											Body: blob,
											ContentType: _f.type,
											ContentDisposition: _f.name,
											Key: key,
											ACL: 'public-read'
										};
										
										s3Uploader(params).then(
											function(key) {
												resolve(key);
											},
											function(err) {
												reject(err);
											}
										);
									},
									function(err) {
										reject(err);
									}
								);
							});
							
							uploaders.push(uploader);
						}

						//по завершении загрузки всех картинок проставляем картинкам src и сохраняем сообщение <--- ? у меня не сохраняется
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
								// Я добавил, иначе непонятно, что заставляет его сохраняться.
								$content.attr("modified", 1);
							},
							function (error) { 
								console.log(error);
							}
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

						var fname = '<td class="file-name">' + file.name + '</td>',
							fsize = '<td class="file-size">(' + GetSize(file['size']) + ')</td>',
							progress = '<td class="file-progress"><div class="progress"><div class="progress-bar" style="width: 0%;"></div></div></td>',
							remove_button = '<td class="remove-button"><span class="glyphicon glyphicon-remove abort" aria-label="Del"></span></td>';

						var $li = $('<li>').append('<table class="li-file"><tr>' + fname + fsize + progress + remove_button + '</tr></table>');

						$files.append($li);
						$files.attr('waiting', Number($files.attr('waiting')) + 1);
						$updated.addClass('pending');

						var readFilePromise = new Promise ( function(resolve, reject) {
							var fr = new FileReader();
							fr.onload = function(event) {
								resolve(event.target.result);
							};
							fr.onerror = reject;
							fr.readAsArrayBuffer(file);
						});
						
						//нужен promise, который вернёт key.
						var uploader = new Promise ( function(resolve, reject) {
							readFilePromise.then(
								function(blob) {
									var guid = GetGUID(),
										key = USERID + '/files/' + guid;	
																
									var params = {
										Body: blob,
										ContentType: 'application/octet-stream',
										ContentDisposition: file.name,
										Key: key,
										ACL: 'public-read'
									};
									
									s3Uploader(params, function (percents) {
										var oldPercents = parseInt($li.find('.progress-bar').css('width'), 10)
										if (percents > oldPercents) {
											$li.find('.progress-bar').css('width', percents + '%');
										}
									}).then(
										function(key) {
											resolve(key);
										},
										function(err) {
											reject(err);
										}
									);
								},
								function(err) {
									reject(err);
								}
							);
						});
						
						uploaders.push(
							uploader.then(
								function (key) {
									if (key === 'abort') {
										return Promise.resolve("abort");
									}

									$li.find('td.file-name').html('<a href="' + AWS_CDN_ENDPOINT + key + '">' + file.name + '</a>');
									$li.find('span.abort').removeClass('abort').addClass('remove');
									$updated.html(_translatorData['saving'][LANG]);

									// Тут было updateMessageFiles для записи в БД
									// Мы не решили в БД буем хранить или в json-файле. 
									// Пока будет простообновление UI

									$li.find('td.file-progress').html('&nbsp;');
									$updated.fadeOut('slow', function () {
										if ($content.attr('modified') === '0' && $content.attr('waiting') === '0' && $files.attr('waiting') === '0') {
											$(this).removeClass('pending');
										}
										$(this).text("Update time").fadeIn('fast'); //TODO
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
				$updated.html(_translatorData['saving'][LANG]).addClass('pending');

				$li.fadeOut('slow', function () {
					$(this).remove();
				});
				$files.attr('waiting', Number($files.attr('waiting')) - 1);

				$updated.fadeOut('slow', function () {
					if ($content.attr('modified') === '0' && $content.attr('waiting') === '0' && $files.attr('waiting') === '0') {
						$(this).removeClass('pending');
					}
				});
			});
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

function GetSize(bytes) {
	if (bytes < 1024) { return bytes + ' b.'; }
	else if (bytes < 1048576) { return (bytes / 1024).toFixed(2) + ' Kb.'; }
	else if (bytes < 1073741824) { return (bytes / 1048576).toFixed(2) + ' Mb.'; }
	else if (bytes < 1099511627776) { return (bytes / 1073741824).toFixed(2) + ' Gb'; }
	else { return (bytes / 1099511627776).toFixed(2) + ' Tb.'; }
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
			var $editor = $('#editor'),
				$updated = $('#updated'),
				$files = $('#files');
			
			$updated.html(_translatorData['saving'][LANG]);
			$(element).attr('modified', 0);
			
			saveDocument('#editor').then(
				function (ok) {
				    $updated.fadeOut('slow', function () {
						console.log($editor.attr('modified') === '0', $editor.attr('waiting') === '0', $files.attr('waiting') === '0')
						if ($editor.attr('modified') === '0' && $editor.attr('waiting') === '0' && $files.attr('waiting') === '0') {
							$(this).removeClass('pending');
						}
						
						var updatedTime = "yesterday"; // TODO
						$(this).text(updatedTime).fadeIn('fast');
					});
				},
				function (err) {
					onError(err);
				}
			);
		});
	}, 3000);
});
