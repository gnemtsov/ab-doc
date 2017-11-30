"use strict";

/******************************************************************/
/*******************************Core*******************************/
/******************************************************************/
(function (g, $) {

    //------PROD | DEV dependencies------
    if (g.location.hostname === 'ab-doc.com') { //PRODUCTION

        g.PRODUCTION = true,
        g.AWS_CDN_ENDPOINT = "https://s3-eu-west-1.amazonaws.com/ab-doc-storage/", //TODO make cdn.ab-doc.com domain
        g.STORAGE_BUCKET = "ab-doc-storage";

        console.log = function() { void(0); };
        
    } else { //DEVELOPMENT

        g.PRODUCTION = false,	
        g.AWS_CDN_ENDPOINT = "https://s3-eu-west-1.amazonaws.com/ab-doc-storage-dev/",
        g.STORAGE_BUCKET = "ab-doc-storage-dev";

    }

    //------App globals------
    //TODO use user pool attribute locale instead of LANG http://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
    g.LANG = localStorage.getItem('ab-doc.translator.lang') ? localStorage.getItem('ab-doc.translator.lang') : 'en';
    g.ROUTER = {};
    g.s3 = {};

    var abAuth, abTree;
    var $lang_select, $container, $welcome, $app, $about, $abTree, $selectedDoc, $abDoc;
    var $big_preloader = $('<div class="big-preloader"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>'),
        $small_preloader = $('<div class="small-preloader"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>');

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

            pending ? $('#update').addClass('pending') : $('#update').removeClass('pending');						
            saving ? $('#update').addClass('saving') : $('#update').removeClass('saving');						
        }
    }

    //ROUTER object constructor
    //stores current owner, opens routes
    //call ROUTER.open() to open root of current owner
    //call ROUTER.open(...) to open doc of current owner
    //call ROUTER.setOwner(...).open(...) to open doc of new owner
    g.ROUTER = {
        owner: void(0),
        readonly: true,

        setOwner: function(owner){
            if(owner === undefined || owner === ''){
                if (abAuth.isAuthorized()) {
                    this.owner = abAuth.cognitoUser.username;
                } else {
                    this.owner = void(0);
                }
            } else {
                this.owner = owner;
            }
            this.readonly =  !abAuth.isAuthorized() || this.owner !== abAuth.cognitoUser.username;
            return this;
        },
        
        open: function(doc){
            var self = this;

            $container.children().hide();
            console.log('owner, doc:', this.owner, doc);

            switch(doc){
    
                case 'welcome': //welcome
                    if(!this.readonly){
                        this.open();
                        return;
                    }
                    this.updatePath('/welcome');
                    $welcome.show();            
                    break;
    
                case 'about': //about
                this.updatePath('/about');
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
    
                default: //doc is empty or GUID, load tree and document

                    //in brackets won't go!
                    //impossible: owner not set and readonly=false
                    //owner doc readonly
                    //+ + + 1
                    //+ - - 2
                    //- + - (impossible)
                    //- - + (4)
                    //+ + - 5
                    //+ - + (6)
                    //- + + (7)
                    //- - - (impossible)

                    if((!this.owner || !doc) && this.readonly){ //(4, 6, 7)
                        this.open('','welcome');
                        return;
                    } 
                    
                    $container.prepend($big_preloader);
 
                    abTree = $abTree.abTree(this.owner, this.readOnly); //TODO no doc, no constructor
                    
                    if(doc === undefined || doc === ''){ //2
                        doc = abTree.rootGUID;                        
                    }

                    this.updatePath('/'+this.owner+'/'+doc);                            
                                        
                    var docNODE = abTree.tree.getNodesByParam('id', doc)[0];
                    if(docNODE === undefined){
                        onWarning(_translatorData["document not found"][LANG]);
                    } else {
                        abTree.tree.selectNode(docNODE);
                        $selectedDoc[0].innerHTML = docNODE.name;                        
                        $abDoc.abDoc(owner, doc, readonly);
                    }                    
                    $big_preloader.remove();
                    $app.show();
            }

        },

        updatePath: function(new_path){
            if(new_path !== window.location.pathname) { 
                history.pushState(null, null, new_path);
            }
        }

    };

    //onbeforeunload
    window.onbeforeunload = function (e) {
        if ($('#update.pending').length || $('#update.saving').length) {
            if (typeof e == "undefined") {
                e = window.event;
            }
            if (e) {
                e.returnValue = _translatorData['changesPending'][LANG];
            }
            return _translatorData['changesPending'][LANG];
        }
    }

    //------Document ready------
    $(document).ready( function() {
        $lang_select = $('#selectLang'),
        $container = $('#main-container'),
        $welcome = $('#welcome'),
        $app = $('#app'),
        $about = $('#about'),
        $abTree = $('#abTree'),
        $selectedDoc = $('#selectedDoc'),
        $abDoc = $('#abDoc');

        //AWS configuration and initialization
        AWS.config = {
            apiVersions: {  //api versions should be locked!
                cognitoidentity: '2014-06-30',
                s3: '2006-03-01' 
            },
            region: 'eu-west-1'
        };

        abAuth = $.fn.abAuth();
        AWS.config.credentials = abAuth.creds;
        g.s3 = new AWS.S3();

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

        ROUTER.setOwner(owner).open(doc);

        //translations
        $('[data-translate]').each( function(i, el) {
            var dt = $(el).attr('data-translate'),
                at = $(el).attr('attr-translate');

            if (!_translatorData[dt]) {
                console.log('"' + dt + '" not found in _translatorData');
                return;
            }
            
            if (at) {
                $(el).attr(at, g._translatorData[dt][g.LANG]);
            } else {
                $(el).html(g._translatorData[dt][g.LANG]);
            }
        });
        
        $lang_select.val(g.LANG);
        $lang_select.change( function(event) {
            localStorage.setItem('ab-doc.translator.lang', $('#selectLang option:selected').val());
            location.reload();
        });
        

        // App logo click
        $('body').on('click', 'a.navbar-brand', function (e) {
            e.preventDefault();
            ROUTER_OPEN();
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
            ROUTER_OPEN();
        });

        // About click
        $('body').on('click', 'a.link-about', function (e) {
            e.preventDefault();
            ROUTER_OPEN('about');
        });
        
    });


}(window, jQuery));  //pass external dependencies just for convenience, in case their names change outside later