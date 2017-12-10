"use strict";

/******************************************************************/
/***************************Authorization**************************/
/******************************************************************/
//some examples
//https://github.com/aws/amazon-cognito-identity-js
//https://gist.github.com/damonmaria/d4daac2dac8014cffd9d5872355a4ad4
//TODO store account confirmation pending status in local storage + ExpiredCodeException

(function (g, $) {

    var $username;
    var $modal, $mtitle, $mbody, $mfooter;
    var $alert_container, $alert;
    var $form, $submit, $forget_link;

    var CISP = AWSCognito.CognitoIdentityServiceProvider;
        
	// function creates object (calls abAuth.init - constructor)
	var abAuth = function () {
		return new abAuth.init();
	};

	//** object prototype **//
	abAuth.prototype = {

        //-----core functions-----
        //returns current auth status: true or false
        isAuthorized: function(){
            var self = this;
            return self.cognitoUser !== undefined &&
                   self.cognitoUser !== null &&
                   self.cognitoUser.signInUserSession !== undefined &&
                   self.cognitoUser.signInUserSession !== null &&
                   self.cognitoUser.signInUserSession.isValid();
        },

        //after successful login (constructor or signIn), returns promise
        loggedIn: function(idToken) {
            console.log('Auth.js: loggedIn called');
            var self = this;

            //refresh credentials promise
            var promise1 = new Promise(function(resolve, reject){
                self.credentials.params.Logins = {};
                self.credentials.params.Logins[ self.CognitoProviderName ] = idToken;            
                self.credentials.expired = true; // Expire credentials to refresh them on the next request
                self.credentials.get(function(error){
                    if(error){
                        reject(error)
                    } else {
                        resolve()
                    }
                });
            });

            //load user attributes promise
            var promise2 = new Promise(function(resolve, reject){
                self.cognitoUser.Attributes = {};
                self.cognitoUser.getUserAttributes(function(error, attributes){
                    if(error) {
                        reject(error)
                    } else {                    
                        attributes.forEach(function(attr){
                            var c = attr.Name.indexOf(':') + 1;
                            self.cognitoUser.Attributes[ attr.Name.slice(c)] = attr.Value;
                        });
                        resolve();
                    }
                });
            });
            
            //Set refreshSession TIMER, it obtains new ID and ACCESS tokens
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

            return Promise.all([promise1, promise2]);
        },

        //signUp new user, returns promise
        signUp: function(username, email, password) {
            var self = this;
            return new Promise (function(resolve, reject){
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
                        reject(error);
                    } else {
                        self.cognitoUser = result.user;
                        resolve();
                    }
                });
            });
        },

        //signIn user, returns promise
        //username can be undefined, that means sign in current cognitoUser
        signIn: function(username, password) {
            console.log("Auth.js: signIn called");
            var self = this;
            return new Promise (function(resolve, reject){
                
                if(username === undefined){
                    username = self.cognitoUser.getUsername();
                } else {
                    self.cognitoUser = new CISP.CognitoUser({
                        Username : username,
                        Pool : self.userPool
                    });
                }

                var authenticationDetails = new CISP.AuthenticationDetails({
                    Username: username,
                    Password: password
                });

                self.cognitoUser.authenticateUser(authenticationDetails, {
                    onSuccess: function (session) {
                        self.loggedIn( session.getIdToken().getJwtToken() )
                            .then(
                                function(){ 
                                    self.updateNavUsername();
                                    resolve(); 
                                },
                                function(error){ 
                                    reject(error); 
                                }
                            );
                    },
                    onFailure: function(error) {
                        reject(error);
                    }
                });
            });
        },

        //confirm user registration
        confirmRegistration: function(code) {
            var self = this;
            return new Promise (function(resolve, reject){
                self.cognitoUser.confirmRegistration(code, true, function(error, result) {
                    if (error) reject(error);                                
                    else resolve();
                });
            });
        },        

        //start forgot password flow
        forgotPassword: function(username) {
            var self = this;
            return new Promise (function(resolve, reject){
                self.cognitoUser = new CISP.CognitoUser({
                    Username : username,
                    Pool : self.userPool
                });
                
                self.cognitoUser.forgotPassword({
                        onSuccess: function (result) { resolve(result); },
                        onFailure: function(error) { reject(error); }
                });
            });
        },        

        //reset forgotten password
        resetPassword: function(verificationCode, newPassword) {
            var self = this;
            return new Promise (function(resolve, reject){
                self.cognitoUser.confirmPassword(
                    verificationCode, 
                    newPassword,
                    {
                        onSuccess: function (result) {
                            self.signIn(void(0), newPassword)
                                .then(function(){
                                    resolve(result);
                                })
                                .catch(function(error){
                                    reject(error);
                                });                           
                        },
                        onFailure: function(error) { 
                            reject(error); 
                        }
                    }
                );
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
        signUpHandler: function(e){
            var self = this;

            e.preventDefault();
            e.stopPropagation();
            $submit.abFreeze();

            var username = $('#formAuthUsername').val(),
                email = $('#formAuthEmail').val(),
                password = $('#formAuthPassword').val(),
                password2 = $('#formAuthPassword2').val();

            var error;
            if(!username){
                error = 'alertNoUsername';
            } else if(!email){
                error = 'alertNoEmail';
            } else if(!password && !password2){
                error = 'alertNoPassword';
            } else if(password !== password2){
                error = 'alertWrongRepeat';
            }

            if(error){
                self.showAlert(error);
                $submit.abRelease();
                return;
            }
            
            self.signUp(username, email, password)
                .then(function(){
                    self.tmpPassword = password;
                    self.showModal('confirm');
                    $submit.abRelease();
                })
                .catch(function(error){
                    if(error.message.indexOf("Value at 'password' failed to satisfy constraint") !== -1){
                        self.showAlert('InvalidPasswordException');                                
                    } else {
                        self.showAlert(error.code);                                
                    }
                    $submit.abRelease();
                });
        },
                
        confirmHandler: function(e){
            var self = this;

            e.preventDefault();
            e.stopPropagation();
            $submit.abFreeze();

            var code = $('#formAuthCode').val();
            self.confirmRegistration(code)
                .then(function(){
                    var password = self.tmpPassword;
                    self.tmpPassword = void(0);                    
                    return self.signIn(void(0), password);
                })
                .then(function(){
                    $submit.abRelease();
                    $modal.modal('hide');                                
                    g.ROUTER.setOwner().open();
                })
                .catch(function(error){
                    self.showAlert(error.code);                                
                    $submit.abRelease();
                });            
        },

        signInHandler: function(e){
            var self = this;

            e.preventDefault();
            e.stopPropagation();
            $submit.abFreeze();

            var username = $('#formAuthUsername').val(),
                password = $('#formAuthPassword').val();

            self.signIn(username, password)
                .then(function(){
                    $submit.abRelease();
                    $modal.modal('hide');                                
                    g.ROUTER.setOwner(g.ROUTER.owner).open(g.ROUTER.doc);
                })
                .catch(function(error){
                    self.showAlert(error.code);                                
                    $submit.abRelease();
                });
        },

        forgotPasswordLinkHandler: function(e){
            var self = this;

            e.preventDefault();
            e.stopPropagation();
            $submit.abFreeze();

            var username = $('#formAuthUsername').val();
            if(!username){
                self.showAlert('alertNoUsername');
                $submit.abRelease();
                return;
            }
            
            self.forgotPassword(username)
                .then(function(){
                    self.showModal('reset password');
                    self.showAlert('confirmation code sent', 'alert-info');
                    $submit.abRelease();
                })
                .catch(function(error){
                    self.showAlert(error.code);                                
                    $submit.abRelease();
                });
        },

        resetPasswordHandler: function(e){
            var self = this;

            e.preventDefault();
            e.stopPropagation();
            $submit.abFreeze();

            var code = $('#formAuthCode').val(),
                password = $('#formAuthPassword').val(),
                password2 = $('#formAuthPassword2').val();

            var error;
            if(!password && !password2){
                error = 'alertNoPassword';
            } else if(password !== password2){
                error = 'alertWrongRepeat';
            }

            if(error){
                self.showAlert(error);
                $submit.abRelease();
                return;
            }
            
            self.resetPassword(code, password)
                .then(function(){
                    self.showAlert('password reset successful', 'alert-success');                                
                    setTimeout(function() {
                        $submit.abRelease();
                        $modal.modal('hide');                                
                        g.ROUTER.setOwner(g.ROUTER.owner).open(g.ROUTER.doc);
                    }, 5000);
                })
                .catch(function(error){
                    self.showAlert(error.code);                                
                    $submit.abRelease();
                });
        },

        //-----UI functions-----
        updateNavUsername: function(){
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

        showAlert: function(code, alert_class){
            var self = this;
            if(alert_class === undefined){
                alert_class = 'alert-danger';
            }
            if(g._translatorData[code]){
                $alert.text(g._translatorData[code][g.LANG]);
            } else {
                $alert.text(g._translatorData['alertUnknownError'][g.LANG]);
            }
            $alert.removeClass('alert-success alert-info alert-warning alert-danger')
                  .addClass(alert_class);
            $alert_container.fadeIn('fast');
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

        initModal: function(){
            var self = this;

            $modal = $(
                '<div class="modal fade" tabindex="-1" role="dialog" aria-labelledby="authModalLabel" aria-hidden="true">' + 
                    '<div class="modal-dialog" role="document">' + 
                        '<div class="modal-content">' + 
                            '<div class="modal-header">' + 
                                '<h4 class="modal-title" id="authModalLabel"></h4>' + 
                                '<button type="button" class="close" data-dismiss="modal" aria-label="Close">' + 
                                    '<span aria-hidden="true">&times;</span>' + 
                                '</button>' + 
                            '</div>' + 
                            '<div class="modal-body"></div>' + 
                            '<div class="modal-footer"></div>' + 
                        '</div>' + 
    			    '</div>' + 
		        '</div>'
            );

            $mtitle = $modal.find('.modal-title');
            $mbody = $modal.find('.modal-body');
            $mfooter = $modal.find('.modal-footer');

            $alert_container = $('<div class="form-group collapse"></div>');
            $alert = $('<div class="alert col-12" role="alert"></div>');
            $alert_container.append( $alert );
            $mbody.append( $alert_container );
            
            $form = $('<form></form>');
            $mbody.append($form);

            $submit = $('<button type="button" class="btn btn-success"></button>');
            $submit.abFreeze = function(){
                $alert_container.hide();
                $submit.prop('disabled', true);
                $submit.before($small_preloader);
            };            
            $submit.abRelease = function(){
                $submit.prop('disabled', false);
                $small_preloader.remove();
            };

            $forget_link = $('<a href="#">'+g._translatorData['forgotPassword'][g.LANG]+'</a>');

            //modal common events handlers (used for all modal types)
            $modal.on('shown.bs.modal', function() {
                $modal.find('input[type!="hidden"]').first().focus();
            })            
            $modal.keypress(function(e){
                if(e.which == 13) {
                    $submit.trigger('click', e);
                }
            });

            $modal.modal({show: false});
        },

        showModal: function(type){
            var self = this;

            if($modal === undefined){
                onError('Modal was not initialized');
                return;
            }

            $alert_container.hide();
            $form.empty();
            $mfooter.empty();

            switch(type){
                case 'signUp': //sign up
                    $mtitle.text( g._translatorData['registration'][g.LANG] );
                    $form.append(
                        self.getInputHTML('text', {
                            id: 'formAuthUsername',
                            label: 'username',
                            placeholder: 'yourUsername',
                            value: 'testuser'
                        }),  
                        self.getInputHTML('text', {
                            id: 'formAuthEmail',
                            label: 'email',
                            placeholder: 'yourEmail',
                            value: 'support@erp-lab.com'
                        }), 
                        self.getInputHTML('password', {
                            id: 'formAuthPassword',
                            label: 'password',
                            placeholder: 'yourPassword',
                            value: 'test1Pass'
                        }),
                        self.getInputHTML('password', {
                            id: 'formAuthPassword2',
                            label: 'password',
                            placeholder: 'repeatPassword',
                            value: 'test1Pass'
                        }) 
                    );                    
                    $submit.text( g._translatorData['signUp'][g.LANG] );
                    $submit.on('click', self.signUpHandler.bind(self));
                    $mfooter.append($submit);
                    break;

                case 'confirm':  //confirm
                    $mtitle.text( g._translatorData['account confirmation'][g.LANG] );
                    $form.append(
                        self.getInputHTML('text', {
                            id: 'formAuthCode',
                            label: 'confirmationCode',
                            placeholder: 'yourConfirmationCode'
                        })
                    );
                    $submit.text( g._translatorData['confirm'][g.LANG] );
                    $submit.on('click', self.confirmHandler.bind(self));
                    $mfooter.append($submit);
                    break;

                case 'signIn': //sign in
                    $mtitle.text( g._translatorData['loginPage'][g.LANG] );
                    $form.append(
                        self.getInputHTML('text', {
                            id: 'formAuthUsername',
                            label: 'username',
                            placeholder: 'yourUsername',
                            value: 'gnemtsov'
                        }),
                        self.getInputHTML('password', {
                            id: 'formAuthPassword',
                            label: 'password',
                            placeholder: 'yourPassword'
                        })
                    );
                    $submit.text( g._translatorData['enter'][g.LANG] );
                    $submit.on('click', self.signInHandler.bind(self));
                    $forget_link.on('click', self.forgotPasswordLinkHandler.bind(self));
                    $mfooter.append(
                        $forget_link,
                        $submit
                    );
                    break;

                case 'reset password': //reset password
                    $mtitle.text( g._translatorData['resetPassword'][g.LANG] );
                    $form.append(
                        self.getInputHTML('text', {
                            id: 'formAuthCode',
                            label: 'confirmationCode',
                            placeholder: 'yourConfirmationCode'
                        }),
                        self.getInputHTML('password', {
                            id: 'formAuthPassword',
                            label: 'password',
                            placeholder: 'yourPassword',
                            value: 'test1Pass'
                        }),
                        self.getInputHTML('password', {
                            id: 'formAuthPassword2',
                            label: 'password',
                            placeholder: 'repeatPassword',
                            value: 'test1Pass'
                        }) 
                    );
                    $submit.text( g._translatorData['resetPassword'][g.LANG] );
                    $submit.on('click', self.resetPasswordHandler.bind(self));
                    $mfooter.append($submit);
                    break;
            }

            if (!$modal.hasClass('show')) {
                $modal.modal('show');
            }
        }        

	}	

	//** constructor **/
	abAuth.init = function() {
        var self = this;

        self.promise = new Promise(function(resolve, reject){

            $username = $('#username');

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

            //tries to get user object from local storage
            self.cognitoUser = self.userPool.getCurrentUser();
            if (self.cognitoUser === null) {
                self.initModal();
                self.updateNavUsername();
                resolve();
            } else {
                //looks for session in variable
                //if not found, looks in local storage
                //if not found, tries to obtain session using refreshToken
                self.cognitoUser.getSession(function(error, session) {
                    if (error) {
                        reject(error);
                    } else if(session.isValid()){
                        self.loggedIn( session.getIdToken().getJwtToken() )
                            .then(
                                function(){ 
                                    self.updateNavUsername();
                                    resolve(); 
                                },
                                function(error){ 
                                    reject(error); 
                                }
                            );
                    } else {
                        self.initModal();
                        self.updateNavUsername();
                        resolve();
                    }
                });                
            }

        });
	}

	// trick borrowed from jQuery so we don't have to use the 'new' keyword
	abAuth.init.prototype = abAuth.prototype;
	// add our abAuth object to jQuery
	$.fn.abAuth = abAuth;

}(window, jQuery));  //pass external dependencies just for convenience, in case their names change outside later