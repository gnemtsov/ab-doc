"use strict";

(function(g, $) {
	
	// overriding standart addEventListener so that every registered event
    // would go to abGlobalListener too.
	var oldAddEventListener = EventTarget.prototype.addEventListener;
	EventTarget.prototype.addEventListener = function () {
		var type = arguments[0];
		// If we need to listen to this event globally,
		// we modify listener
		if ( abGlobalListener.prototype._registeredEventTypes.indexOf(type) > -1 ) {
			console.log('Adding listener', arguments);
			var listener = arguments[1],
				newListener = function(event) {
					// send event to global listeners
					if (abGlobalListener.prototype._listeners[event.type]) {
						abGlobalListener.prototype._listeners[event.type]
							.forEach( function (f) {
								f(event);
							});
					}
					
					// call vanilla litener
					// listener is EventListener or a function
					if (listener.handleEvent instanceof Function) {
						listener.handleEvent(event);
					} else {
						listener(event);
					}
				};
			arguments[1] = newListener;
		} else {
			console.log('Ignoring listener', arguments);
		}
		// Now do what addEventListener was supposed to do
		oldAddEventListener.apply(this, arguments);
	}
	
	var abGlobalListener = function () {
		return new abGlobalListener.init();
	}
	
	abGlobalListener.prototype = {
		_listeners: {},
		_registeredEventTypes: [],
		
		// changing registered types doesn't remove old listeners
		// if their types were removed
		// and doesn't add previously unregistered listeners
		// if their types were added
		setRegisteredEventTypes(types) {
			this.__proto__._registeredEventTypes = types;
		},

		addListener: function(type, callback) {
			if (!this.__proto__._listeners[type]) {
				this.__proto__._listeners[type] = [];
			}
			this.__proto__._listeners[type].push(callback);
		},
		
		removeListeners: function(type) {
			delete this.__proto__._listeners[type];
		}
	}
	
	//** constructor **/
	abGlobalListener.init = function() {}

	// trick borrowed from jQuery so we don't have to use the 'new' keyword
	abGlobalListener.init.prototype = abGlobalListener.prototype;
	// add our abGlobalListener object to jQuery
	$.fn.abGlobalListener = abGlobalListener;
	
}(window, jQuery));
