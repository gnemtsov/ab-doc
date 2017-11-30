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

	// object prototype
	abAuth.prototype = {

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
            var self = this;
            if(_translatorData[code]){
                $alert.text(g._translatorData[code][g.LANG]);
            } else {
                $alert.text(g._translatorData['alertUnknownError'][g.LANG]);
            }
            $alert.show();
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
                            placeholder: 'yourUsername'
                        }) 
                    );
                    $form.append(
                        getInputHTML('text', {
                            id: 'formAuthEmail',
                            label: 'email',
                            placeholder: 'yourEmail'
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
                        getInputHTML('password', {
                            id: 'formAuthPassword2',
                            label: 'password',
                            placeholder: 'repeatPassword'
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

        isAuthorized: function(){
            var self = this;
            return self.session !== undefined && self.session.isValid();
        },

        loggedIn: function(providerName, token) {
            var self = this;
            self.creds.params.Logins = {};
            self.creds.params.Logins[providerName] = token;            
            self.creds.expired = true; // Expire credentials to refresh them on the next request

            self.cognitoUser.Attributes = {};
            self.cognitoUser.getUserAttributes(function(error, attributes){
                if(error) {
                    onError(error);
                } else {
                    attributes.forEach(function(attr){
                        var c = attr.Name.indexOf(':') + 1;
                        self.cognitoUser.Attributes[ attr.Name.slice(c)] = attr.Value;
                    });
                }
            });
            console.log('Auth.js: loggedIn through ' + providerName);
        },

        signIn: function(username, password) {
            var self = this;
            $submit.start();
            
            var authenticationDetails = new CISP.AuthenticationDetails({
                Username : username,
                Password : password,
            });
            
            self.cognitoUser = new CISP.CognitoUser({
                Username : username,
                Pool : self.userPool
            });

            self.cognitoUser.authenticateUser(authenticationDetails, {
                onSuccess: function (result) {
                    self.loggedIn(
                        self.CognitoProviderName, 
                        result.getAccessToken().getJwtToken()
                    );
                    self.updateNav();
                    ROUTER.open();
                },
                onFailure: function(error) {
                    $submit.stop();
                    self.showAlert(error.code);                                
                }
            });
        },

        signOut: function(providerName, token) {
            var self = this;
            self.cognitoUser.signOut();
            self.updateNav();
            ROUTER.open();
        },

        //handlers
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
            
            $submit.start();

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
                $submit.stop();
                
                if (error) {
                    if(error.message.indexOf("Value at 'password' failed to satisfy constraint") !== -1){
                        self.showAlert('InvalidPasswordException');                                
                    } else {
                        self.showAlert(error.code);                                
                    }
                } else {
                    self.cognitoUser = result.user;
                    self.username = username;
                    self.password = password;
                    self.showModal('confirm');
                }
            });
        },
                
        confirmHandler: function(){
            var self = this;
            var code = $('#formAuthCode').val();
            
            $submit.start();            
            self.cognitoUser.confirmRegistration(code, true, function(error, result) {
                $submit.stop();                
                if (error) {
                    self.showAlert(error.code);                                
                } else {
                    self.signIn(self.username, self.password);                
                }
            });
        },

        signInHandler: function(){
            var self = this;
            var username = $('#formAuthUsername').val(),
                password = $('#formAuthPassword').val();

            self.signIn(username, password);                
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

        $submit.start = function(){
            $submit.prop('disabled', true).before($small_preloader);
        }
        $submit.stop = function(){
            $submit.prop('disabled', false);
            $small_preloader.remove();
        }
        $submit.on('click', function(e){
            e.preventDefault();
            e.stopPropagation();
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

        if (self.cognitoUser != null) {
            self.cognitoUser.getSession(function(err, session) {
                if (err) {
                    onError(err);
                    return;
                }
                
                self.session = session;
                if(self.session.isValid()){
                    self.loggedIn(
                        self.CognitoProviderName, 
                        self.session.getIdToken().getJwtToken()
                    );                    
                    self.updateNav();
                } else {
                    console.log('session is invalid');
                }
            });
        }
                
	}

	// trick borrowed from jQuery so we don't have to use the 'new' keyword
	abAuth.init.prototype = abAuth.prototype;
	// add our abAuth object to jQuery
	$.fn.abAuth = abAuth;

}(window, jQuery));  //pass external dependencies just for convenience, in case their names change outside later
