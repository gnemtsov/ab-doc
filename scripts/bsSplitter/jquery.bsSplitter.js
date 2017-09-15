/*!
	bsSplitter v0.0.1
	Boostrap Grid's Column Resizer and Splitter
	
	Copyright (c) 2015 Shekhar Sharma

	Released under the MIT license	
	https://github.com/shekhardesigner/BS-Grid-Splitter/blob/master/LICENSE
*/

(function ( $ ) {
	'use strict';

	$.fn.bsSplitter = function( options ) {

		var def = {
			el: '.bs-splitter',
			pairs: ['.split-left', '.split-right'],
			parent: '.bs-splitter-parent'		
		},
		opts = null,
		$el = null,

		$leftElm = null,
		$rightElm = null,
		
		$parentElm = null;

		opts = $.extend({}, def, options);

		return this.each(function() {

			$el = $(opts.el);
			$leftElm = $(opts.pairs[0]);
			$rightElm = $(opts.pairs[1]);
			$parentElm = $(opts.parent);

			var _start = false,
			_orgPos = $el[0].offsetLeft,
			_moved = 0,
			_thold  = 0,
			_leftElmWidth = 0,
			_rightElmWidth = 0,
			_leftThold = 0,
			_rightThold = 0;

			function mouseDown() {
				_leftElmWidth = $leftElm.outerWidth();
				_rightElmWidth = $rightElm.outerWidth();
				_leftThold = parseInt($leftElm.css("padding-left")) + parseInt($leftElm.css("padding-right"));
				_rightThold = parseInt($rightElm.css("padding-left")) + parseInt($rightElm.css("padding-right"));
				_start = true;
			}
			
			function mouseMove(evt) {				
				if(_start) {
					$('body').addClass('text-select-off');
					_moved = evt.clientX - $parentElm[0].offsetLeft - _orgPos;				

					if(_moved > 0 ) {
						$el.css('right', '-' + _moved + 'px');
					} else {
						$el.css('right', -_moved + 'px');
					}
					
					if(_moved !== 0)  {
					    _leftElmWidth += _moved;
					    _rightElmWidth -= _moved;

					    if ((_leftElmWidth > _leftThold) && (_rightElmWidth > _rightThold)){					
						    $leftElm.css('width', _leftElmWidth + 'px');
						    $leftElm.css('max-width', _leftElmWidth + 'px');
						    $rightElm.css('width', _rightElmWidth + 'px');
						    $rightElm.css('max-width', _rightElmWidth + 'px');
					    }else{
							console.log(_leftElmWidth, _rightElmWidth, _leftThold, _rightThold, _moved);
						    _leftElmWidth -= _moved;
						    _rightElmWidth += _moved;
					    }
					    $el.css('right', '');
					    _orgPos = $el[0].offsetLeft;
					    _moved = 0;
				    }
				} else {
					_orgPos = $el[0].offsetLeft;
				}
			}
			
			// duplicated code! bad
			function touchMove(evt) {				
				if(_start) {
					$('body').addClass('text-select-off');
					_moved = evt.touches.item(0).clientX - $parentElm[0].offsetLeft - _orgPos;				

					if(_moved > 0 ) {
						$el.css('right', '-' + _moved + 'px');
					} else {
						$el.css('right', -_moved + 'px');
					}
					
					if(_moved !== 0)  {
					    _leftElmWidth += _moved;
					    _rightElmWidth -= _moved;

					    if ((_leftElmWidth > _leftThold) && (_rightElmWidth > _rightThold)){					
						    $leftElm.css('width', _leftElmWidth + 'px');
						    $leftElm.css('max-width', _leftElmWidth + 'px');
						    $rightElm.css('width', _rightElmWidth + 'px');
						    $rightElm.css('max-width', _rightElmWidth + 'px');
					    }else{
							console.log(_leftElmWidth, _rightElmWidth, _leftThold, _rightThold, _moved);
						    _leftElmWidth -= _moved;
						    _rightElmWidth += _moved;
					    }
					    $el.css('right', '');
					    _orgPos = $el[0].offsetLeft;
					    _moved = 0;
				    }
				} else {
					_orgPos = $el[0].offsetLeft;
				}
			}
			
			function mouseUp () {
				_start = false;
			}

			$el.on('mousedown', mouseDown);
			$el.on('touchstart', mouseDown);

			$(document).on('mousemove', mouseMove);
			$(document).on('touchmove', touchMove);
			
			$(document).on('mouseup', mouseUp);
			$(document).on('touchend', mouseUp);
			$(document).on('touchcancel', mouseUp);
		});

	};

}( jQuery ));
