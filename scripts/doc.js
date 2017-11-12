/******************************************************************/
/*********************Document and attachments*********************/
/******************************************************************/

(function (global, $, Quill) {
	
	"use strict";

	// function creates object (calls abDoc.init - constructor)
	var abDoc = function (docGUID, ownerid, readOnly) {
		var params = {
			docGUID : docGUID,
			ownerid : ownerid,
			readOnly : readOnly,
			path: TREE_USERID + '/' + docGUID
		};
		return new abDoc.init(params);
	};

	var Parchment = Quill.import('parchment'),
		Delta = Quill.import('delta');

	var $doc_wrap = $('#document-wrap'),
		$content = $('#editor'),
		$drop_zone = $('#dropzone'),
		$clip = $drop_zone.find('#clip-input'),
		$files = $('#files'),
		$saving = $('#saving'),
		editor;

	var DOC_IMG_MOVING = false;

	// object prototype
	abDoc.prototype = {

		getFileHTML: function (key, iconURL, fileName, fileSize, modified, finished) {
			var x = {n:'', e: ''},
				s = fileName.split('.');

			if (s.length > 1) {
				x.e = '.' + s.pop(); // removes extension from s
				x.n = s.join('.'); // joins the rest of s
			} else {
				x.n = s[0];
				x.e = '';
			};

			var ficon = (finished ? '<a href="' + AWS_CDN_ENDPOINT + key + '">' : '') +
						'<img class="file-icon" src="' + iconURL + '"></img>' + 
						(finished ? '</a>' : '');
			var feLen = Math.min(x.e.length, 12);
			var	fname = '<div class="file-name">' +
						(finished ? '<a href="' + AWS_CDN_ENDPOINT + key + '">' : '') +
						'<span class="fn" style="max-width: calc(180px - ' + feLen + 'ch);">' + x.n + '</span>' +
						'<span class="fe" style="max-width: ' + feLen + 'ch;">' + x.e + '</span>' +
						(finished ? '</a>' : '') +
						'</div>';
			var	fmodified = (modified ?
					modified.getFullYear().toString().slice(2) + '-' + (modified.getMonth() + 1) + '-' + modified.getDate() + ' ' +
					modified.getHours().toString().padStart(2, '0') + ':' + modified.getMinutes().toString().padStart(2, '0') + ':' + modified.getSeconds().toString().padStart(2, '0')
						: 
					'');
			var	fbottom = '<div class="file-size">' + GetSize(fileSize) + '</div> ' + 
						'<div class="file-modified">' + fmodified + '</div>';
			var	progress = finished ? '' : '<div class="progress"><div class="progress-bar" style="width: 0%;">' + GetSize(fileSize) + '</div></div>';
			var	remove_button = '<div class="cross" aria-label="Del" style="display: none;"></div>';
			var	question = '<div class="file-question" style="display: none;">' +
							_translatorData['areYouSure'][LANG] + ' ' +
							'<a href="#" class="yes">' + _translatorData['yes'][LANG] + '</a> ' + 
							'<a href="#" class="no">' + _translatorData['no'][LANG] + '</a>' + 
							'</div>';
			return $('<li s3key="' + key + '" data-size="' + fileSize + '" data-modified="' + modified + '">').append(ficon + fname + (finished ? fbottom : progress) + remove_button + question);
		},

		/*=======================*/
		/*     editor handlers   */
		/*=======================*/
		attachEditorHandlers: function() {
			var self = this;
            var first = false,
				second = false;

			//editor drag & drop
		/*	$doc_wrap.on({
                dragenter: function (e) {
                    if (first) {
                        second = true;
                        return;
                    } else {
                        first = true;
						DOC_IMG_MOVING || $drop_zone.addClass('highlighted');
                    }
                },
                dragleave: function (e) {
                    if (second) {
                        second = false;
                    } else if (first) {
                        first = false;
                    }
                    if (!first && !second) {
						DOC_IMG_MOVING || $drop_zone.removeClass('highlighted');
					}
                },
                drop: function (e) {
                    if (second) {
                        second = false;
                    } else if (first) {
                        first = false;
                    }
                    if (!first && !second) {

						if (!DOC_IMG_MOVING) {
							e.preventDefault();
							e.stopPropagation();

							$drop_zone.removeClass('highlighted');
							
							var uploaders = new Array(),
								non_image_files = new Array();
	
							//aim
							var clientX = e.originalEvent.clientX,
								clientY = e.originalEvent.clientY;
	
							if (document.caretPositionFromPoint) { // standards-based way
								var pos = document.caretPositionFromPoint(clientX, clientY),
									drop_range = document.createRange();
								drop_range.setStart(pos.offsetNode, pos.offset);
								drop_range.collapse();							
							} else if (document.caretRangeFromPoint) { // WebKit way
								var drop_range = document.caretRangeFromPoint(clientX, clientY);							
							} else if (document.body.createTextRange) { // IE way
								var drop_range = document.body.createTextRange();
								drop_range.moveToPoint(clientX, clientY);
							}
						
							var drop_blot = Parchment.find(drop_range.startContainer),
								drop_offset = drop_blot.offset(editor.scroll) + drop_range.startOffset;
	
							//process all files
							var files = e.originalEvent.dataTransfer.files;
							for (var i = 0, f; f = files[i]; i++) {							
								//вставляем в сообщение только картинки, остальные файлы загрузим, как приложения
								if (!f.type.match('image.*')) {
									non_image_files.push(f);
									continue;
								}
								
								var _f = f; // f changes on each iteration
								console.log(_f);
								
								//загружаем картинку в S3 и добавляем promise в массив uploaders
								var uploader = Promise.resolve(_f)
									.then( function(f) {
										if (!canUpload(f.size)) {
											console.log('No space left', f);
											onWarning(_translatorData['noSpace'][LANG]);
											return Promise.reject('No space left');
										}
										
										$updated.show();
										$content.attr('waiting', Number($content.attr('waiting')) + 1);
										editor.insertEmbed(drop_offset, 'image', 'img/ajax-loader.gif', 'silent');
										
										return s3Uploader({
											Body: f,
											ContentType: f.type,
											ContentDisposition: f.name,
											Key: USERID + '/' + self.docGUID + '/' + GetGUID(),
											ACL: 'public-read'										
										}, undefined, true)
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
								},
								function (error) { 
									console.log(error);
								}
							);
	
							//upload other files as attachments
							if(non_image_files.length > 0){
								$drop_zone.data('files', non_image_files).trigger('drop');                    
							}
						} else {
							DOC_IMG_MOVING = false;
						}
					}
                }

			});			*/

			// paste
			$(editor.root).on({

				paste: function (e) {
			
					var isFilePaste = e.originalEvent &&
									  e.originalEvent.clipboardData &&
									  e.originalEvent.clipboardData.items &&
									  $.inArray('Files', e.originalEvent.clipboardData.types) > -1;
					
					if (isFilePaste) {
						e.preventDefault();
						e.stopPropagation();

						var item = e.originalEvent.clipboardData.items[0];
						var blob = item.getAsFile();
						console.log('paste', item);
						if (item.kind === "file" && item.type === "image/png" && blob !== null) {
							// exit if we don't have enough space
							if (!canUpload(blob.size)) {
								console.log('No space left', blob);
								onWarning(_translatorData['noSpace'][LANG]);
								return;
							}

							$saving.show();
							$content.attr('waiting', Number($content.attr('waiting')) + 1);
							var paste_index = editor.getSelection(true).index;
							editor.insertEmbed(paste_index, 'image', 'img/ajax-loader.gif', 'silent'); //TODO replace 3 dots

							//upload pic to S3
							var picGUID = GetGUID();
							var key = USERID + '/' + self.docGUID + '/' + picGUID + '.png';
							var params = {
								Body: blob,
								ContentType: "image/png",
								ContentDisposition: picGUID + '.png',
								Key: key,
								ACL: 'public-read'
							};

							var onprogress = function(p) {
								console.log(p, '%');
							}

							s3Uploader(params, onprogress, true).then(
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

				}
			});

			//image events
			$(editor.root).on({
				'dragstart': function (e) { 
					DOC_IMG_MOVING = true;
				},
				'dragend': function (e) {
					DOC_IMG_MOVING = false;
				},
				'mousedown': function (e) {
					if(e.which === 1){
						var range = document.createRange();
						range.setStartBefore(this);
						range.collapse(true);
						var selection = window.getSelection();
						selection.removeAllRanges();
						selection.addRange(range);
					}	
				}
			}, 'img');

		},

		/*=======================*/
		/*  attachments handlers */
		/*=======================*/
		attachDropzoneHandlers: function() {
			var self = this;

			//clip
			$('#clip-icon').on({
				'click': function (e) {
					e.preventDefault();
					e.stopPropagation();
					$clip.trigger('click');
				}
			});
			$clip.on({
				'change': function (e) {
					e.preventDefault();
					e.stopPropagation();
					$drop_zone.data('files', this.files).trigger('drop');
					return false;
				}
			});

			//dropzone drag & drop
            var first = false,
				second = false;
			$drop_zone.on({
                dragenter: function (e) {
                    if (first) {
                        second = true;
                        return;
                    } else {
                        first = true;
						$(this).addClass('highlighted');
                    }
                },
                dragleave: function (e) {
                    if (second) {
                        second = false;
                    } else if (first) {
                        first = false;
                    }
                    if (!first && !second) {
						$(this).removeClass('highlighted');
					}
                },
                drop: function (e) {
					e.preventDefault();
					e.stopPropagation();
				if (second) {
                        second = false;
                    } else if (first) {
                        first = false;
					}
					console.log(first, second);
                    if (!first && !second) {

						e.preventDefault();
						e.stopPropagation();
	
						var files = ( $drop_zone.data('files') ? $drop_zone.data('files') : e.originalEvent.dataTransfer.files );
						$drop_zone.removeData('files');
						$drop_zone.removeClass('highlighted');
						$drop_zone.addClass('used');
	
						var uploaders = new Array();
						$.each(files, function (i, file) {
							console.log(file);
							var fileGUID = GetGUID();
							var key = USERID + '/' + self.docGUID + '/attachments/' + fileGUID;	
	
							var $li = self.getFileHTML(key, mimeTypeToIconURL(file.type), file.name, file.size, new Date());
							
							//нужен promise, который вернёт key.
							var uploaderPromise;
							// TODO: rewrite!!!!!!
							var uploader = Promise.resolve()
									.then( function() {						
										var params = {
											Body: file,
											ContentType: file.type,
											ContentDisposition: file.name,
											Key: key,
											ACL: 'public-read'
										};
										
										if (!canUpload(file.size)) {
											console.log('No space left', file);
											onWarning(_translatorData['noSpace'][LANG]);
											return Promise.reject('No space left');
										}
	
										$files.append($li);
										$files.attr('waiting', Number($files.attr('waiting')) + 1);
										$updated.show();
										
										var oldPercents = 0;
										uploaderPromise = s3Uploader(params, function (percents) {
											//console.log(oldPercents, ' ->', percents);
											if (percents > oldPercents) {
												//console.log('updating progress bar..');
												$li.find('.progress-bar').css('width', percents + '%');
												oldPercents = percents;
											}
										}, true);
										return uploaderPromise;
									})
									.catch( function(err) {
										if (err !== 'No space left') {
											onError(err);
										}
									});
									
							uploader.abort = function() {
								uploaderPromise.abort();
							}
							
							uploaders.push(
								uploader.then(
									function (key) {
										if (key === 'abort') {
											return Promise.resolve("abort");
										}
	
										// replace it with finished version
										$li.replaceWith(self.getFileHTML(key, mimeTypeToIconURL(file.type), file.name, file.size, new Date(), true));
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
								if ($content.attr('data-modified') === '0' && $content.attr('waiting') === '0' && $files.attr('waiting') === '0') {
									$updated.removeClass('pending');
								}
							},
							function (error) { console.log(error); }
						);
		
					}
				}
			});


			//files list handlers
/*			$files.on('click', 'div.cross', function () {
				var $li = $(this).closest('li');
				$li.find('div.cross').hide();
				$li.find('.progress').hide();
				$li.find('.file-size').hide();
				$li.find('.file-modified').hide();
				$li.find('.file-question').show();
			});

			$files.on('click', 'a.no', function () {
				var $li = $(this).closest('li');
				$li.find('.file-question').hide();
				$li.find('.progress').show();
				$li.find('.file-size').show();
				$li.find('.file-modified').show();
			});
			
			$files.on('click', 'a.yes', function () {
				var $li = $(this).closest('li');
				var key = $li.attr('s3key');
				var size = parseFloat($li.attr('data-size'));
				
				console.log('Removing ', key);
				
				$li.find('.file-question')
					.html('<div class="small-preloader"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>');
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
					if ($content.attr('data-modified') === '0' && $content.attr('waiting') === '0' && $files.attr('waiting') === '0') {
						$(this).removeClass('pending');
					}
				});
			});
			
			$('.files').on('mouseenter', 'li', function () {
				console.log('enter');
				// Show/hide cross(trash) icon only when delete question is hidden
				if (! $(this).find('.file-question').is(':visible')) {
					$(this).find('div.cross').show();
				}
			});
			$('.files').on('mouseleave', 'li', function () {
				console.log('leave');
				// Show/hide cross(trash) icon only when delete question is hidden
				if (! $(this).find('.file-question').is(':visible')) {
					$(this).find('div.cross').hide();
				}
			});*/

		},


		attachLoupeHandlers: function(){

			function backgroundReposition(e, image){
				var X = e.offsetX ? e.offsetX : e.pageX - image.offsetLeft,
					Y = e.offsetY ? e.offsetY : e.pageY - image.offsetTop;
				image.style['background-position-x'] = Math.round((X / image.width)*100) + '%';
				image.style['background-position-y'] = Math.round((Y / image.height)*100) + '%';        
			}

			$content.on('mouseup', 'img', function (e) {
				var $img = $(this);
				if(e.which === 1 && $img.attr('width') > $content.width() && $content.attr('data-modified') === '0' && $content.attr('waiting') === '0'){
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

	}	

	//** constructor **/
	abDoc.init = function(params) {

		var self = this;
		$.extend(self, params);

		//---------load document index.html from S3-----------//
		var params = {
			Bucket: STORAGE_BUCKET,
			Key: self.path + '/index.html'
		}
		s3.getObject(params, function(err, data) {
			if (err) {
				onError(err);
			} else {
				$updated.hide();				
				$content.attr('guid', self.docGUID);
				$content.html(data.Body.toString('utf-8'));

				//quill config
				var editor_options = {
					placeholder: _translatorData['typeYourText'][LANG],
					theme: 'bubble',
					scrollingContainer: document.documentElement,
					readOnly: self.readOnly,
					bounds: '#document-wrap',
					modules: {
						toolbar: ['bold', 'italic', 'underline', 'strike', { 'size': [] }, { 'color': [] }, { 'background': [] }, 'blockquote', 'code-block', 'link', { 'list': 'ordered' }, { 'list': 'bullet' }, 'clean'],
						clipboard: {
							matchers: [
							//	['BR', lineBreakMatcher],
							//	[Node.TEXT_NODE, linkMatcher]
							]
						},
						keyboard: {
							bindings: {
							/*	linebreak: {
									key: 13,
									shiftKey: true,
									handler: function (range, context) {
										var currentLeaf = this.quill.getLeaf(range.index)[0],
											nextLeaf = this.quill.getLeaf(range.index + 1)[0],
											delta = new Delta();
												
										delta.retain(range.index).insert({ 'break2': '' });
										if (nextLeaf === null || (currentLeaf.parent !== nextLeaf.parent)) {
											delta.insert({ 'break2': '' });
										}
										
										this.quill.updateContents(delta, 'user');
										this.quill.setSelection(range.index + 1, 'user');
									}
								},*/
								esc: {
									key: 27,
									collapsed: false,
									handler: function (range, context) {
										$('div.ql-tooltip').addClass('ql-hidden');
									}
								}
							}
						}
					}
				};
				editor = new Quill('#editor', editor_options);

				var length = editor.getLength();
				if (editor.getText(length - 2, 2) === '\n\n') {
					editor.deleteText(length - 2, 2);
				}
							
				self.attachLoupeHandlers();
				
				if(!self.readOnly){
					self.attachEditorHandlers();
					editor.on('text-change', function () {
						$content.attr("data-modified", 1);
					});
				}				

				preloaderOnEditor(false);
			}				
		});

		//---------load attachments list from S3-------------//
		$files.html('');
		$drop_zone.removeClass('used highlighted');
		
		var toSort = [];
		listS3Files(self.path + '/attachments/')
			.then( function(files) {
				// if we have files, show dropzone, hide it otherwise
				if (files.length > 0) {
					$drop_zone.addClass('used');
				} else {
					$drop_zone.removeClass('used');
				}
						
				var p = [];
				files.forEach( function(f) {
					var params = {
						Bucket: STORAGE_BUCKET,
						Key: f.Key
					};
					p.push( s3.headObject(params).promise()
						.then( function(data) {
							var cd = decodeURIComponent(data.ContentDisposition.substring(29));
							var mime = mimeTypeByExtension(/(?:\.([^.]+))?$/.exec(cd)[1]);
							var $li = self.getFileHTML(f.Key, mimeTypeToIconURL(mime), cd, f.Size, f.LastModified, true);	
							toSort.push({cd: cd, li: $li});						
						})
						.catch( function(err) {
							onError(err);
						})
					);
				});
				Promise.all(p)
					.then( function() {
						
						console.log('Sorting', toSort);
						toSort.sort( function(x, y) {
							if (x.cd < y.cd) {
								return -1;
							}
							if (x.cd > y.cd) {
								return 1;
							}
							return 0;
						});

						toSort.forEach(function(x) {
							console.log('Adding attachment ', x.li);
							$files.append(x.li);
						});

						if(!self.readOnly){
							self.attachDropzoneHandlers();
						}				

					});
			})
			.catch( function(err) {
				onError(err);
			});

	}

	// trick borrowed from jQuery so we don't have to use the 'new' keyword
	abDoc.init.prototype = abDoc.prototype;
	// add our abDoc object to jQuery
	$.fn.abDoc = abDoc;
	
}(window, jQuery, Quill));