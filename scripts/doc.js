/******************************************************************/
/*********************Document and attachments*********************/
/******************************************************************/
(function (global, $, Quill) {
	
	"use strict";

	// function creates object (calls abDoc.init - constructor)
	var abDoc = function (docGUID, ownerid, readOnly) {
		var params = {
			docWrap: this,
			docGUID : docGUID,
			ownerid : ownerid,
			readOnly : readOnly,
			path: TREE_USERID + '/' + docGUID
		};
		return new abDoc.init(params);
	};

	//doc.js globals
	var $doc_wrap,
		editor,
		$drop_zone = $('<div id="dropzone" class=""></div>'),
		$clip_icon = $('<img id="clip-icon" src="img/icons/paperclip.svg">'),
		$clip_input = $('<input id="clip-input" name="clip" multiple="multiple" type="file">'),
		$message = $('<div id="dropzone-message">'+_translatorData['emptyDropzoneMessage'][LANG]+'</div>'),
		$files_wrap = $('<div id="files_wrap"></div>'),
		$editor = $('<div id="editor"></div>');

	$drop_zone.append(
		$clip_icon,
		$clip_input,
		$files_wrap,
		$message
	);

	var DOC_IMG_MOVING = false;

	// object prototype
	abDoc.prototype = {

		//sort files array and update HTML representation
		updateFilesList: function(){
			var self = this;

			self.files.length ? $drop_zone.addClass('used') : $drop_zone.removeClass('used');
			self.files.sort(
				function(a,b) {
					if (a.name < b.name) return -1;
					if (a.name > b.name) return 1;
					return 0;
				}
			);

			$files_wrap.empty();
			self.files.forEach( function(file) {
				if(!file.n && !file.e){
					var name_parts = file.name.split('.');
					if (name_parts.length > 1) {
						file.e = '.' + name_parts.pop(); // removes extension from s
						file.n = name_parts.join('.'); // joins the rest of s
					} else {
						file.n = name_parts[0];
						file.e = '';
					};
				}

				var $file_container = $('<div data-guid="'+file.guid+'" class="file-container"></div>'),
					$file_wrap = $('<div class="file-wrap"></div>'),
					$icon = $('<img class="file-icon" src="' + file.iconURL + '">'),
					$name = $('<div class="file-name">' + 
								'<div class="file-n">'+file.n+'</div>' + 
								(file.e.length ? '<div class="file-e" style="opacity: 0; position: absolute;">'+file.e+'</div>' : '') + 
							'</div>'),
					$meta = $('<div class="file-meta">' + 
								'<span class="file-question">' + 
									_translatorData['areYouSure'][LANG] + 
									'&nbsp;<a href="#" class="file-yes">' + _translatorData['yes'][LANG] + '</a>' + 
									'&nbsp;<a href="#" class="file-no">' + _translatorData['no'][LANG] + '</a>' + 
								'</span>' +
							'</div>');
						
				$file_wrap.append($name, $meta);
				$file_container.append($icon, $file_wrap);			

				if(!file.modified){ //file is uploading
					$meta.append('<span class="file-size file-progress" style="width: '+file.percent+'">' + GetSize(file.size) + '</span>');
					if(file.abortable){
						$meta.append('<img class="file-action" data-action="abort" src="img/icons/close.svg">');
					}
				} else { //file is stored in S3
					var $a = $('<a href="' + AWS_CDN_ENDPOINT + file.key + '"></a>');
					$icon.wrap($a);
					$name.wrap($a);
					$meta.append('<span class="file-size">' + GetSize(file.size) + '</span>'); 
					$meta.append('<span class="file-modified">'+file.modified.toLocaleString()+'</span>'); 
					$meta.append('<img class="file-action" data-action="delete" src="img/icons/trash.svg">'); 
				}

				$files_wrap.append($file_container);
				
				//determine file extension width and put min-width, but not more than 174px
				//we can't put it in css because of border bottom on hover
				if(file.e.length){
					var $file_e = $name.find('div.file-e');
					$file_e.css({
						'text-overflow': 'ellipsis',
						'overflow': 'hidden',
						'opacity': 1,
						'position': 'inherit',
						'min-width': Math.min(174, $file_e[0].clientWidth) + 'px'
					})
				}
			});
		},

		/*=======================*/
		/*     wrap handlers   */
		/*=======================*/
		attachWrapHandlers: function() {
			//doc-wrap drag & drop
			//these handlers just highlight dropzone and pass drop event to it
			//drop events from content don't bubble to doc-wrap!
			//why preventDefault everywhere? see https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations#droptargets
			//why first and second booleans? see https://github.com/bensmithett/dragster
            var first = false,
				second = false;
			$doc_wrap.on({
                dragenter: function (e) {
					e.preventDefault();					
					if (DOC_IMG_MOVING) {
						return;
					}						
                    if (first) {
                        second = true;
                        return;
                    } else {
                        first = true;
						$drop_zone.addClass('highlighted');
                    }
                },
                dragleave: function (e) {
					e.preventDefault();
					if (DOC_IMG_MOVING) {
						return;
					}						
                    if (second) {
                        second = false;
                    } else if (first) {
                        first = false;
                    }
                    if (!first && !second) {
						$drop_zone.removeClass('highlighted');
					}
                },
                dragover: function (e) {
					e.preventDefault();
				},
                drop: function (e) {
					e.preventDefault();
					if (DOC_IMG_MOVING) {
						return;
					}						
                    if (second) {
                        second = false;
                    } else if (first) {
                        first = false;
                    }
                    if (!first && !second) {
						$drop_zone.trigger(e);
					}
                }
			});

		},

		/*=======================*/
		/*     editor handlers   */
		/*=======================*/
		attachEditorHandlers: function() {
			// paste & drop in editor root
			$editor.on({

				paste: function (e) {			
					var isFilePaste = e.originalEvent &&
									  e.originalEvent.clipboardData &&
									  e.originalEvent.clipboardData.items &&
									  $.inArray('Files', e.originalEvent.clipboardData.types) > -1 &&
									  e.originalEvent.clipboardData.items[0].kind === "file";
					
					if (isFilePaste) {
						e.preventDefault();
						e.stopPropagation();

						var file = e.originalEvent.clipboardData.items[0].getAsFile(),
							paste_index = editor.getSelection(true).index;
						if (file !== null) {
							$editor.triggerHandler('drop', [file, paste_index]);
						}
					}
				},

                dragover: function (e) {
					e.stopPropagation();
				},
                drop: function (e, file, drop_index) {
					e.stopPropagation();

					if (!DOC_IMG_MOVING) {
						e.preventDefault();

						if(typeof file === 'undefined'){ //original drop event
							$drop_zone.removeClass('highlighted superhighlighted');							
							files = e.originalEvent.dataTransfer.files; //set files

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
						
							var drop_blot = Parchment.find(drop_range.startContainer);
							drop_index = drop_blot.offset(editor.scroll) + drop_range.startOffset;
						} else { //handler was triggered from paste event
							var files = [file];
						}

						var non_image_files = new Array();
						$.each(files, function (i, file) {
							if (!canUpload(file.size)) { // exit if we don't have enough space
								onWarning(_translatorData['noSpace'][LANG]);
								return;
							}	

							if (file.type.match('image.*')) { //insert only pics, other files upload as attachments
								var index_obj = { value: drop_index + i };
								editor.disable();
								ACTIVITY.push('embed drop', 'saving');
								editor.insertEmbed(index_obj.value, 'image', 'img/ab-doc-preloader-nano.gif', 'silent');
																
								//upload pic to S3
								var picGUID = GetGUID();
								s3.upload({
									Bucket: STORAGE_BUCKET,
									Key: USERID + '/' + self.docGUID + '/' + picGUID,
									Body: file,
									ContentType: file.type,
									ContentDisposition: GetContentDisposition(file.name),
									ACL: 'public-read'
								}).send(function(err, data) {
									if(err) {
										onError(err);
										editor.enable();
									} else {
										var delta = new Delta();
										delta.retain(index_obj.value)
											 .delete(1)
											 .insert({ "image": AWS_CDN_ENDPOINT + data.Key });
										editor.updateContents(delta, 'silent');

										$(editor.root).find("img[src$='" + AWS_CDN_ENDPOINT + data.Key + "']").one(
											'load', 
											function () {
												var delta = new Delta();
												delta.retain(index_obj.value)
													 .retain(1, { width: this.naturalWidth, height: this.naturalHeight });
												editor.updateContents(delta, 'user');
												if(ACTIVITY.flush('embed drop') === undefined){
													editor.enable();
												}
											}
										);
									}
								});
							} else {
								non_image_files.push(file);								
							}

						});

						//upload other files as attachments
						if(non_image_files.length > 0){
							$drop_zone.triggerHandler('drop', [non_image_files]);                    
						}
					} else {
						DOC_IMG_MOVING = false;
					}
                }

			});

			//image move & click (change caret position)
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
					$clip_input.trigger('click');
				}
			});
			$clip_input.on({
				'change': function (e) {
					e.preventDefault();
					e.stopPropagation();
					$drop_zone.triggerHandler('drop', [this.files]);                    
					return false;
				}
			});

			//dropzone drag & drop
            var first = false,
				second = false;
			$drop_zone.on({
                dragenter: function (e) {
					e.preventDefault();
					e.stopPropagation();
					if (DOC_IMG_MOVING) {
						return;
					}						
                    if (first) {
                        second = true;
                        return;
                    } else {
                        first = true;
						$drop_zone.addClass('superhighlighted');
                    }
                },
                dragleave: function (e) {
					e.preventDefault();
					e.stopPropagation();
					if (DOC_IMG_MOVING) {
						return;
					}						
                    if (second) {
                        second = false;
                    } else if (first) {
                        first = false;
                    }
                    if (!first && !second) {
						$drop_zone.removeClass('superhighlighted');
					}
                },
                dragover: function (e) {
					e.preventDefault();
					e.stopPropagation();
				},
                drop: function (e, files) {
					e.preventDefault();
					e.stopPropagation();
					if (DOC_IMG_MOVING) {
						return;
					}						
					if (second) {
                        second = false;
                    } else if (first) {
                        first = false;
					}
                    if (!first && !second) {
	
						if(typeof files === 'undefined') { //original event
							files = e.originalEvent.dataTransfer.files;
						} 
						$drop_zone.removeClass('highlighted superhighlighted');
						$drop_zone.addClass('used');
	
						$.each(files, function (i, file) {

							if (!canUpload(file.size)) {
								onWarning(_translatorData['noSpace'][LANG]);
								return;
							}

							ACTIVITY.push('file upload', 'saving');							

							var fileGUID = GetGUID(),
								key = USERID + '/' + self.docGUID + '/attachments/' + fileGUID,
								partSize = 6 * 1024 * 1024;

							var file_obj = {
								guid: fileGUID,
								name: file.name,
								iconURL: mimeTypeToIconURL(file.type),
								key: key,
								size: file.size,
								percent: '0%',
								abortable: file.size > partSize //only multipart upload can be aborted
							};

							var	params = {
									Bucket: STORAGE_BUCKET,
									Key: key,
									Body: file,
									ContentType: file.type,
									ContentDisposition: GetContentDisposition(file.name),
									ACL: 'public-read'
								};

							var upload = s3.upload(params, {partSize: partSize, queueSize: 4});
							upload.on('httpUploadProgress', function(e) {
								var $file = $('.file-container[data-guid='+fileGUID+']');
								if(!$file.hasClass('freeze')){
									file_obj.percent = Math.ceil(e.loaded * 100.0 / e.total) + '%';
									var $file_size = $file.find('.file-size');
									$file_size.css('width', file_obj.percent);
									if($file_size.attr('data-text')){
										$file_size.text( file_obj.percent );									
									}
								}
							});
							upload.send(function(err, data) {
								if(err) { onError(err); } 
								else {
									var params = {
										Bucket: data.Bucket, 
										Prefix: data.Key
									};
									s3.listObjectsV2(params, function(err, data) {
										if (err) { onError(err); } 
										else {
											file_obj.modified = data.Contents[0].LastModified;
											self.updateFilesList();
											ACTIVITY.flush('file upload');												
										}
									});
								}
							});

							file_obj.upload = upload;
							self.files.push(file_obj);
							self.updateFilesList();

						});		
					}
				}
			});

			//files hover events
			$files_wrap.on({
				'mouseenter': function () {
					if($(this).find('.file-progress').length){
						var $file_size = $(this).find('.file-size'),
							fileGUID = $(this).attr('data-guid'),
							file_index = self.files.map(function(f) {return f.guid; }).indexOf( fileGUID );

						$file_size.attr('data-text', $file_size.text());
						$file_size.text( self.files[file_index].percent );
						$(this).find('.file-action').show();						
					} else if (!$(this).find('.file-question').is(':visible')){
						$(this).find('.file-action').show();						
					}
				},
				'mouseleave': function () {
					if($(this).find('.file-progress').length){
						var $file_size = $(this).find('.file-size');
						$file_size.text( $file_size.attr('data-text') );
						$file_size.removeAttr('data-text');
						$(this).find('.file-action').hide();						
					} else if (!$(this).find('.file-question').is(':visible')){
						$(this).find('.file-action').hide();						
					}
				}
			}, '.file-container');

			//file upload abort
			$files_wrap.on('click', 'img.file-action[data-action=abort]', function () {
				var $file = $(this).closest('.file-container'),
					fileGUID = $file.attr('data-guid'),
					file_index = self.files.map(function(f) {return f.guid; }).indexOf( fileGUID );

				$file.addClass('.freeze');
				self.files[file_index].upload.abort();
				
				$file.fadeOut(800, function() {
					self.files.splice(file_index, 1);
					self.updateFilesList();
					ACTIVITY.flush('file upload');												
				});
			});

			//file delete
			$files_wrap.on('click', 'img.file-action[data-action=delete]', function () {
				var $file = $(this).closest('.file-container');
				$file.find('.file-action').hide();
				$file.find('.file-size').hide();
				$file.find('.file-modified').hide();
				$file.find('.file-question').show();
			});
			$files_wrap.on('click', 'a.file-no', function () {
				var $file = $(this).closest('.file-container');
				$file.find('.file-question').hide();
				$file.find('.file-size').show();
				$file.find('.file-modified').show();
			});			
			$files_wrap.on('click', 'a.file-yes', function () {
				var $file = $(this).closest('.file-container'),
					fileGUID = $file.attr('data-guid'),
					file_index = self.files.map(function(f) {return f.guid; }).indexOf( fileGUID );					
				
				ACTIVITY.push('file delete', 'saving');												
				$file.find('.file-question')
					 .html('<div class="small-preloader"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>');

				var params = {
					Bucket: STORAGE_BUCKET, 
					Key: self.files[file_index].key
				};
				s3.deleteObject(params, function (err, data) {
					if (err) { onError(err); } 
					else {
						updateUsedSpaceDelta(-self.files[file_index].size);
						$file.fadeOut(800, function() {
							self.files.splice(file_index, 1);
							self.updateFilesList();
							ACTIVITY.flush('file delete');												
						});
					}
				});									
			});
			
		},


		attachLoupeHandlers: function(){

			function backgroundReposition(e, image){
				var X = e.offsetX ? e.offsetX : e.pageX - image.offsetLeft,
					Y = e.offsetY ? e.offsetY : e.pageY - image.offsetTop;
				image.style['background-position-x'] = Math.round((X / image.width)*100) + '%';
				image.style['background-position-y'] = Math.round((Y / image.height)*100) + '%';        
			}

			$editor.on('mouseup', 'img', function (e) {
				var $img = $(this);
				if(e.which === 1 && $img.attr('width') > $editor.width() && $editor.attr('data-modified') === '0' && $editor.attr('waiting') === '0'){
					if($img.attr('src').indexOf('data:image/svg+xml;base64') === -1){
						if($editor.attr('editable') === '1') {
							$editor.data('editor').disable();
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

			$editor.on('mousemove', 'img', function (e) {
				if(this.getAttribute('src').indexOf('data:image/svg+xml;base64') !== -1){
					backgroundReposition(e, this);
				}
			});

			$editor.on('mouseout', 'img', function (e) {
				var $img = $(this);
				if($img.attr('src').indexOf('data:image/svg+xml;base64') !== -1){
					image_zooming_id = '';
					$img.attr( 'src', $img.css('background-image').replace(/url\(("|')(.+)("|')\)/gi, '$2') );
					$img.removeAttr('id').removeAttr('style');
					if($editor.attr('editable') === '1') {
						$editor.data('editor').enable();
					}
				}
			});

		}

	}	

	//** constructor **/
	abDoc.init = function(params) {

		var self = this;
		$.extend(self, params);

		//-------------prepare document template--------------//
		//TODO посмотреть, вообще нужно ли это, может (как загружается новый документ?)
		$doc_wrap = $(self.docWrap);
		$doc_wrap.off();
		$doc_wrap
			.empty()  //also unbinds children's old event handlers
			.append($drop_zone)
			.append($editor);
		$files_wrap.empty();
			
		if(!self.readOnly){
			self.attachWrapHandlers();
		}				


		//---------load document index.html from S3-----------//
		var params = {
			Bucket: STORAGE_BUCKET,
			Key: self.path + '/index.html'
		}
		s3.getObject(params, function(err, data) {
			if (err) { onError(err); } 
			else {
				$editor.html(data.Body.toString('utf-8'));

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
								['BR', lineBreakMatcher],
								[Node.TEXT_NODE, linkMatcher]
							]
						},
						keyboard: {
							bindings: {
								linebreak: {
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
								},
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
						ACTIVITY.push('document modify', 'pending');
					});

					self.timer = setInterval(function () {
						if(ACTIVITY.get('document modify') === 'pending'){

							ACTIVITY.push('document modify', 'saving');
							var params = {
								Bucket: STORAGE_BUCKET,
								Key: USERID + '/' + self.docGUID + '/index.html',
								Body: editor.root.innerHTML,
								ContentType: 'text/html',
								ContentDisposition: GetContentDisposition('index.html'),
								ACL: 'public-read'
							};	

							Promise.all([ 
								s3.upload(params).promise(), 
								new Promise(function(res, rej) { setTimeout(res, 800); })
							]).then(function(){
								ACTIVITY.flush('document modify');					
							});
						}
					}, 3000);
						
				}				

				preloaderOnEditor(false);
			}				
		});

		//---------load attachments list from S3-------------//
		self.files = new Array();
		var params = {
			Bucket: STORAGE_BUCKET,
			Prefix: self.path + '/attachments/'
		  };
		s3.listObjectsV2(params, function(err, data) {
			if (err){ onError(err); } 
			else {
				var headers = new Array();
				data.Contents.forEach( function(file) {
					var params = {
						Bucket: STORAGE_BUCKET, 
						Key: file.Key
					};
					headers.push(
						s3.headObject(params).promise().then(
							function(data) {
								var name = decodeURIComponent(data.ContentDisposition.substring(29)),
									mime = mimeTypeByExtension(/(?:\.([^.]+))?$/.exec(name)[1]),
									iconURL = mimeTypeToIconURL(mime);
								self.files.push({
									guid: file.Key.split('/').pop(),
									key: file.Key,
									name: name,
									iconURL: iconURL,
									size: file.Size,									
									modified: file.LastModified
								});
							},
							function(err) { onError(err); }
						)
					);
				});

				Promise.all(headers).then(
					function (data) { 
						self.updateFilesList(); 
						if(!self.readOnly){
							self.attachDropzoneHandlers();
						}				
					},
					function (err) { onError(err); }
				);
			}
		});
		
	}

	// trick borrowed from jQuery so we don't have to use the 'new' keyword
	abDoc.init.prototype = abDoc.prototype;
	// add our abDoc object to jQuery
	$.fn.abDoc = abDoc;


	//---------------------------------------Quill stuff start--------------------------------------------//
	var Parchment = Quill.import('parchment'),
	Delta = Quill.import('delta');

	//Our version of Break blot: Break2. This is just modified version of quill break blot (https://github.com/quilljs/quill/blob/develop/blots/break.js). It is transpiled with babel for compatibilty and minified.
	var _createClass=function(){function a(b,c){for(var e,d=0;d<c.length;d++)e=c[d],e.enumerable=e.enumerable||!1,e.configurable=!0,'value'in e&&(e.writable=!0),Object.defineProperty(b,e.key,e)}return function(b,c,d){return c&&a(b.prototype,c),d&&a(b,d),b}}(),_get=function a(b,c,d){null===b&&(b=Function.prototype);var e=Object.getOwnPropertyDescriptor(b,c);if(e===void 0){var f=Object.getPrototypeOf(b);return null===f?void 0:a(f,c,d)}if('value'in e)return e.value;var g=e.get;return void 0===g?void 0:g.call(d)};function _classCallCheck(a,b){if(!(a instanceof b))throw new TypeError('Cannot call a class as a function')}function _possibleConstructorReturn(a,b){if(!a)throw new ReferenceError('this hasn\'t been initialised - super() hasn\'t been called');return b&&('object'==typeof b||'function'==typeof b)?b:a}function _inherits(a,b){if('function'!=typeof b&&null!==b)throw new TypeError('Super expression must either be null or a function, not '+typeof b);a.prototype=Object.create(b&&b.prototype,{constructor:{value:a,enumerable:!1,writable:!0,configurable:!0}}),b&&(Object.setPrototypeOf?Object.setPrototypeOf(a,b):a.__proto__=b)}var Break2=function(a){function b(){return _classCallCheck(this,b),_possibleConstructorReturn(this,(b.__proto__||Object.getPrototypeOf(b)).apply(this,arguments))}return _inherits(b,a),_createClass(b,[{key:'insertInto',value:function insertInto(c,d){_get(b.prototype.__proto__||Object.getPrototypeOf(b.prototype),'insertInto',this).call(this,c,d)}},{key:'length',value:function length(){return 1}},{key:'value',value:function value(){return'\n'}}],[{key:'value',value:function value(){}}]),b}(Parchment.Embed);

	Break2.blotName = 'break2';
	Break2.tagName = 'BR';
	Parchment.register(Break2);

	//BR matcher
	function lineBreakMatcher(node, delta) {
		return new Delta().insert({ 'break2': '' });
	};

	//links matcher
	function linkMatcher(node, delta) 
	{          
		var data = node.data,
			links = linkify.find(node.data);

		if(links.length){        
			var new_delta = new Delta(),
				task_regexp = new RegExp('https?://[^/?]+/task\\.php\\?t_id=([1-9][0-9]*)', 'i');
				
			var links_values_escaped = [];
			links.forEach(function(link, i, links) {
				links_values_escaped.push( link.value.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") );
			});

			var texts = data.split( new RegExp(links_values_escaped.join('|'),"gi") );
			texts.forEach(function(text, i, texts) {
				new_delta.insert(text);
				if(i < links.length){
					new_delta.insert(
						task_regexp.test(links[i].value) ? '#' + links[i].value.match(task_regexp)[1] : links[i].value, 
						{ link: links[i].href }
					);
				}
			});
			return new_delta;        
		} else {
			return delta;
		}
	};
	//--------------------------------------Quill stuff end-------------------------------------------------//

	
}(window, jQuery, Quill));  //pass external dependencies just for convenience, in case their names change outside later