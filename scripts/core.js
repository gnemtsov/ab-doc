"use strict";

/******************************************************************/
/*******************************Core*******************************/
/******************************************************************/

//------PROD | DEV dependencies------
if (location.hostname === 'ab-doc.com') { //PROD

    var PRODUCTION = true,
        AWS_CDN_ENDPOINT = "https://s3-eu-west-1.amazonaws.com/ab-doc-storage/", //TODO make cdn.ab-doc.com domain
        STORAGE_BUCKET = "ab-doc-storage";

    console.log = function() { void(0); };
    
} else { //DEV

    var PRODUCTION = false,	
        AWS_CDN_ENDPOINT = "https://s3-eu-west-1.amazonaws.com/ab-doc-storage-dev/",
        STORAGE_BUCKET = "ab-doc-storage-dev";

}

//------App globals------
//AWS configuration
AWS.config = {
    apiVersions: {  //api versions should be locked!
        cognitoidentity: '2014-06-30',
        s3: '2006-03-01' 
    },
    region: 'eu-west-1'
};

//TODO use user pool attribute locale instead of LANG http://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
var LANG = localStorage.getItem('ab-doc.translator.lang') ? localStorage.getItem('ab-doc.translator.lang') : 'en';
var s3;
var isTouchDevice = (('ontouchstart' in window) || ('onmsgesturechange' in window));
var isSmallDevice = window.innerWidth < 600;

var $small_preloader = $('<div class="small-preloader"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>');

(function (g, $) {
	// Attaches touch-events listeners on element
	// and converts them to mouse-events.
	// Conversion starts after holding a touch withing "moveRadius" for "delay" ms
	// Before that no mouse events are created.
	// After that touch events are .preventDafault() and mouse events are fired
	// This method is primarily used for enabling drag and drop on ztree on touch devices
	// and allowing scrolling at the same time.
	g.attachTouchToMouseListeners = function(element, scrollElement, moveRadius, delay) {
		var downX = 0, downY = 0, moveX = 0, moveY = 0,
			lastTouchstart = 0;
		var mode = 0; // 0 - waiting, 1 - converting, 2 - not converting
		element.on('touchstart touchmove touchend touchcancel', function(event) {
			//console.log('touch event!', event);
			
			var touches = event.changedTouches,
				first = touches[0],
				types = [];
				
			var fireDelayedMouseDown = false;
				
			switch(event.type)
			{
				case 'touchstart':  types = ['mousedown']; break;
				case 'touchmove':   types = ['mousemove']; break;        
				case 'touchend':    types = ['mouseup'];   break;
				case 'touchcancel': types = ['mouseup'];   break;
				default:            return;
			}
			
			if (event.type === 'touchstart') {
				downX = first.clientX;
				downY = first.clientY;
				lastTouchstart = Date.now();
				mode = 0;
			}
			
			if (event.type === 'touchmove') {
				if (mode === 0) {
					var dt = Date.now() - lastTouchstart;
					if (dt >= delay) {
						mode = 1;
						types.push('mousedown');
					} else {
						if ((Math.abs(first.clientX - downX) < moveRadius) && (Math.abs(first.clientY - downY) < moveRadius)) {
							mode = 2;
						}
					}
				}
				if (mode === 2) {
					scrollElement.scrollLeft(scrollElement.scrollLeft() - (first.clientX - moveX));
					scrollElement.scrollTop(scrollElement.scrollTop() - (first.clientY - moveY));
				}
				moveX = first.clientX;
				moveY = first.clientY;
			}

			// convert if:
			//   (mode === 0) and (touchend or touchcancel)
			//   (mode === 1) and touchmove
			//   (mode === 2)
			if (!(mode === 2 && event.type === 'touchmove')) {
				types.forEach( function (type) {
					// initMouseEvent(type, canBubble, cancelable, view, clickCount, 
					//                screenX, screenY, clientX, clientY, ctrlKey, 
					//                altKey, shiftKey, metaKey, button, relatedTarget);

					var simulatedEvent = document.createEvent('MouseEvent');
					simulatedEvent.initMouseEvent(type, true, true, window, 1, 
												  first.screenX, first.screenY, 
												  first.clientX, first.clientY, 
												  false, false, false, false, 0, null);
					
					// On touchmove event target is an element, which was touched first
					// On mousemove target event is an element, which is currently under the cursor
					document
						.elementFromPoint(first.clientX, first.clientY)
						.dispatchEvent(simulatedEvent);
				});
			}
			event.preventDefault();
			
			/*if (['touchend', 'touchcancel'].indexOf(event.type) > -1) {
				mode = 0;
			}*/
		});
	}
	
	// GLOBAL LISTENER
	
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
	
	// Workaround for Safari (Safari doesn't have EventTarget)
	var EventTarget = EventTarget || Element;
	
	// overriding standart addEventListener so that every registered event
    // would go to abGlobalListener too.
	var oldAddEventListener = EventTarget.prototype.addEventListener;
	EventTarget.prototype.addEventListener = function () {
		var type = arguments[0];
		// If we need to listen to this event globally,
		// we modify listener
		if ( abGlobalListener.__proto__._registeredEventTypes.indexOf(type) > -1 ) {
			//console.log('Adding listener', arguments);
			var listener = arguments[1],
				newListener = function(event) {
					// send event to global listeners
					if (abGlobalListener.__proto__._listeners[event.type]) {
						abGlobalListener.__proto__._listeners[event.type]
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
			//console.log('Ignoring listener', arguments);
		}
		// Now do what addEventListener was supposed to do
		oldAddEventListener.apply(this, arguments);
	}
	
	//** constructor **/
	abGlobalListener.init = function() {}

	// trick borrowed from jQuery so we don't have to use the 'new' keyword
	abGlobalListener.init.prototype = abGlobalListener.prototype;
	// add our abGlobalListener object to jQuery
	$.fn.abGlobalListener = abGlobalListener;
	
	abGlobalListener().setRegisteredEventTypes(['touchstart', 'touchmove']);

    //TIMERS object
    //tracks all timers and prevents memory leaks
    //call TIMERS.set('name') to create new timer
    //call TIMERS.<timer_name>.destroy() to destroy timer
    //call TIMERS.<timer_name>.execute() to execute timer
    g.TIMERS = {
        on: true,    //timers are ON when true
        set: function(callback, interval, name){
            if(['on', 'set', 'execute', 'destroy', 'Timer'].indexOf(name) !== -1){
                throw new Error('Invalid timer name: ' + name); 
            }
            if(this.hasOwnProperty(name) && this[name].id !== 0){  //automatically clears previous timer
                this[name].destroy();
            }
            if(this.on || PRODUCTION){
                this[name] = new this.Timer(callback, interval);
            } else {
                this[name] = {
                    id: 0,
                    execute: callback,
                    destroy: function(){ void(0); }
                }
            }
        },
        Timer: function(callback, interval){ //timer constructor
            this.id = setInterval(callback, interval);
            this.execute = callback;
            this.destroy = function(){ clearInterval(this.id); };
        }
    };

    //ACTIVITY object
    //stores activities states and updates indicator in navbar.
    //Activities: doc edit, file [guid] upload, file [guid] delete or whatever.
    //Two possible states: pending or saving.
    //Each activity on each specific object must be reported independently!
    //"saving" class is "!important", so it dominates if both classes are active
    g.ACTIVITY = {
        lines: {}, //each activity has own line of pending and saving events

        push: function (activity, state){
            var self = this;
            if(this.lines.hasOwnProperty(activity)){
                this.lines[activity].push(state);
            } else {
                this.lines[activity] = [state];
            }
            this.refresh();
            return self;
        },

        get: function(activity){
            var self = this;
            if(this.lines.hasOwnProperty(activity)){
                var length = this.lines[activity].length;
                return this.lines[activity][length-1];
            } else {
                return undefined;
            }	
        },

        flush: function(activity){
            var self = this;
            if(this.lines.hasOwnProperty(activity)){
                var index = this.lines[activity].indexOf('saving');
                if(index !== -1){
                    this.lines[activity] = this.lines[activity].slice(index+1);
                }
            }		
            this.refresh();
            return self;
        },

        drop: function(activity){
            var self = this;
            if (this.lines.hasOwnProperty(activity)){
                delete this.lines[activity];
                this.refresh();
            }		
            return self;
        },

        refresh: function(){
            var keys = Object.keys(this.lines),
                pending = false,
                saving = false;

            for (var i = 0; i < keys.length; i++) {
                pending = pending || this.lines[ keys[i] ].indexOf('pending') !== -1;
                saving = saving || this.lines[ keys[i] ].indexOf('saving') !== -1;
            }

            pending ? $update.addClass('pending') : $update.removeClass('pending');						
            saving ? $update.addClass('saving') : $update.removeClass('saving');						
        }
    }

    //INDICATOR object
    //stores and updates used space
	g.INDICATOR = {
		sizeIndicator: undefined,
		userUsedSpace: 0, // Getting list of objects in s3 and finding sum of their sizes (It happens rarely)
		userUsedSpaceDelta: 0, // Temporary value. It is changed every time we finish file upload or delete file.
										// It's erased after calculating userUsedSpace
		userUsedSpacePending: 0, // Size of uploads in progress.
										// It is changed every time upload is started, finished or aborted.
										// It is NOT erased after calculating userUsedSpace
		//TODO maxUsedSpace should be taken from cognito attribute custom:space. It will be 1Gb for free accounts.
		maxUsedSpace: 1024 * 1024 * 1024, // 1 Gb
		userUsedSpaceChanged: false,

		// GUI-only
		updateIndicator: function() {
			var size = 32,
				bucket_capacity = this.maxUsedSpace,
				space_occupied = this.userUsedSpace + this.userUsedSpaceDelta + this.userUsedSpacePending;

			//bucket coords
			var bx1 = 2, bx2 = 5, bx3 = size - bx2, bx4 = size - bx1,
				by1 = 2, by2 = size - by1, by3 = by2, by4 = by1,
				tg_alpha = (bx2 - bx1) / (by2 - by1);

			//calculate areas
			var barea = Math.abs(bx1*by2 + bx2*by3 + bx3*by4 + bx4*by1 - bx2*by1 - bx3*by2 - bx4*by3 - bx1*by4) / 2,
				sarea = Math.min(1.0, space_occupied / bucket_capacity) * barea;

			//calculate y of the occupied space (see .service/sizeIndicator.jpg for details)
			var a = -2*tg_alpha,
				b = 3*tg_alpha*by2 + bx3 + size - 3*bx2 + tg_alpha*by3,
				c = bx2*by2 - tg_alpha*Math.pow(by2, 2) + 2*bx2*by3 - bx3*by2 - size*by3 - tg_alpha*by2*by3 + 2*sarea,
				D = Math.pow(b, 2) - 4*a*c,
				y = (-b + Math.sqrt(D)) / (2*a);

			//occupied space coords
			var sx1 = Math.ceil(bx2 - by2*tg_alpha + y*tg_alpha), sx2 = bx2, sx3 = bx3, sx4 = size - sx1,
				sy1 = Math.ceil(y)-2, sy2 = by2, sy3 = by3, sy4 = sy1;

			//draw
			if(!this.sizeIndicator){
				this.sizeIndicator = SVG('sizeIndicator');
				this.sizeIndicator.space = this.sizeIndicator
					.polygon([sx1,sy1, sx2,sy2, sx3,sy3, sx4,sy4])   //occupied space
					.fill('#DD6600');

				this.sizeIndicator.bucket = this.sizeIndicator
					.polyline([bx1,by1, bx2,by2, bx3,by3, bx4,by4]).fill('none')   //bucket shape
					.stroke({ color: '#fff', width: 3, linecap: 'round', linejoin: 'round' });
			} else {
				this.sizeIndicator.space
					.animate(2000)
					.plot([sx1,sy1, sx2,sy2, sx3,sy3, sx4,sy4]);
			}
			
			//update tooltip
			$('#sizeIndicator').attr('title', g.abUtils.GetSize(space_occupied) + ' / ' + g.abUtils.GetSize(bucket_capacity));
		},

		updateUsedSpace: function(ownerid) {
			// update variables, do nothing on error
			var self = this;
			g.abUtils.listS3Files(ownerid + '/').then( 
				function(files) {
					self.userUsedSpace = files.reduce( 
						function(acc, f) { return acc + f.Size; }, 
						0
					)
					self.userUsedSpaceDelta = 0;
					self.userUsedSpaceChanged = false;
					self.updateIndicator();
					console.log('Synchronized userUsedSpace ', self.userUsedSpace/1000000, 'Mb');
				}
			);
		},

		canUpload: function(size) {
			return this.userUsedSpace
				+ this.userUsedSpaceDelta
				+ this.userUsedSpacePending
				+ size <= this.maxUsedSpace;
		},

		updateUsedSpaceDelta: function(d) {
			if ((typeof(d) !== 'number') || isNaN(d)) {
				console.log('updateUsedSpaceDelta wrong d:', d);
				return;
			}
			this.userUsedSpaceDelta += d;
			this.userUsedSpaceChanged = true;
			this.updateIndicator();
		},

		updateUsedSpacePending: function(p) {
			if ((typeof(p) !== 'number') || isNaN(p)) {
				console.log('updateUsedSpacePending wrong p:', p);
				return;
			}
			console.log('updateUsedSpacePending ', p);
			this.userUsedSpacePending += p
			this.updateIndicator();
		}
	};


    //ROUTER object constructor
    //stores current owner and opens routes
    //call ROUTER.open('...') to open doc of currently set owner
    //call ROUTER.setOwner().open('...') to open doc of current authenticated user as owner
    //call ROUTER.setOwner('...').open('...') to open doc of specified new owner
    //IMPORTANT! Don't forget to always set owner, when owner or viewer can possibly change!
    //TODO Probably needs revision when ACL model will be settled, http://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ListUsers.html
    g.ROUTER = {
		_staticPages: {},
        owner: void(0),
        doc: void(0),
        readOnly: false,

        setOwner: function(owner){
            //set owner
            if(owner === undefined || owner === ''){
                if (abAuth.isAuthorized()) {
                    this.owner = abAuth.credentials.identityId;
                } else {
                    this.owner = void(0);
                }
            } else {
                this.owner = owner;
            }

            //set readOnly
            if(!abAuth.isAuthorized() || this.owner !== abAuth.credentials.identityId){
                this.readOnly = true;
                $('.readonly-mode').removeClass('hidden');
                $('.edit-mode').addClass('hidden');
            } else {
                this.readOnly = false;
                $('.readonly-mode').addClass('hidden');
                $('.edit-mode').removeClass('hidden');
                $('.owner').addClass('hidden');
            }
            
			//USED SPACE TIMER
			TIMERS.set(this.readOnly ? function(){ void(0); } : function () {
				if (g.INDICATOR.userUsedSpaceChanged && 
					abAuth.isAuthorized() && 
					ROUTER.owner === abAuth.credentials.identityId) {
					g.INDICATOR.updateUsedSpace(abAuth.credentials.identityId);
				}
			}, 900000, 'space');
            
            return this;
        },

        open: function(doc){
            var self = this;
            console.log('ROUTER: owner = <'+self.owner+'>; doc = <'+doc+'>.');

            switch(doc){    
                case 'welcome': //welcome
                
                    if(abAuth.isAuthorized()){                        
                        return self.open();
                    }

                    $container.children().hide();

                    self.owner = undefined;
                    self.doc = 'welcome';
                    self.readOnly = false,
                    self.updatePath();

                    $welcome.show();
                    break;
    
                case 'about': //about
                case 'current_version':
                case 'user_agreement':
					if(ACTIVITY.get('tree modify') === 'pending' || 
					   ACTIVITY.get('doc modify') === 'pending' ||
					   ACTIVITY.get('doc embed drop') === 'saving'                    
					) {
						if(confirm(abUtils.translatorData['changesPending'][LANG])){
							ACTIVITY.drop('tree modify')
									.drop('doc modify')
									.drop('doc embed drop');
						} else {
							return;
						}
					}

					$container.children().hide();

					self.owner = undefined;
					self.doc = doc;
					self.readOnly = false,
					self.updatePath();

					var staticPageLoadedPromise = new Promise( function(resolve, reject) {
						if (!self._staticPages[doc]) {
							$container.prepend($big_preloader);            
							$.get('/' + doc + '/' + LANG + '.html', function(data){
								self._staticPages[doc] = data;
								$big_preloader.remove();
								resolve(data);
							}).fail( function() {
								reject();
							});
						} else {
							resolve(self._staticPages[doc]);
						}
					});
					staticPageLoadedPromise
						.then( function(data) {
							$static_page.html(data);
							console.log('inserting static page');
							$static_page.show();
							console.log('showing static page');
							// Set window title to #top-header if it's found
							var $top_header = $static_page.find('#top-header');
							if ($top_header) {
								document.title = $top_header.text();
							}
						})
						.catch( function() {
							abUtils.onError();
						});
                    break;
    
                default: //empty or equals GUID

                    if(ACTIVITY.get('doc modify') === 'pending' ||
                       ACTIVITY.get('doc embed drop') === 'saving'                    
                    ){
                        if(confirm(abUtils.translatorData['changesPending'][LANG])){
                            ACTIVITY.drop('doc modify')
                                    .drop('doc embed drop');
                        } else {
                            return;
                        }
                    }

                    //in brackets won't go!
                    //impossible: owner not set and readOnly=false
                    //owner doc readOnly
                    //+ + + 1
                    //+ - - 2
                    //- + - (impossible)
                    //- - + (4)
                    //+ + - 5
                    //+ - + (6)
                    //- + + (7)
                    //- - - (impossible)

                    if((!self.owner || !doc) && self.readOnly){ //(4, 6, 7)
                        return self.open('welcome');
                    }                    
 
                    //full app reload if abTree has not been defined already or owner/readOnly has changed
                    var full_reload = false;
                    if(abTree === undefined || abTree.ownerid !== self.owner || abTree.readOnly !== self.readOnly){
                        full_reload = true;
                        $container.children().not('.big-preloader').hide();
                        if(!$container.find('.big-preloader').length){
                            $container.prepend($big_preloader); //show main preloader
                        }

                        if(abAuth.isAuthorized() && this.owner === abAuth.credentials.identityId){
                            g.INDICATOR.updateUsedSpace(abAuth.credentials.identityId);
                        }

                        var params = {
                            ownerid: self.owner,
                            readOnly: self.readOnly,
                        };

                        if (!self.readOnly) {
							params.ownerName = abAuth.userData.get('username');
						}
                        abTree = $abTree.abTree(params);
                    }

                    abTree.promise.then( //tree is ready, load doc
                        function(){

                            if(doc === undefined || doc === ''){ //2
                                self.doc = abTree.rootGUID;                        
                            } else {
                                self.doc = doc;
                            }
                            self.updatePath();
                            
                            if(!full_reload){
                                if(abDoc.docGUID === self.doc){ //just show and exit, if doc has been already loaded
                                    if(!$app.is(":visible")){
                                        $container.children().hide();
                                        $app.show();
                                        $abDoc.show();
                                    }                                        
                                    return;
                                } else { //prepare UI for doc loading and show preloader
                                    if($app.is(":visible")){
                                        $abDoc.hide();
                                        $document.append($big_preloader);
                                    } else {
                                        $container.children().hide();
                                    }
                                }
                            }

                            var docNODE = abTree.tree.getNodesByParam('id', self.doc)[0];
                            if(docNODE === undefined){
                                abUtils.onWarning(abUtils.translatorData["no guids found"][LANG]);
                                $big_preloader.remove();
                                setTimeout(function() {
									location.href = "/";
								}, 1500);
                            } else {
                                abTree.selectNode(docNODE);
                                var title = docNODE.name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                $selectedDoc[0].innerHTML = title;
                                document.title = docNODE.name;
                                
                                if (self.readOnly && abTree.ownerName) {
									$('.owner')
										.removeClass('hidden')
										.html(abUtils.translatorData['owner'][LANG] + abTree.ownerName.replace('<', '&lt;').replace('>', '&gt'));
								}

                                var params = {
                                    ownerid: self.owner,
                                    rootGUID: abTree.rootGUID,
                                    docGUID: self.doc,
                                    readOnly: self.readOnly
                                };
                                abDoc = $abDoc.abDoc(params);
                                abDoc.promise.then( //doc is ready, show!
                                    function(){
                                        $big_preloader.remove();
                                        $app.show();
                                        $abDoc.show();
                                    }
                                );
                            }                    
                        }
                    );

            }
        },

        updatePath: function(){
            var self = this,
                parts = [];
            if(self.owner !== undefined){
                parts.push(self.owner.replace(':','_'));
            }
            if(self.doc !== undefined){
                parts.push(self.doc);
            }
            var new_path = '/' + parts.join('/');
            if(new_path !== window.location.pathname) { 
                history.pushState({owner: self.owner, doc: self.doc}, null, new_path);
            }
        }

    };

    window.onpopstate = function(event) { //revert ROUTER state when back|forward click
		console.log('onpopstate', event);
		if (event.state) { // sometimes event.state is null
			ROUTER.setOwner(event.state.owner)
				  .open(event.state.doc);
		}
    };
      
    //onbeforeunload
    window.onbeforeunload = function (e) {
        if ($update.hasClass('pending') || $update.hasClass('saving')) {
            if (typeof e == "undefined") {
                e = window.event;
            }
            if (e) {
                e.returnValue = abUtils.translatorData['changesPending'][LANG];
            }
            return abUtils.translatorData['changesPending'][LANG];
        }
    }

    //yoloPromise
    window.yoloPromise = new Promise(function(resolve, reject){
        window.onGoogleYoloLoad = function(googleyolo) {
            console.log('Core.js: googleyolo ready.');
            resolve(1);
        };                        
    });
	

    //---------core globals--------

    //auth
    var abAuth = $.fn.abAuth();
    
    //global listener
    var abGlobalListener = $.fn.abGlobalListener();
    
    //tree&doc
    var abTree, abDoc;
    
    //UI
    var $nav, $update, $lang_select, 
        $container, $big_preloader,
        $app, $welcome, $static_page, 
        $ztree, $abTree, 
        $splitter, 
        $document, $selectedDoc, $abDoc;

    //------Document ready!------//
    $(document).ready( function() {
		
        $nav = $('nav'); //navbar
        $update = $('#update');
        $lang_select = $('#selectLang');

        $container = $('#main-container'); //main
        $big_preloader = $('.big-preloader'); //big-preloader

        $app = $('#app'); //app (contains tree, splitter and document)
        $welcome = $('#welcome'); 
        $static_page = $('#static-page'); // about, user agreement, version

        $ztree = $('#ztree'); //tree
        $abTree = $('#abTree'); 
        
        $splitter = $('#splitter'); //slitter
        
        $document = $('#document'); //doc
        $selectedDoc = $('#selectedDoc'); 
        $abDoc = $('#abDoc');

        if (isTouchDevice) {
            $('body').addClass('touch-device');
        }
        if (isSmallDevice) {
            $('body').addClass('small-device');
        }

        //define owner and doc from pathname
        var path = window.location.pathname.split('/'),
            owner, doc;
        for(var i=0; i<path.length; i++) {
            if (path[i]){
                if(!owner){
                    owner = path[i];
                    continue;
                }
                doc = path[i];
                break;
            }
        }
        if(owner && !doc){ //if only owner found, consider it as doc
            doc = owner;
            owner = void(0);
        }

        if(owner !== undefined){
            owner = owner.replace('_',':');
        }

        abAuth.promise.then(
            function(){
                console.log('Core.js: abAuth promise finished.');
                s3 = new AWS.S3();
                ROUTER.setOwner(owner).open(doc);            
            },
            function(error){
                abUtils.onError(error.code);
                if (PRODUCTION) {
					setTimeout(function() {
						abAuth.signOut();
					}, 4500);                                              
				}
            }
        );


        //translations
        //if no translation found, regresses to English
        $('[data-translate]').each( function(i, el) {
            var dt = $(el).attr('data-translate'),
                at = $(el).attr('attr-translate'),
                t = dt; // t is a translated dt
                
            if (g.abUtils.translatorData[dt]) {
				if (g.abUtils.translatorData[dt][g.LANG]) {
					t = g.abUtils.translatorData[dt][g.LANG]
				} else if (g.abUtils.translatorData[dt]['en']) {
					t = g.abUtils.translatorData[dt]['en']
				}
            }
            
            if (at) {
                $(el).attr(at, g.abUtils.translatorData[dt][g.LANG]);
            } else {
                $(el).html(g.abUtils.translatorData[dt][g.LANG]);
            }
        });
        
        $lang_select.val(g.LANG);
        $lang_select.change( function(event) {
            localStorage.setItem('ab-doc.translator.lang', $('#selectLang option:selected').val());
            location.reload();
        });
        
        
        //----------Core handlers--------
        // App logo click
        $('body').on('click', 'a.navbar-brand', function (e) {
            e.preventDefault();
            ROUTER.setOwner().open();
        });
        
        // Call sign up dialog
        $('body').on('click', 'a.link-sign-up', function (e) {
            e.preventDefault();
            abAuth.showModal('signUp');
        });
        
        // Call sign in dialog
        $('body').on('click', 'a.link-sign-in', function (e) {
            e.preventDefault();
            abAuth.showModal('signIn');
        });

        // Call google sign in
        $('body').on('click', 'a.link-google', function (e) {
            e.preventDefault();
            abAuth.showGoogleHintsOrSignIn(1);
        });

        // Sign out
        $('body').on('click', 'a.link-sign-out', function (e) {
            e.preventDefault();
            abAuth.signOut();
        });

        // About click
        $('body').on('click', 'a.link-about', function (e) {
            e.preventDefault();
            ROUTER.open('about');
        });
        
        // About click
        $('body').on('click', 'a.link-current-version', function (e) {
            e.preventDefault();
            ROUTER.open('current_version');
        });

        // About click
        $('body').on('click', 'a.link-user-agreement', function (e) {
            e.preventDefault();
            ROUTER.open('user_agreement');
        });
        
        //--------- Columns resizing ----------
        /* Three possible modes:
        * 1) 'tree' - only tree is shown, splitter is on the left, hidden
        * 2) 'split' - tree | splitter | document
        * 3) 'document' - only document is shown, splitter is on the left, hidden
        * 
        * Small window:
        *   tree <-----> document
        * 
        * Big window:
        *   split <-----> document
        */

        var navHeight = $nav.outerHeight(); // save navbar's initial height
        var TREE_WIDTH;
                    
        // Toggle button
        $('#toggleButton').mousedown( function(event) {
            if (event) {
                event.preventDefault();
            }
            
            if (isSmallDevice) {
                switch (g.COLUMNS_MODE) {
                    case 'tree':
                        g.COLUMNS_MODE = 'document';
                        break;
                    case 'document':
                        g.COLUMNS_MODE = 'tree';
                        break;
                    default:
                        console.log('Wrong g.COLUMNS_MODE!');
                        g.COLUMNS_MODE = 'tree';
                }
            } else {
                switch (g.COLUMNS_MODE) {
                    case 'split':
                        g.COLUMNS_MODE = 'document';
                        break;
                    case 'document':
                        g.COLUMNS_MODE = 'split';
                        break;
                    default:
                        console.log('Wrong g.COLUMNS_MODE!');
                        g.COLUMNS_MODE = 'split';
                }
            }
            
            updateMode();
        });
        
        // Window resizing
        // Keep tree column width, resize others and change height when resizing window
        $(window).resize( function(event) {

            console.log('window.resize');
			if (event) {
				event.preventDefault();
			}

            isSmallDevice = window.innerWidth < 600;
            isSmallDevice ? $('body').addClass('small-device') : $('body').removeClass('small-device');

            if (isSmallDevice) {
                switch (g.COLUMNS_MODE) {
                    case 'document':
                    case 'tree':
                        break;
                    default:
                        g.COLUMNS_MODE = 'tree';
                }
            } else {
                switch (g.COLUMNS_MODE) {
                    case 'document':
                    case 'split':
                        break;
                    default:
                        g.COLUMNS_MODE = 'split';
                }
            }

            TREE_WIDTH = Math.max(Math.min(TREE_WIDTH, window.innerWidth - thresholdRight), thresholdLeft);
            if( !updateMode() ) {
                g.COLUMNS_MODE = 'split';
                updateMode();
            }
            
            // app-container's height
            $app.outerHeight(window.innerHeight - 1 - navHeight);
            $static_page.outerHeight(window.innerHeight - 1 - navHeight);
        });
        
        // Init columns
        var thresholdLeft = parseFloat($ztree.css('padding-left')) + parseFloat($ztree.css('padding-right')),
            thresholdRight = $splitter.outerWidth() +
                            parseFloat($document.css('padding-left')) +
                            parseFloat($document.css('padding-right')) +
                            300;	
        
        $app.outerHeight(window.innerHeight - 1 - navHeight);
        $app.css('top', $nav.outerHeight() + 'px');
        $static_page.outerHeight(window.innerHeight - 1 - navHeight);
            
        TREE_WIDTH = parseFloat(localStorage.getItem('ab-doc.columns.treeWidth'));
        if (isNaN(TREE_WIDTH)) {
            TREE_WIDTH = window.innerWidth * 0.25;
        }
        console.log(TREE_WIDTH);
        
        // Let window.resize() correct the layout
        g.COLUMNS_MODE = g.isSmallDevice ? 'document' : 'split';
        $(window).resize();

        // Splitter moving
		var splitterDragging = false,
			oldX;
		
		$splitter.mousedown(function(event) {
			if (event) {
				event.preventDefault();
			}
			
			if (g.COLUMNS_MODE === 'split') {
				splitterDragging = true;
			}
			
			oldX = event.clientX;
		});
		$splitter.on('touchstart', function(event) {
			$splitter.trigger('mousedown');
		});

		$(document).mouseup(function(event) {
			splitterDragging = false;
		});
		$(document).on('touchcancel touchend', function(event) {
			$splitter.trigger('mouseup');
		});
				
		function mouseMove(x, y) {
			// splitterDragging is true only in 'split' mode
			if (splitterDragging) {
				var newX = x;
				
				var totalWidth = window.innerWidth,
					zTreeWidth = $ztree.outerWidth(),
					newZTreeWidth = zTreeWidth + newX - oldX,
					ok = false;
					
				if (newZTreeWidth < thresholdLeft) {
					// go to 'document' mode if approaching left edge
					g.COLUMNS_MODE = 'document';
					splitterDragging = false;
					ok = true;			
				}
				
				TREE_WIDTH = Math.max(Math.min(newZTreeWidth, window.innerWidth - thresholdRight), thresholdLeft);
				console.log(TREE_WIDTH, thresholdRight);
				updateMode();
				oldX = newX;
			}
		}
		$(document).mousemove(function(event) {
			mouseMove(event.clientX, event.clientY);
		});
		$(document).on('touchmove', function(event) {
			var touch = event.targetTouches[0];
			if (touch) {
				mouseMove(touch.clientX, touch.clientY);
			}
		});

		// Testing!
		// Swiping
		// TODO: move it to utils
		{
			var startX = 0, 
				startY = 0,
				startT = 0,
				finishedSwiping = false;
			$(document).on('touchmove', function(event) {});
			$(document).on('touchstart', function(event) {});
			
			/*abGlobalListener.addListener('touchstart', function(event) {
				if (!isSmallDevice) {
					return;
				}
				
				var touch = event.targetTouches[0];
				finishedSwiping = false;
				startX = touch.clientX;
				startY = touch.clientY;
				startT = Date.now();
				console.log('Starting swipe', startX, startY, startT);
			});

			abGlobalListener.addListener('touchmove', function(event) {
				if (!isSmallDevice) {
					return;
				}
				
				var touch = event.targetTouches[0];
				var x = touch.clientX,
					y = touch.clientY,
					dx = x - startX,
					dy = y - startY,
					dt = Date.now() - startT;
					
				console.log('swiping ', dx, dy, dt);
					
				if (!finishedSwiping && 
					Math.abs(dx) > 100 && Math.abs(dy) < 25 && 
					dt < 1000) {
					if ((dx < 0) && (g.COLUMNS_MODE === 'tree')) {
						g.COLUMNS_MODE = 'document';
					}
					if ((dx > 0) && (g.COLUMNS_MODE === 'document')) {
						g.COLUMNS_MODE = 'tree';
					}
					
					console.log('finished swiping');
										
					updateMode();
					finishedSwiping = true;
				}
			});*/
		}

        // Update columns' sizes, use current mode
        // Returns true on success, false on wrong mode value
        function updateMode() {
            switch(g.COLUMNS_MODE) {

                // Update columns' sizes when in 'tree' mode
                case 'tree': 
					$('#toggleButton, #splitter').removeClass('ab-closed').addClass('ab-opened');
					$splitter.removeClass('thin');
					// sw was declared and calculated before switch, 
					// but it should be calculated after css changes
					var sw = $splitter.outerWidth();
                    $document.removeClass('doc-solo');
                    $ztree.addClass('tree-solo');
					
					$ztree.show();
					$ztree.css('left', sw + 'px');
					$ztree.outerWidth(window.innerWidth - sw);
					$splitter.css('left', window.innerWidth - 1 + 'px');
					$document.hide();
                    return true;

                // Update columns' sizes when in 'document' mode
                case 'document': 
					$('#toggleButton, #splitter').removeClass('ab-opened').addClass('ab-closed');
					$splitter.addClass('thin');
					var sw = $splitter.outerWidth();
                    $document.addClass('doc-solo');
                    $ztree.removeClass('tree-solo');
										
					$document.css('left', sw + 'px');
					$document.outerWidth(window.innerWidth - sw);
					$document.show();
					$splitter.css('left', 0 + 'px');
					$ztree.hide();
                    return true;

                // Used when in 'split' mode. Sets tree's width = TREE_WIDTH, document's width and splitter's position to fit page
                case 'split': 
                    $('#toggleButton, #splitter').removeClass('ab-closed').addClass('ab-opened');
                    $splitter.removeClass('thin');
                    var sw = $splitter.outerWidth();
                    $document.removeClass('doc-solo');
                    $ztree.removeClass('tree-solo');
                                        
                    $ztree.show();
                    $ztree.css('left', 0 + 'px');
                    $ztree.outerWidth(TREE_WIDTH);
                    $splitter.css('left', TREE_WIDTH + 'px');
                    $document.show();
                    $document.outerWidth(window.innerWidth - TREE_WIDTH - sw);
                    $document.css('left', (TREE_WIDTH + sw) + 'px');
                    return true;

                default:
                    return false;
            }
        }

    });
}(window, jQuery));  //pass external dependencies just for convenience, in case their names change outside later
