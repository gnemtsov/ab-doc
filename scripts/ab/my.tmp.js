// Init editor and all it's stuff in #id
function initQuill(id, guid, ownerid, readOnly) {

	// unbind all events from dropzone
	$('#dropzone-wrap').find('*').unbind();
	

		
	
	loadDocument(TREE_USERID + '/' + guid + '/index.html', '#editor')
		.then(function(data) {
				



			console.log(editor);
			
			// unbind old
			$('#document').unbind('drop');
			$('#document').unbind('dragover');
			$('#document').unbind('dragenter');
			$('#document').unbind('dragleave');
			// $(editor.root) is small. Let #document handle drop events too.
			$('#document').bind({
				drop: function(e) {
					console.log('Document drop');
					$(editor.root).trigger(e);
				},
				dragover: function (e) {
					console.log('Document dragover');
					$drop_zone.addClass('highlighted');
				},
				dragenter: function (e) {
					console.log('Document dragenter');
					$drop_zone.addClass('highlighted');
				},
				dragleave: function (e) {
					console.log('Document dragleave');
					console.log($(e.relatedTarget).parents('#document'));
					if ($(e.relatedTarget).parents('#document').length < 1) {
						$drop_zone.removeClass('highlighted');
					}
					console.log(e);
				}
			});
			
					

			jQuery.fn.scrollComplete = function (fn, ms) {
				var timer = null;
				this.scroll(function () {
					if (timer) { clearTimeout(timer); }
					timer = setTimeout(fn, ms);
				});
			}

		},
		function (err) {
			throw err;
		});
}
