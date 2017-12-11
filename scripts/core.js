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
//TODO use user pool attribute locale instead of LANG http://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
var LANG = localStorage.getItem('ab-doc.translator.lang') ? localStorage.getItem('ab-doc.translator.lang') : 'en';
var s3;

var $big_preloader = $('<div class="big-preloader"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>'),
    $small_preloader = $('<div class="small-preloader"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>');


(function (g, $) {

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
            if(this.lines.hasOwnProperty(activity)){
                this.lines[activity].push(state);
            } else {
                this.lines[activity] = [state];
            }
            this.refresh();
        },

        get: function(activity){
            if(this.lines.hasOwnProperty(activity)){
                var length = this.lines[activity].length;
                return this.lines[activity][length-1];
            } else {
                return undefined;
            }	
        },

        flush: function(activity){
            if(this.lines.hasOwnProperty(activity)){
                var index = this.lines[activity].indexOf('saving');
                if(index !== -1){
                    this.lines[activity] = this.lines[activity].slice(index+1);
                }
            }		
            this.refresh();
            return this.get(activity);
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

    //ROUTER object constructor
    //stores current owner and opens routes
    //call ROUTER.open('...') to open doc of currently set owner
    //call ROUTER.setOwner().open('...') to open doc of current authenticated user as owner
    //call ROUTER.setOwner('...').open('...') to open doc of specified new owner
    //IMPORTANT! Don't forget to always set owner, when owner or viewer can possibly change!
    //TODO Probably needs revision when ACL model will be settled, http://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ListUsers.html
    g.ROUTER = {
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
                $('.readOnly-mode').removeClass('hidden');
                $('.edit-mode').addClass('hidden');
            } else {
                this.readOnly = false;
                $('.readOnly-mode').addClass('hidden');
                $('.edit-mode').removeClass('hidden');
            }
            return this;
        },
        
        open: function(doc){
            var self = this;
            console.log('ROUTER: owner = <'+self.owner+'>; doc = <'+doc+'>.');

            //"onbeforeunload" imitator
            if ( PRODUCTION &&
                 ($update.hasClass('pending') || $update.hasClass('saving')) &&
                 !confirm(abUtils.translatorData['changesPending'][LANG]) ) {
                $update.removeClass('pending saving');
                return; 
            }
            $update.removeClass('pending saving');
            
            switch(doc){    
                case 'welcome': //welcome
                    if(abAuth.isAuthorized()){
                        self.open();
                        return;
                    }

                    $container.children().hide();

                    self.owner = undefined;
                    self.doc = 'welcome';
                    self.readOnly = false,
                    self.updatePath();

                    $welcome.show();            
                    break;
    
                case 'about': //about
                    $container.children().hide();

                    self.owner = undefined;
                    self.doc = 'about';
                    self.readOnly = false,
                    self.updatePath();

                    if (!$about.html().trim().length) {
                        $container.prepend($big_preloader);            
                        $.get('/about/' + LANG + '.html', function(data){
                            $about.html(data);
                            $big_preloader.remove();
                            $about.show();
                        });
                    } else {
                        $about.show();
                    }
                    break;
    
                default: //empty or equals GUID

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
                        self.open('welcome');
                        return;
                    } 
 
                    //full app reload if abTree has not been defined already or owner/readOnly has changed
                    var full_reload = false;
                    if(abTree === undefined || abTree.ownerid !== self.owner || abTree.readOnly !== self.readOnly){
                        full_reload = true;
                        $container.children().hide();
                        $container.prepend($big_preloader); //show main preloader

                        if(abAuth.isAuthorized() && this.owner === abAuth.credentials.identityId){
                            updateUsedSpace(abAuth.credentials.identityId);
                        }

                        var params = {
                            ownerid: self.owner,
                            readOnly: self.readOnly
                        };
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
                                        $app.children().addBack().show();
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
                            } else {
                                abTree.tree.selectNode(docNODE);
                                $selectedDoc[0].innerHTML = docNODE.name;

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
                                        $app.children().addBack().show();
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
        ROUTER.setOwner(event.state.owner)
              .open(event.state.doc);
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

    //core globals
    var abAuth, abTree, abDoc;
    
    var $nav, $update, $lang_select, 
        $container, 
        $app, $welcome, $about, 
        $ztree, $abTree, 
        $splitter, 
        $document, $selectedDoc, $abDoc;

    //------Document ready!------//
    $(document).ready( function() {

        $nav = $('nav'); //navbar
        $update = $('#update');
        $lang_select = $('#selectLang');

        $container = $('#main-container'); //main

        $app = $('#app'); //app & pages
        $welcome = $('#welcome'); 
        $about = $('#about');

        $ztree = $('#ztree'); //tree
        $abTree = $('#abTree'); 
        
        $splitter = $('#splitter'); //slitter
        
        $document = $('#document'); //doc
        $selectedDoc = $('#selectedDoc'); 
        $abDoc = $('#abDoc');

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

        //User auth and AWS configuration
        AWS.config = {
            apiVersions: {  //api versions should be locked!
                cognitoidentity: '2014-06-30',
                s3: '2006-03-01' 
            },
            region: 'eu-west-1'
        };

        abAuth = $.fn.abAuth();
        abAuth.promise.then(
            function(){
                AWS.config.credentials = abAuth.credentials;
                console.log(JSON.stringify(AWS.config.credentials));
                g.s3 = new AWS.S3();
                ROUTER.setOwner(owner).open(doc);            
            },
            function(error){
                abUtils.onError(error.code);
                setTimeout(function() {
                    abAuth.signOut();
                }, 4500);                                              
            }
        );


        //translations
        //TODO regress to English if no translation found!
        $('[data-translate]').each( function(i, el) {
            var dt = $(el).attr('data-translate'),
                at = $(el).attr('attr-translate');

            if (!abUtils.translatorData[dt]) {
                console.log('"' + dt + '" not found in abUtils.translatorData');
                return;
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

        //USED SPACE TIMER
        //TODO Update it less frequently, may be 15 or 30 minutes?
        //TODO Set in ROUTER and only when user can edit (not read only mode)
        TIMERS.set(function () {
            if (USER_USED_SPACE_CHANGED && 
                abAuth.isAuthorized() && 
                ROUTER.owner === abAuth.credentials.identityId) {
                updateUsedSpace(abAuth.credentials.identityId);
            }
        }, 5000, 'space');
        
        
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

        //TODO App should be positioned relative to main-container, not body. Top and left should be 0.
        //TODO Remove height calculations, app should spread just 100%. Main-container should spread till page bottom.

        var smallWidth = 600; // if (window's width < smallWidth) window is considered small, otherwise it's big
        var navHeight = $nav.outerHeight(); // save navbar's initial height
        var COLUMNS_MODE, 
            TREE_WIDTH;
                    
        // Toggle button
        $('#toggleButton').mousedown( function(event) {
            if (event) {
                event.preventDefault();
            }
            
            if (window.innerWidth < smallWidth) {
                switch (COLUMNS_MODE) {
                    case 'tree':
                        COLUMNS_MODE = 'document';
                        break;
                    case 'document':
                        COLUMNS_MODE = 'tree';
                        break;
                    default:
                        console.log('Wrong COLUMNS_MODE!');
                        COLUMNS_MODE = 'tree';
                }
            } else {
                switch (COLUMNS_MODE) {
                    case 'split':
                        COLUMNS_MODE = 'document';
                        break;
                    case 'document':
                        COLUMNS_MODE = 'split';
                        break;
                    default:
                        console.log('Wrong COLUMNS_MODE!');
                        COLUMNS_MODE = 'split';
                }
            }
            
            updateMode(COLUMNS_MODE, window.innerWidth < smallWidth, TREE_WIDTH);
        });
        
        // Window resizing
        // Keep tree column width, resize others and change height when resizing window
        $(window).resize( function(event) {
            event.preventDefault();

            if (window.innerWidth < smallWidth) {
                switch (COLUMNS_MODE) {
                    case 'document':
                    case 'tree':
                        break;
                    default:
                        COLUMNS_MODE = 'tree';
                }
            } else {
                switch (COLUMNS_MODE) {
                    case 'document':
                    case 'split':
                        break;
                    default:
                        COLUMNS_MODE = 'split';
                }
            }

            TREE_WIDTH = Math.max(Math.min(TREE_WIDTH, window.innerWidth - thresholdRight), thresholdLeft);
            if( !updateMode(COLUMNS_MODE, window.innerWidth < smallWidth, TREE_WIDTH) ) {
                COLUMNS_MODE = 'split';
                updateMode(COLUMNS_MODE, window.innerWidth < smallWidth, TREE_WIDTH);
            }
            
            // app-container's height
            $app.outerHeight(window.innerHeight - 1 - navHeight);
            $about.outerHeight(window.innerHeight - 1 - navHeight);
        });
        
        // Init columns
        var thresholdLeft = parseFloat($ztree.css('padding-left')) + parseFloat($ztree.css('padding-right')),
            thresholdRight = $splitter.outerWidth() +
                            parseFloat($document.css('padding-left')) +
                            parseFloat($document.css('padding-right')) +
                            300;	
        
        $app.outerHeight(window.innerHeight - 1 - navHeight);
        $app.css('top', $nav.outerHeight() + 'px');
        $about.outerHeight(window.innerHeight - 1 - navHeight);
            
        TREE_WIDTH = parseFloat(localStorage.getItem('ab-doc.columns.treeWidth'));
        if (isNaN(TREE_WIDTH)) {
            TREE_WIDTH = window.innerWidth * 0.25;
        }
        console.log(TREE_WIDTH);
        COLUMNS_MODE = localStorage.getItem('ab-doc.columns.mode');
        // Let window.resize() correct the layout
        $(window).resize();

        // Splitter moving
        //TODO why brackets here??
        {
            var splitterDragging = false,
                oldX;
            
            $splitter.mousedown(function(event) {
                event.preventDefault();
                
                if (COLUMNS_MODE === 'split') {
                    splitterDragging = true;
                }
                
                oldX = event.clientX;
            });
            
            $(document).mouseup(function(event) {
                //event.preventDefault();
                
                splitterDragging = false;
            });
            
            $(document).mousemove(function(event) {
                // splitterDragging is true only in 'split' mode
                if (splitterDragging) {
                    var newX = event.clientX;
                    
                    var totalWidth = window.innerWidth,
                        zTreeWidth = $ztree.outerWidth(),
                        newZTreeWidth = zTreeWidth + newX - oldX,
                        ok = false;
                        
                    if (newZTreeWidth < thresholdLeft) {
                        // go to 'document' mode if approaching left edge
                        COLUMNS_MODE = 'document';
                        splitterDragging = false;
                        ok = true;			
                    }
                    
                    TREE_WIDTH = Math.max(Math.min(newZTreeWidth, window.innerWidth - thresholdRight), thresholdLeft);
                    console.log(TREE_WIDTH, thresholdRight);
                    updateMode(COLUMNS_MODE, window.innerWidth < smallWidth, TREE_WIDTH);
                    oldX = newX;
                }
            });
        }

        // Update columns' sizes, use given mode
        // Returns true on success, false on wrong mode value
        function updateMode(mode, small, w) {
            switch(mode) {

                // Update columns' sizes when in 'tree' mode
                case 'tree': 
                    $('#toggleButton, #splitter').removeClass('ab-opened').addClass('ab-closed');
                    $splitter.removeClass('thin');
                    
                    var sw = $splitter.outerWidth();
                    
                    $ztree.show();
                    $ztree.css('left', sw + 'px');
                    $ztree.outerWidth(window.innerWidth - sw);
                    $splitter.css('left', 0 + 'px');
                    $document.hide();
                    return true;

                // Update columns' sizes when in 'document' mode
                case 'document': 
                    if (small) {
                        $('#toggleButton, #splitter').removeClass('ab-closed').addClass('ab-opened');
                        $splitter.addClass('thin');
                        
                        $document.css('left', 0 + 'px');
                        $document.outerWidth(window.innerWidth - 1);
                        $document.show();
                        $splitter.css('left', window.innerWidth - 1 + 'px');
                        $ztree.hide();	
                    } else {
                        $('#toggleButton, #splitter').removeClass('ab-opened').addClass('ab-closed');
                        $splitter.removeClass('thin');
                        
                        var sw = $splitter.outerWidth();
                        
                        $document.css('left', sw + 'px');
                        $document.outerWidth(window.innerWidth - sw);
                        $document.show();
                        $splitter.css('left', 0 + 'px');
                        $ztree.hide();	
                    }
                    return true;

                // Used when in 'split' mode. Sets tree's width = w, document's width and splitter's position to fit page
                case 'split': 
                    $('#toggleButton, #splitter').removeClass('ab-closed').addClass('ab-opened');
                    $splitter.removeClass('thin');
                    
                    var sw = $splitter.outerWidth();
                    
                    $ztree.show();
                    $ztree.css('left', 0 + 'px');
                    $ztree.outerWidth(w);
                    $splitter.css('left', w + 'px');
                    $document.show();
                    $document.outerWidth(window.innerWidth - w - sw);
                    $document.css('left', (w + sw) + 'px');
                    return true;

                default:
                    return false;
            }
        }

    });

}(window, jQuery));  //pass external dependencies just for convenience, in case their names change outside later





//---------- Size indicator and limit ------------
// TODO! wrap all this stuff in g.INDICATOR object like TIMERS and put it inside main core function
// TODO add title to indicator with info like 0.1Gb/1Gb.. so that user could see how much space he exactly uses
var sizeIndicator;
var USER_USED_SPACE = 0, // Getting list of objects in s3 and finding sum of their sizes (It happens rarely)
	USER_USED_SPACE_DELTA = 0, // Temporary value. It is changed every time we finish file upload or delete file.
								// It's erased after calculating USER_USED_SPACE
	USER_USED_SPACE_PENDING = 0, // Size of uploads in progress.
								// It is changed every time upload is started, finished or aborted.
								// It is NOT erased after calculating USER_USED_SPACE
    //TODO MAX_USED_SPACE should be taken from cognito attribute custom:space. It will be 500Mb for free accounts.
    MAX_USED_SPACE = 500 * 1024 * 1024, // 500 Mb
	USER_USED_SPACE_CHANGED = false;

// GUI-only
function updateIndicator() {
	var size = 32,
		bucket_capacity = MAX_USED_SPACE,
		space_occupied = USER_USED_SPACE + USER_USED_SPACE_DELTA + USER_USED_SPACE_PENDING;

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
	if(!sizeIndicator){
		sizeIndicator = SVG('sizeIndicator');
		sizeIndicator.space = sizeIndicator
			.polygon([sx1,sy1, sx2,sy2, sx3,sy3, sx4,sy4])   //occupied space
			.fill('#DD6600');

		sizeIndicator.bucket = sizeIndicator
			.polyline([bx1,by1, bx2,by2, bx3,by3, bx4,by4]).fill('none')   //bucket shape
			.stroke({ color: '#fff', width: 3, linecap: 'round', linejoin: 'round' });
	} else {
		sizeIndicator.space
			.animate(2000)
			.plot([sx1,sy1, sx2,sy2, sx3,sy3, sx4,sy4]);
	}
}

function updateUsedSpace(ownerid) {
	// update variables, do nothing on error
	abUtils.listS3Files(ownerid + '/').then( 
        function(files) {
            USER_USED_SPACE = files.reduce( 
                function(acc, f) { return acc + f.Size; }, 
                0
            )
			USER_USED_SPACE_DELTA = 0;
			USER_USED_SPACE_CHANGED = false;
			updateIndicator();
			console.log('Synchronized USER_USED_SPACE ', USER_USED_SPACE/1000000, 'Mb');
        }
    );
}

function canUpload(size) {
	return USER_USED_SPACE + USER_USED_SPACE_DELTA + USER_USED_SPACE_PENDING + size <= MAX_USED_SPACE;
}

function updateUsedSpaceDelta(d) {
	if ((typeof(d) !== 'number') || isNaN(d)) {
		console.log('updateUsedSpaceDelta wrong d:', d);
		return;
	}
	USER_USED_SPACE_DELTA += d;
	USER_USED_SPACE_CHANGED = true;
	updateIndicator();
}

function updateUsedSpacePending(p) {
	if ((typeof(p) !== 'number') || isNaN(p)) {
		console.log('updateUsedSpacePending wrong p:', p);
		return;
	}
	console.log('updateUsedSpacePending ', p);
	USER_USED_SPACE_PENDING += p
	updateIndicator();
}
