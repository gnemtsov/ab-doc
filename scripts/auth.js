"use strict";

/******************************************************************/
/***************************Authorization**************************/
/******************************************************************/
//some examples
//https://github.com/aws/amazon-cognito-identity-js
//https://gist.github.com/damonmaria/d4daac2dac8014cffd9d5872355a4ad4

(function (g, $) {

    var $username, $modal, $form, $submit, $alert;

    var CISP = AWSCognito.CognitoIdentityServiceProvider;
        
	// function creates object (calls abAuth.init - constructor)
	var abAuth = function () {
		return new abAuth.init();
	};

	//** object prototype **//
	abAuth.prototype = {

        //-----core functions-----
        //returns auth status: true or false
        isAuthorized: function(){
            var self = this;
            return self.cognitoUser !== undefined &&
                   self.cognitoUser !== null &&
                   self.cognitoUser.signInUserSession !== undefined &&
                   self.cognitoUser.signInUserSession !== null &&
                   self.cognitoUser.signInUserSession.isValid();
        },

        //sets user credentials after successful login (constructor or signIn)
        //loads user attributes
        //sets TIMER to refresh tokens and credentials
        loggedIn: function(idToken, callback) {
            console.log('Auth.js: loggedIn called');
            var self = this;

            self.credentials.params.Logins = {};
            self.credentials.params.Logins[ self.CognitoProviderName ] = idToken;            
            self.credentials.expired = true; // Expire credentials to refresh them on the next request

            //get refreshed credentials
            var promise1 = new Promise(function(resolve, reject){
                self.credentials.get(function(error){
                    if(error){
                        reject(error)
                    } else {
                        resolve()
                    }
                });
            });

            //load user attributes
            self.cognitoUser.Attributes = {};
            var promise2 = new Promise(function(resolve, reject){
                self.cognitoUser.getUserAttributes(function(error, attributes){
                    if(error) {
                        reject(error)
                    } else {                    
                        attributes.forEach(function(attr){
                            var c = attr.Name.indexOf(':') + 1;
                            self.cognitoUser.Attributes[ attr.Name.slice(c)] = attr.Value;
                        });
                        self.updateNav();
                        console.log('Auth.js: logged in through ' + self.CognitoProviderName );
                        resolve();
                    }
                });
            });

            Promise.all([promise1, promise2])
                   .then(callback)
                   .catch(function(error){
                        onError(error);
                    });
            
            //refreshSession obtains new ID and ACCESS tokens
            //timer is set for 50 minutes, because these tokens live for 1 hour
            //refresh token lives for 3649 days and is set in UserPool > General Settings > App clients
            TIMERS.set( function(){
                self.cognitoUser.refreshSession(
                    self.cognitoUser.signInUserSession.getRefreshToken(), 
                    function(error, session){
                        if (error) {
                            onError(error);
                            self.signOut();
                        } else {
                            self.credentials.params.Logins = {};
                            self.credentials.params.Logins[ self.CognitoProviderName ] = session.getIdToken().getJwtToken();
                            self.credentials.expired = true; // Expire credentials to refresh them on the next request
                            console.log('Auth.js: tokens refreshed at ' + Date() );
                        }                                        
                    }
                );
            }, 180000000, 'auth' );           

        },
            
        //sign in user with username and password from self.tmpAuthDetails
        signIn: function() {
            console.log("Auth.js: signIn called");
            var self = this;

            if(self.tmpAuthDetails === undefined){
                onError();
                return;
            }
         
            var authenticationDetails = new CISP.AuthenticationDetails(self.tmpAuthDetails);
            
            self.cognitoUser = new CISP.CognitoUser({
                Username : self.tmpAuthDetails.Username,
                Pool : self.userPool
            });

            self.cognitoUser.authenticateUser(authenticationDetails, {
                onSuccess: function (session) {
                    self.tmpAuthDetails = void(0);
                    self.loggedIn(
                        session.getIdToken().getJwtToken(),
                        function(){
                            $submit.abRelease();
                            $modal.modal('hide');                                
                            g.ROUTER.setOwner(g.ROUTER.owner).open(g.ROUTER.doc);
                        }
                    );
                },
                onFailure: function(error) {
                    self.tmpAuthDetails = void(0);
                    self.showAlert(error.code);                                
                    $submit.abRelease();
                }
            });
        },

        //sign out user reload page
        signOut: function() {
            var self = this;
            //sign out
            self.cognitoUser.signOut();
            localStorage.removeItem('aws.cognito.identity-id.'+self.IdentityPoolId);
            localStorage.removeItem('aws.cognito.identity-providers.'+self.IdentityPoolId);
            //complete reload
            g.location.reload();
        },


        //-----events handlers-----

        signUpHandler: function(){
            var self = this;

            var username = $('#formAuthUsername').val(),
                email = $('#formAuthEmail').val(),
                password = $('#formAuthPassword').val(),
                password2 = $('#formAuthPassword2').val();

            if(!username){
                self.showAlert('alertNoUsername');
                return;
            } else if(!email){
                self.showAlert('alertNoEmail')
                return;
            } else if(!password && !password2){
                self.showAlert('alertNoPassword')
                return;
            } else if(password !== password2){
                self.showAlert('alertWrongRepeat')
                return;
            }
            
            var attributeList = [];
            attributeList.push(
                new CISP.CognitoUserAttribute({
                    Name : 'email',
                    Value : email
                })
            );
            attributeList.push(
                new CISP.CognitoUserAttribute({
                    Name : 'custom:account-type',
                    Value : 'free'
                })
            );
            attributeList.push(
                new CISP.CognitoUserAttribute({
                    Name : 'custom:space-limit',
                    Value : '1'
                })
            );
        
            self.userPool.signUp(username, password, attributeList, null, function(error, result){                
                if (error) {
                    if(error.message.indexOf("Value at 'password' failed to satisfy constraint") !== -1){
                        self.showAlert('InvalidPasswordException');                                
                    } else {
                        self.showAlert(error.code);                                
                    }
                } else {
                    self.cognitoUser = result.user;
                    self.tmpAuthDetails = {
                        Username : username,
                        Password : password
                    }
                    self.showModal('confirm');
                }
                $submit.abRelease();
            });
        },
                
        confirmHandler: function(){
            var self = this;
            var code = $('#formAuthCode').val();
            
            self.cognitoUser.confirmRegistration(code, true, function(error, result) {
                $submit.abRelease();                
                if (error) {
                    self.showAlert(error.code);                                
                } else {
                    self.signIn();                
                }
            });
        },

        signInHandler: function(){
            var self = this;

            self.tmpAuthDetails = {
                Username : $('#formAuthUsername').val(),
                Password : $('#formAuthPassword').val()
            }
            self.signIn();                
        },

        //-----UI functions-----
        updateNav: function(){
            var self = this;
            if(self.isAuthorized()){
                $('.authenticated-mode').removeClass('hidden');
                $('.unauthenticated-mode').addClass('hidden');
                $username.text(self.cognitoUser.username);
            } else {
                $('.authenticated-mode').addClass('hidden');
                $('.unauthenticated-mode').removeClass('hidden');
                $username.text(g._translatorData['account'][g.LANG]);
            }
            $username.addClass('loaded');
        },

        showAlert: function(code){
            var self = this;
            if(g._translatorData[code]){
                $alert.text(g._translatorData[code][g.LANG]);
            } else {
                $alert.text(g._translatorData['alertUnknownError'][g.LANG]);
            }
            $alert.fadeIn('fast');
        },

        getInputHTML: function(type, params){
            params = $.extend({
                    type: '',
                    id: '',
                    label: '',
                    placeholder: '',
                    value: ''
                },
                params
            );

            switch(type){
                case 'hidden':
                    return '<input id="'+params.id+'" type="hidden" value="'+params.value+'"></input>';
                default:
                    return '<div class="form-group input-group">' + 
                                '<span class="input-group-addon">'+g._translatorData[params.label][g.LANG]+'</span>' + 
                                '<input id="'+params.id+'" type="'+type+'" class="form-control" placeholder="'+g._translatorData[params.placeholder][g.LANG]+'" value="'+params.value+'"></input>' + 
                            '</div>';
            }
        },

        showModal: function(type){
            var self = this;

            switch(type){
                case 'signUp': //sign up
                    $modal.find('.modal-title').text( g._translatorData['registration'][g.LANG] );

                    $form.html(
                        self.getInputHTML('text', {
                            id: 'formAuthUsername',
                            label: 'username',
                            placeholder: 'yourUsername',
                            value: 'testuser'
                        }) +  
                        self.getInputHTML('text', {
                            id: 'formAuthEmail',
                            label: 'email',
                            placeholder: 'yourEmail',
                            value: 'support@erp-lab.com'
                        }) + 
                        self.getInputHTML('password', {
                            id: 'formAuthPassword',
                            label: 'password',
                            placeholder: 'yourPassword',
                            value: 'test1Pass'
                        }) +
                        self.getInputHTML('password', {
                            id: 'formAuthPassword2',
                            label: 'password',
                            placeholder: 'repeatPassword',
                            value: 'test1Pass'
                        }) 
                    );
                    
                    $submit.text( g._translatorData['signUp'][g.LANG] );
                    $('#buttonAuthSubmit')
                        .off('click')
                        .on('click', function(e){
                            e.preventDefault();
                            e.stopPropagation();
                            $submit.abFreeze();
                            self.signUpHandler();
                        });
                    break;

                case 'confirm':  //confirm
                    $modal.find('.modal-title').text( g._translatorData['account confirmation'][g.LANG] );

                    $form.html(
                        self.getInputHTML('text', {
                            id: 'formAuthCode',
                            label: 'confirmationCode',
                            placeholder: 'yourConfirmationCode'
                        }) 
                    );

                    $submit.text( g._translatorData['confirm'][g.LANG] );
                    $('#buttonAuthSubmit')
                        .off('click')
                        .on('click', function(e){
                            e.preventDefault();
                            e.stopPropagation();
                            $submit.abFreeze();
                            self.confirmHandler();
                        });
                    break;

                case 'signIn': //sign in
                    $modal.find('.modal-title').text( g._translatorData['loginPage'][g.LANG] );

                    $form.html(
                        self.getInputHTML('text', {
                            id: 'formAuthUsername',
                            label: 'username',
                            placeholder: 'yourUsername',
                            value: 'gnemtsov'
                        }) +
                        self.getInputHTML('password', {
                            id: 'formAuthPassword',
                            label: 'password',
                            placeholder: 'yourPassword'
                        })
                    );

                    $submit.text( g._translatorData['enter'][g.LANG] );
                    $('#buttonAuthSubmit')
                        .off('click')
                        .on('click', function(e){
                            e.preventDefault();
                            e.stopPropagation();
                            $submit.abFreeze();
                            self.signInHandler();
                        });
                    
                    break;
            }

            $modal.modal('show');
        }        

	}	

	//** constructor **/
	abAuth.init = function() {
        var self = this;

        $username = $('#username');
        $modal = $('#modalAuth');
        $form = $('#formAuth');
        $alert = $('#alertAuthError');        
        $submit = $('#buttonAuthSubmit');

        //modal events handlers
        $modal.on('shown.bs.modal', function() {
            $modal.find('input[type!="hidden"]').first().focus();
        })            
        $modal.keypress(function(e){
            if(e.which == 13) {
                $submit.trigger('click', e);
            }
        });

        //submit functions        
        $submit.abFreeze = function(){
            $alert.hide();
            $submit.prop('disabled', true);
            $submit.before($small_preloader);
        };            
        $submit.abRelease = function(){
            $submit.prop('disabled', false);
            $small_preloader.remove();
        };

        self.CognitoProviderName = 'cognito-idp.eu-west-1.amazonaws.com/eu-west-1_dtgGGP4kG';
        self.IdentityPoolId = 'eu-west-1:e6ca203a-aead-49ba-a7e3-5c3c02cb1cf6';
        self.UserPoolId = 'eu-west-1_dtgGGP4kG';
        self.ClientId = '1eflaa2k69bgebikbnak5jg0ac';
        self.poolData = {
            UserPoolId : self.UserPoolId,
            ClientId : self.ClientId
        };

        self.userPool = new CISP.CognitoUserPool( self.poolData );
        self.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: self.IdentityPoolId
        });

        self.cognitoUser = self.userPool.getCurrentUser();

        if (self.cognitoUser === null) {
            self.updateNav();
            self.promise = Promise.resolve();
        } else {
            self.promise = new Promise(function(resolve, reject){
                //looks for session in variable
                //if not found, looks in local storage
                //if not found, tries to obtain session using refreshToken
                self.cognitoUser.getSession(function(error, session) {
                    if (error) {
                        onError(error);
                        reject(error);
                    } else if(session.isValid()){
                        self.loggedIn(
                            session.getIdToken().getJwtToken(),
                            function(){ resolve(); }
                        );
                    } else {
                        self.updateNav();
                        resolve();
                    }
                });                
            });
        }

	}

	// trick borrowed from jQuery so we don't have to use the 'new' keyword
	abAuth.init.prototype = abAuth.prototype;
	// add our abAuth object to jQuery
	$.fn.abAuth = abAuth;

}(window, jQuery));  //pass external dependencies just for convenience, in case their names change outside later