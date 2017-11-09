/******************************************************************/
/*****************Document editting and attachments****************/
/******************************************************************/

(function (global, $, Quill) {
	
	"use strict";

	// функция, создающая объект (она вызывает конструктор abDoc.init)
	var abDoc = function (guid, ownerid, readOnly) {
		var params = {
			guid : guid,
			ownerid : ownerid,
			readOnly : readOnly,
			path: TREE_USERID + '/' + guid + '/'
		};
		return new abDoc.init(params);
	};

	var Parchment = Quill.import('parchment'),
		Delta = Quill.import('delta');

	var $content = $('#editor'),
		$drop_zone = $('#dropzone'),
		$clip = $drop_zone.find('#clip'),
		$files = $('#files'),
		$updated = $('#updated'),
		editor;

	// events handlers
	abDoc.prototype = {
		AttachHandlers: function() {
			var i=1;
		}
	}	

	// constructor
	abDoc.init = function(params) {

		var self = this;
		$.extend(self, params);

		var params = {
			Bucket: STORAGE_BUCKET,
			Key: self.path + 'index.html'
		}
		s3.getObject(params, function(err, data) {
			if (err) {
				onError(err);
			} else {
				$updated.hide();				
				$content.html(data.Body.toString('utf-8'));

				//quill config
				var editor_options = {
					placeholder: _translatorData['typeYourText'][LANG],
					theme: 'bubble',
					scrollingContainer: document.documentElement,
					readOnly: self.readOnly,
					bounds: '#editor-wrap',
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
							
				editor.on('text-change', function () {
					$content.attr("modified", 1);
				});

				self.AttachHandlers();

				preloaderOnEditor(false);
			}				
		});

	}

	// trick borrowed from jQuery so we don't have to use the 'new' keyword
	abDoc.init.prototype = abDoc.prototype;
	// add our abDoc object to jQuery
	$.fn.abDoc = abDoc;
	
}(window, jQuery, Quill));