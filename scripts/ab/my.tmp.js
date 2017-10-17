var Parchment = Quill.import('parchment');
var Delta = Quill.import('delta');

//из буфера обмена вставляется файл?
function isFilePaste(event) {
	return event &&
		event.clipboardData &&
		event.clipboardData.items &&
		$.inArray('Files', event.clipboardData.types) > -1;
}

// s3 file uploader
// Returns Promise(key) with abort() method.
function s3Uploader(params, onprogress) {
	//console.log(params);
	
	if (params.ContentDisposition) {
		params.ContentDisposition = "attachment; filename*=UTF-8''" + encodeRFC5987ValueChars(params.ContentDisposition);
	}
	
	var request = createObjectS3Params(params);
	request.on('httpUploadProgress', function (progress, response) {
		var progressPercents = progress.loaded * 100.0/ progress.total;
		
		if (onprogress instanceof Function) {
			//onprogress.call(this, Math.round(progressPercents));
			onprogress.call(this, progressPercents);
		}		
	});

	var reqPromise = request.promise();

	var promise = new Promise( function (resolve, reject) {
		reqPromise.then(
			function (data) {
				resolve(params.Key);
			},
			function (err) {
				reject(err);
			}
		);
	});

	promise.abort = function () {
		request.abort();
		console.log('Upload aborted');
	};
	
	return promise;
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
			$(id).html(new TextDecoder('utf-8').decode(data.Body));
		},
		function(err) {
			if (err.name === 'NoSuchKey') {
				$(id).html('');
			} else {
				onError(err);
			}
		}
	);
}

// Saves editor's (#id) content
// guid is stored as editor's attribute
function saveDocument(id) {
	var params = {
		Key: USERID + '/' + $(id).attr('guid') + '/index.html',
		Body: $(id + ' >.ql-editor').html(),
		ACL: 'public-read'
	};
	
	return s3Uploader(params);
}

// returns {n: "name", e: ".ext"}
function splitNameAndExtension(fileName) {
	console.log(fileName);
	var s = fileName.split('.');
	
	if (s.length > 1) {
		return {
			e: '.' + s.pop(), // removes extension from s
			n: s.join('.') // joins the rest of s
		};
	} else {
		return {
			n: s[0],
			e: ''
		};
	};
}

// Returns HTML for file attachment
function genFileHTML(key, iconURL, fileName, fileSize, finished) {
	var x = splitNameAndExtension(fileName);
	console.log(x);
	var ficon = '<img class="file-icon" src="' + iconURL + '"></img>',
		fname = '<div class="file-name">' +
				(finished ? 
					'<a class="fn" href="' + AWS_CDN_ENDPOINT + key + '">' + x.n + '</a>' +
					'<a class="fe" href="' + AWS_CDN_ENDPOINT + key + '">' + x.e + '</a>'
					:
					'<span class="fn">' + x.n + '</span>' +
					'<span class="fe">' + x.e + '</span>'
				) +
				'</div>',
		fsize = '<div class="file-size">' + GetSize(fileSize) + '</div>',
		progress = finished ? '' : '<div class="progress"><div class="progress-bar" style="width: 0%;">' + GetSize(fileSize) + '</div></div>',
		remove_button = '<div class="cross" aria-label="Del" style="display: none;"></div>';
	
	return $('<li s3key="' + key + '" data-size="' + fileSize + '">').append(ficon + fname + (finished ? fsize : progress) + remove_button);
}

function mimeTypeToIconURL(type) {
	if (typeof type === 'string') {
		if (type.match('image.*')) {
			return '/img/icons/photo.svg';
		}
		if (type.match('audio.*')) {
			return '/img/icons/music.svg';
		}
		if (type.match('video.*')) {
			return '/img/icons/video.svg';
		}
	}
	return '/img/icons/file-attachment.svg';
}

// mimeTypeByExtension is used only to detect audio, image and video.
// It doesn't know about other types.
// It returns type if it knows specified ext
// And returns undefined otherwise
function mimeTypeByExtension(ext) {
	// Extenstion to MIME type
	var em = {
		"adp": "audio/adpcm",
		"au": "audio/basic",
		"mid": "audio/midi",
		"mp4a": "audio/mp4",
		"mpga": "audio/mpeg",
		"mp3": "audio/mpeg",
		"oga": "audio/ogg",
		"uva": "audio/vnd.dece.audio",
		"eol": "audio/vnd.digital-winds",
		"dra": "audio/vnd.dra",
		"dts": "audio/vnd.dts",
		"dtshd": "audio/vnd.dts.hd",
		"lvp": "audio/vnd.lucent.voice",
		"pya": "audio/vnd.ms-playready.media.pya",
		"ecelp4800": "audio/vnd.nuera.ecelp4800",
		"ecelp7470": "audio/vnd.nuera.ecelp7470",
		"ecelp9600": "audio/vnd.nuera.ecelp9600",
		"rip": "audio/vnd.rip",
		"weba": "audio/webm",
		"aac": "audio/x-aac",
		"aif": "audio/x-aiff",
		"m3u": "audio/x-mpegurl",
		"wax": "audio/x-ms-wax",
		"wma": "audio/x-ms-wma",
		"ram": "audio/x-pn-realaudio",
		"rmp": "audio/x-pn-realaudio-plugin",
		"wav": "audio/x-wav",
		"bmp": "image/bmp",
		"cgm": "image/cgm",
		"g3": "image/g3fax",
		"gif": "image/gif",
		"ief": "image/ief",
		"jpe": "image/x-citrix-jpeg",
		"jpeg": "image/x-citrix-jpeg",
		"jpg": "image/x-citrix-jpeg",
		"ktx": "image/ktx",
		"pjpeg": "image/pjpeg",
		"png": "image/x-png",
		"btif": "image/prs.btif",
		"svg": "image/svg+xml",
		"tiff": "image/tiff",
		"psd": "image/vnd.adobe.photoshop",
		"uvi": "image/vnd.dece.graphic",
		"djvu": "image/vnd.djvu",
		"sub": "image/vnd.dvb.subtitle",
		"dwg": "image/vnd.dwg",
		"dxf": "image/vnd.dxf",
		"fbs": "image/vnd.fastbidsheet",
		"fpx": "image/vnd.fpx",
		"fst": "image/vnd.fst",
		"mmr": "image/vnd.fujixerox.edmics-mmr",
		"rlc": "image/vnd.fujixerox.edmics-rlc",
		"mdi": "image/vnd.ms-modi",
		"npx": "image/vnd.net-fpx",
		"wbmp": "image/vnd.wap.wbmp",
		"xif": "image/vnd.xiff",
		"webp": "image/webp",
		"ras": "image/x-cmu-raster",
		"cmx": "image/x-cmx",
		"fh": "image/x-freehand",
		"ico": "image/x-icon",
		"pcx": "image/x-pcx",
		"pic": "image/x-pict",
		"pnm": "image/x-portable-anymap",
		"pbm": "image/x-portable-bitmap",
		"pgm": "image/x-portable-graymap",
		"ppm": "image/x-portable-pixmap",
		"rgb": "image/x-rgb",
		"xbm": "image/x-xbitmap",
		"xpm": "image/x-xpixmap",
		"xwd": "image/x-xwindowdump",
		"3gp": "video/3gpp",
		"3g2": "video/3gpp2",
		"h261": "video/h261",
		"h263": "video/h263",
		"h264": "video/h264",
		"jpgv": "video/jpeg",
		"jpm": "video/jpm",
		"mj2": "video/mj2",
		"mp4": "video/mp4",
		"mpeg": "video/mpeg",
		"ogv": "video/ogg",
		"ogg": "video/ogg",
		"qt": "video/quicktime",
		"uvh": "video/vnd.dece.hd",
		"uvm": "video/vnd.dece.mobile",
		"uvp": "video/vnd.dece.pd",
		"uvs": "video/vnd.dece.sd",
		"uvv": "video/vnd.dece.video",
		"fvt": "video/vnd.fvt",
		"mxu": "video/vnd.mpegurl",
		"pyv": "video/vnd.ms-playready.media.pyv",
		"uvu": "video/vnd.uvvu.mp4",
		"viv": "video/vnd.vivo",
		"webm": "video/webm",
		"f4v": "video/x-f4v",
		"fli": "video/x-fli",
		"flv": "video/x-flv",
		"m4v": "video/x-m4v",
		"asf": "video/x-ms-asf",
		"wm": "video/x-ms-wm",
		"wmv": "video/x-ms-wmv",
		"wmx": "video/x-ms-wmx",
		"wvx": "video/x-ms-wvx",
		"avi": "video/x-msvideo",
		"movie": "video/x-sgi-movie"
	};
	
	// it can return undefined
	return em[ext];
}

// Init editor and all it's stuff in #id
function initQuill(id, guid, ownerid, readOnly) {
	/*var $updated = $('#tm_updated_' + tm_id),
		$content = $(id),
		$files = $('#m_files_' + tm_id),
		$drop_zone = $('#tm_dropzone_' + tm_id),
		$clip = $drop_zone.find('#clip');*/
	
	// if editor exists, save it's contents before loading new
	if ($('#editor').attr('modified') !== 0) {
		if (USERID === $('#editor').attr('ownerid')) {
			console.log('new editor. save old document.', USERID, TREE_USERID);
			//alert('saving ' + $('#editor').attr('guid') + ', owned by ' + $('#editor').attr('ownerid'));
			saveDocument('#editor');
		}
	}
	
	// unbind all events from dropzone
	$('#dropzone-wrap').find('*').unbind();
	
	$('#editor').attr('ownerid', ownerid);
	
	var $content = $('#editor'),
		$drop_zone = $('#dropzone'),
		$clip = $drop_zone.find('#clip'),
		$files = $('#files'),
		$updated = $('#updated');
		
	$files.html('');
	$drop_zone.removeClass('highlighted').removeClass('used');
	
	listS3Files(TREE_USERID + '/' + guid + '/attachments/')
		.then( function(files) {
			// if we have files, show dropzone, hide it otherwise
			if (files.length > 0) {
				$drop_zone.addClass('used');
			} else {
				$drop_zone.removeClass('used');
			}
			
			files.forEach( function(f) {
				var params = {
					Bucket: STORAGE_BUCKET,
					Key: f.Key
				};
				s3.headObject(params, function(err, data) {
					if (err) {
						onError(err);
						return;
					}
					
					console.log(f);
					var cd = decodeURIComponent(data.ContentDisposition.substring(29));
					var mime = mimeTypeByExtension(/(?:\.([^.]+))?$/.exec(cd)[1]);
					var $li = genFileHTML(f.Key, mimeTypeToIconURL(mime), cd, f.Size, true);
					$files.append($li);			
				});				
			});
		})
		.catch( function(err) {
			onError(err);
		});
	
	loadDocument(TREE_USERID + '/' + guid + '/index.html', '#editor')
		.then(function(data) {
				
			//$updated.html(_translatorData['saved'][LANG]);
			$updated.hide();
			
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
			if (readOnly) {
				editor_options.readOnly = readOnly;
			}

			var editor = new Quill('#editor', editor_options);
			$content.data('editor', editor);
			$content.attr('guid', guid);

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
				if (readOnly) {
					return;
				}
				$content.attr("modified", 1);
				$updated.html(_translatorData['edited'][LANG]);
				$updated.addClass('pending');
			});
			
			console.log(editor);
			
			// unbind old
			$('#document').unbind('drop');
			$('#document').unbind('dragover');
			$('#document').unbind('dragenter');
			$('#document').unbind('dragleave');
			// $(editor.root) is small. Let #document handle drop events too.
			$('#document').bind({
				drop: function(e) {
					$(editor.root).trigger(e);
				},
				dragover: function (e) {
					$(editor.root).trigger(e);
				},
				dragenter: function (e) {
					$(editor.root).trigger(e);
				},
				dragleave: function (e) {
					$(editor.root).trigger(e);
				}
			});
			
			//обработчики событий в редакторе
			$(editor.root).bind({
				//вставка изображения из буфера обмена
				paste: function (e) {
					if (readOnly) {
						return;
					}
					
					if (isFilePaste(e.originalEvent)) {
						e.preventDefault();
						e.stopPropagation();

						var item = e.originalEvent.clipboardData.items[0];
						var blob = item.getAsFile();
						console.log('paste', item);
						if (item.kind === "file" && item.type === "image/png" && blob !== null) {
							// exit if we don't have enough space
							if (!canUpload(blob.size)) {
								console.log('No space left', blob);
								return;
							}

							$updated.addClass('pending');
							$updated.show();
							$content.attr('waiting', Number($content.attr('waiting')) + 1);
							paste_index = editor.getSelection(true).index;
							editor.insertEmbed(paste_index, 'image', 'img/ajax-loader.gif', 'silent');

							//загружаем картинку в S3
							var picGUID = GetGUID();
							var key = USERID + '/' + guid + '/' + picGUID + '.png';
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
									
									updateUsedSpaceDelta(blob.size);
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
					if (readOnly) {
						return;
					}
					
					if ($("html").hasClass("ie")) {
						e.preventDefault();
					}
					
					$drop_zone.addClass('highlighted');
				},
				dragenter: function (e) {
					if (readOnly) {
						return;
					}
					
					if ($("html").hasClass("ie")) {
						e.preventDefault();
					}
					
					$drop_zone.addClass('highlighted');
				},
				dragleave: function (e) {
					if (readOnly) {
						return;
					}
					
					if ($("html").hasClass("ie")) {
						e.preventDefault();
					}
					
					$drop_zone.removeClass('highlighted');
				},
				drop: function (e) {
					console.log('editor.root.drop');
					if (readOnly) {
						return;
					}
					
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
							
							var _f = f; // f changes on each iteration
							console.log(_f);
							
							var readFilePromise = new Promise ( function(resolve, reject) {
								var fr = new FileReader();
									fr.onload = function(event) {
										resolve(event.target.result);
									};
									fr.onerror = reject;
									fr.readAsArrayBuffer(_f);
							});
							
							//загружаем картинку в S3 и добавляем promise в массив uploaders
							var _blob; // кривой код
							var uploader = readFilePromise
								.then( function(blob) {
									if (!canUpload(blob.byteLength)) {
										console.log('No space left', blob);
										onWarning(_translatorData['noSpace'][LANG]);
										return Promise.reject('No space left');
									}
									
									$updated.addClass('pending');
									$updated.show();
									$content.attr('waiting', Number($content.attr('waiting')) + 1);
									editor.insertEmbed(drop_offset, 'image', 'img/ajax-loader.gif', 'silent');
									
									_blob = blob;
									return s3Uploader({
										Body: blob,
										ContentType: _f.type,
										ContentDisposition: _f.name,
										Key: ownerid + '/' + guid + '/' + GetGUID(),
										ACL: 'public-read'										
									})
								})
								.then( function(key) {
									updateUsedSpaceDelta(_blob.byteLength);
									return Promise.resolve(key);									
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
							console.log('non_image_files drop');
							$drop_zone.data('files', non_image_files).trigger('drop');                    
						}
					}
				}
			});
					
			//перемещение изображений
			$(editor.root).on('dragstart', 'img', function (e) {
				if (readOnly) {
					return;
				}
				$content.attr('moving', 1);
			});
			$(editor.root).on('dragend', 'img', function (e) {
				if (readOnly) {
					return;
				}
				$content.attr('moving', 0);
			});

			//click по изображению
			$(editor.root).on('mousedown', 'img', function (e) {
				if (readOnly) {
					return;
				}
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
					console.log('clip click');
					if (readOnly) {
						return;
					}
					e.stopPropagation();
				},
				change: function (e) {
					console.log('clip change');
					if (readOnly) {
						return;
					}
					e.preventDefault();
					e.stopPropagation();
					$drop_zone.data('files', this.files).trigger('drop');
					return false;
				}
			});    
			$('div.clip').bind({
				click: function (e) {
					
					$clip.trigger('click');
				}
			});
			$drop_zone.bind({
				dragenter: function (e) {
					if (readOnly) {
						return;
					}
					e.preventDefault();
					e.stopPropagation();
					$(this).addClass('highlighted');
					return false;
				},
				dragover: function (e) {
					if (readOnly) {
						return;
					}
					e.preventDefault();
					e.stopPropagation();
					$(this).addClass('highlighted');
					return false;
				},
				dragleave: function (e) {
					if (readOnly) {
						return;
					}
					$(this).removeClass('highlighted');
					return false;
				},
				drop: function (e) {
					console.log('dropzone.drop');
					if (readOnly) {
						return;
					}
					e.preventDefault();
					e.stopPropagation();

					var files = ( $drop_zone.data('files') ? $drop_zone.data('files') : e.originalEvent.dataTransfer.files );
					$drop_zone.removeData('files');
					$drop_zone.removeClass('highlighted');
					$drop_zone.addClass('used');

					var uploaders = new Array();
					$.each(files, function (i, file) {
						var fileGUID = GetGUID();
						var key = USERID + '/' + guid + '/attachments/' + fileGUID;	

						var $li = genFileHTML(key, mimeTypeToIconURL(file.type), file.name, file.size);

						$files.append($li);
						$files.attr('waiting', Number($files.attr('waiting')) + 1);
						$updated.addClass('pending');
						$updated.show();

						var readFilePromise = new Promise ( function(resolve, reject) {
							var fr = new FileReader();
							fr.onload = function(event) {
								resolve(event.target.result);
							};
							fr.onerror = reject;
							fr.readAsArrayBuffer(file);
						});
						
						//нужен promise, который вернёт key.
						var uploaderPromise;
						// TODO: rewrite to promise chain
						var uploader = new Promise ( function(resolve, reject) {
							readFilePromise.then(
								function(blob) {						
									var params = {
										Body: blob,
										ContentType: file.type,
										ContentDisposition: file.name,
										Key: key,
										ACL: 'public-read'
									};
									
									var oldPercents = 0;
									uploaderPromise = s3Uploader(params, function (percents) {
										//console.log(oldPercents, ' ->', percents);
										if (percents > oldPercents) {
											//console.log('updating progress bar..');
											$li.find('.progress-bar').css('width', percents + '%');
											oldPercents = percents;
										}
									})
									
									uploaderPromise.then(
										function(key) {
											updateUsedSpaceDelta(blob.byteLength);
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
						uploader.abort = function () {
							uploaderPromise.abort();
						}
						
						uploaders.push(
							uploader.then(
								function (key) {
									if (key === 'abort') {
										return Promise.resolve("abort");
									}

									// replace it with finished version
									$li.replaceWith(genFileHTML(key, mimeTypeToIconURL(file.type), file.name, file.size, true));
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
			
			//test
			$files.on('click', function () {
				console.log('test');
			});

			//удаление приложенных файлов
			$files.on('click', 'div.cross', function () {
				if (readOnly) {
					return;
				}
				
				var $li = $(this).closest('li');
				var key = $li.attr('s3key');
				var size = parseFloat($li.attr('data-size'));
				
				console.log('Removing ', key);
				
				$li.html('<div class="small-preloader"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>');
				$files.attr('waiting', Number($files.attr('waiting')) + 1);
				$updated.show().addClass('pending');

				// remove from s3
				s3.deleteObject({
					Bucket: STORAGE_BUCKET,
					Key: key
				}).promise()
				.then( function(data) {
					updateUsedSpaceDelta(-size);
				})
				.catch( function(err) {
					// TODO: couldn't delete file. Error message or something.
				});
				
				$li.fadeOut('slow', function () {
					// removing file from list!
					$(this).remove();
					// if no files in the list, hide dropzone
					if ($('#files li').length === 0) {
						$drop_zone.removeClass('used');
					}
				});
				$files.attr('waiting', Number($files.attr('waiting')) - 1);

				$updated.fadeOut('slow', function () {
					if ($content.attr('modified') === '0' && $content.attr('waiting') === '0' && $files.attr('waiting') === '0') {
						$(this).removeClass('pending');
					}
				});
			});
			
			//showing and hiding cross
			$('.files').on('mouseenter', 'li', function () {
				console.log('enter');
				$(this).find('div.cross').show();
			});
			$('.files').on('mouseleave', 'li', function () {
				console.log('leave');
				$(this).find('div.cross').hide();
			});
		},
		function (err) {
			throw err;
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
	if (bytes < 1024) { return bytes + ' b'; }
	else if (bytes < 1048576) { return (bytes / 1024).toFixed(2) + ' Kb'; }
	else if (bytes < 1073741824) { return (bytes / 1048576).toFixed(2) + ' Mb'; }
	else if (bytes < 1099511627776) { return (bytes / 1073741824).toFixed(2) + ' Gb'; }
	else { return (bytes / 1099511627776).toFixed(2) + ' Tb'; }
}

function encodeRFC5987ValueChars(str) {
	return encodeURIComponent(str).
		// Замечание: хотя RFC3986 резервирует "!", RFC5987 это не делает, так что нам не нужно избегать этого
		replace(/['()]/g, escape). // i.e., %27 %28 %29
		replace(/\*/g, '%2A').
		// Следующее не требуется для кодирования процентов для RFC5987, так что мы можем разрешить немного больше читаемости через провод: |`^
		replace(/%(?:7C|60|5E)/g, unescape);
}

