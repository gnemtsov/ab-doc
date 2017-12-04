"use strict";

/******************************************************************/
/***************************Authorization**************************/
/******************************************************************/
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

        //sets user creds after successful login and gets user's attributes
        //callback will always be called, but with error if getUserAttributes fails
        loggedIn: function(providerName, token, callback) {
            var self = this;

            self.cognitoUser.Attributes = {};
            self.cognitoUser.getUserAttributes(function(error, attributes){
                if(error) {
                    onError(error);
                    callback(error);
                } else {
                    self.creds.params.Logins = {};
                    self.creds.params.Logins[providerName] = token;            
                    self.creds.expired = true; // Expire credentials to refresh them on the next request
                    attributes.forEach(function(attr){
                        var c = attr.Name.indexOf(':') + 1;
                        self.cognitoUser.Attributes[ attr.Name.slice(c)] = attr.Value;
                    });
                    self.identityId = self.creds.identityId;
                    console.log('Auth.js: loggedIn through ' + providerName);
                    callback();
                }
            });
        },

        //sign in user with username and password from self.tmpAuthDetails
        signIn: function() {
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
                        self.CognitoProviderName, 
                        session.getIdToken().getJwtToken(),
                        function(error){
                            if(error){
                                return;
                            }
                            self.updateNav();
                            ROUTER.setOwner(self.identityId).open();
                            $submit.release();
                            $modal.modal('hide');                            
                        }
                    );
                },
                onFailure: function(error) {
                    self.tmpAuthDetails = void(0);
                    $submit.release();
                    self.showAlert(error.code);                                
                }
            });
        },

        //sign out user and ROUTER.open() root
        signOut: function() {
            var self = this;
            self.cognitoUser.signOut();
            self.updateNav();
            ROUTER.setOwner().open();
        },


        //-----UI functions-----
        updateNav: function(){
            var self = this;
            if(self.isAuthorized()){
                $('.authenticated-mode').show();
                $('.unauthenticated-mode').hide();
                $username.text(self.cognitoUser.username);
            } else {
                $('.authenticated-mode').hide();
                $('.unauthenticated-mode').show();
                $username.text(g._translatorData['account'][g.LANG]);
            }
            $username.addClass('loaded');
        },

        showAlert: function(code){
            console.log(code);
            var self = this;
            if(g._translatorData[code]){
                $alert.text(g._translatorData[code][g.LANG]);
            } else {
                $alert.text(g._translatorData['alertUnknownError'][g.LANG]);
            }
            $alert.fadeIn('fast');
        },

        showModal: function(type){
            var self = this;

            switch(type){
                case 'signUp': //sign up
                    $modal.find('.modal-title').text( g._translatorData['registration'][g.LANG] );
                    $form.html(
                        getInputHTML('text', {
                            id: 'formAuthUsername',
                            label: 'username',
                            placeholder: 'yourUsername',
                            value: 'testuser'
                        }) 
                    );
                    $form.append(
                        getInputHTML('text', {
                            id: 'formAuthEmail',
                            label: 'email',
                            placeholder: 'yourEmail',
                            value: 'support@erp-lab.com'
                        }) 
                    );
                    $form.append(
                        getInputHTML('password', {
                            id: 'formAuthPassword',
                            label: 'password',
                            placeholder: 'yourPassword',
                            value: 'test1Pass'
                        }) 
                    );
                    $form.append(
                        getInputHTML('password', {
                            id: 'formAuthPassword2',
                            label: 'password',
                            placeholder: 'repeatPassword',
                            value: 'test1Pass'
                        }) 
                    );
                    $form.append(
                        getInputHTML('hidden', {
                            id: 'formAuthAction',
                            value: 'signUp'
                        })
                    )
                    $submit.text( g._translatorData['signUp'][g.LANG] );
                    break;

                case 'confirm':  //confirm
                    $modal.find('.modal-title').text( g._translatorData['account confirmation'][g.LANG] );
                    $form.html(
                        getInputHTML('text', {
                            id: 'formAuthCode',
                            label: 'confirmationCode',
                            placeholder: 'yourConfirmationCode'
                        }) 
                    );
                    $form.append(
                        getInputHTML('hidden', {
                            id: 'formAuthAction',
                            value: 'confirm'
                        })
                    )
                    $submit.text( g._translatorData['confirm'][g.LANG] );
                    break;

                case 'signIn': //sign in
                    $modal.find('.modal-title').text( g._translatorData['loginPage'][g.LANG] );
                    $form.html(
                        getInputHTML('text', {
                            id: 'formAuthUsername',
                            label: 'username',
                            placeholder: 'yourUsername'
                        }) 
                    );
                    $form.append(
                        getInputHTML('password', {
                            id: 'formAuthPassword',
                            label: 'password',
                            placeholder: 'yourPassword'
                        }) 
                    );
                    $form.append(
                        getInputHTML('hidden', {
                            id: 'formAuthAction',
                            value: 'signIn'
                        })
                    )
                    $submit.text( g._translatorData['enter'][g.LANG] );
                    break;
            }
            $modal.modal('show');

            function getInputHTML(type, params){
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
                    case 'text':
                    case 'password':
                        return '<div class="form-group input-group">' + 
                                    '<span class="input-group-addon">'+g._translatorData[params.label][g.LANG]+'</span>' + 
                                    '<input id="'+params.id+'" type="'+type+'" class="form-control" placeholder="'+g._translatorData[params.placeholder][g.LANG]+'" value="'+params.value+'"></input>' + 
                                '</div>';
                    case 'hidden':
                        return '<input id="'+params.id+'" type="hidden" value="'+params.value+'"></input>';
                }
            }

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
                $submit.release();
                
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
            });
        },
                
        confirmHandler: function(){
            var self = this;
            var code = $('#formAuthCode').val();
            
            self.cognitoUser.confirmRegistration(code, true, function(error, result) {
                $submit.release();                
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

        $modal.keypress(function(e){
            if(e.which == 13) {
                $submit.trigger('click', e);
            }
        });

        $submit.on('click', function(e){
            e.preventDefault();
            e.stopPropagation();
            $submit.prop('disabled', true).before($small_preloader);
            $alert.hide();
            switch($('#formAuthAction').val()){
                case 'signUp':
                    self.signUpHandler();
                    break;
                case 'confirm':
                    self.confirmHandler();
                    break;
                case 'signIn':
                    self.signInHandler();
                    break;
            }    
        });
        $submit.release = function(){
            $submit.prop('disabled', false);
            $small_preloader.remove();
        };

        self.UserPoolId = 'eu-west-1_dtgGGP4kG';
        self.ClientId = '1eflaa2k69bgebikbnak5jg0ac';
        self.IdentityPoolId = 'eu-west-1:e6ca203a-aead-49ba-a7e3-5c3c02cb1cf6';
        self.CognitoProviderName = 'cognito-idp.eu-west-1.amazonaws.com/eu-west-1_dtgGGP4kG';

        self.creds = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: self.IdentityPoolId
        });

        self.poolData = {
            UserPoolId : self.UserPoolId,
            ClientId : self.ClientId
        };
        self.userPool = new CISP.CognitoUserPool( self.poolData );
        self.cognitoUser = self.userPool.getCurrentUser();

        if (self.cognitoUser === null) {
            self.promise = Promise.resolve();
        } else {
            self.promise = new Promise(function(resolve, reject){
                self.cognitoUser.getSession(function(error, session) {
                    if (error) {
                        onError(error);
                        reject(error);
                    } else {
                        if(session.isValid()){
                            self.loggedIn(
                                self.CognitoProviderName, 
                                session.getIdToken().getJwtToken(),
                                function(error){
                                    if(error){
                                        reject(error);                                        
                                        return;
                                    }
                                    self.updateNav();
                                    resolve();                                    
                                }
                            );                    
                        } else {
                            resolve();
                        }
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
