"use strict";

/******************************************************************/
/***************************Authorization**************************/
/******************************************************************/
//some examples
//https://github.com/aws/amazon-cognito-identity-js
//https://gist.github.com/damonmaria/d4daac2dac8014cffd9d5872355a4ad4
//turn off google access: https://myaccount.google.com/permissions?pli=1
//TODO store account confirmation pending status in local storage + ExpiredCodeException

(function (g, $) {

    var $username;
    var $modal, $mtitle, $mbody, $mfooter;
    var $alert_container, $alert;
    var $form, $submit, $forget_link, $google_link;

    var CISP = AWSCognito.CognitoIdentityServiceProvider;

    //userData object
    //responsible for holding user data and syncing with identity pool dataset
    var userData = function(tmpUsername, tmpEmail) {
        var self = this;

        self.get = function(key){
            var out;
            self.cognitoSyncDataset.get(key, function(error, value) {
                if(error){
                    abUtils.onError(error);
                } else {
                    out = value;
                }
            });
            return out;
        };
        self.put = function(key, value){
            self.cognitoSyncDataset.put(key, value, function(error, record) {
                if(error){
                    abUtils.onError(error);
                }
            });
        };
        self.sync = function(winner){ //winner defines who wins in case of conflict: local VS remote
            return new Promise(function(resolve, reject){

                var syncConfig = { //config for cognito sync manager, see https://github.com/aws/amazon-cognito-js (step 6)
                    onSuccess: function(dataset, newRecords) {
                        resolve();
                    },
                    onFailure: function(error) {
                        reject(error);
                    },
                    onConflict: function(dataset, conflicts, callback) {
                        var resolved = [];
                        for (var i=0; i<conflicts.length; i++) {
                            switch(winner){
                                case 'local':
                                    resolved.push(conflicts[i].resolveWithLocalRecord()); //Take local version.
                                    break;
                                case 'remote':
                                    resolved.push(conflicts[i].resolveWithRemoteRecord()); //Take remote version.
                                    break;
                                default:
                                    reject('Auth.js: error in userData.sync(). Winner can be "local" or "remote", but "'+winner+'" given.');
                            }
                        }
                        dataset.resolve(resolved, function() {
                            return callback(true);
                        });
                    },
                    onDatasetDeleted: function(dataset, datasetName, callback) {
                        return callback(true);
                    },
                    onDatasetsMerged: function(dataset, datasetNames, callback) {
                        return callback(true);
                    }
                };

                self.cognitoSyncDataset.synchronize( syncConfig );

            });
        };
        
        self.promise = new Promise(function(resolve, reject){
            self.cognitoSyncClient = new AWS.CognitoSyncManager();
            self.cognitoSyncClient.openOrCreateDataset('abDoc', function(error, dataset) {
                if(error){
                    reject(error);
                } else {
                    self.cognitoSyncDataset = dataset;
                    if(tmpUsername !== undefined && tmpEmail !== undefined){
                        self.put('account-type', 'free');
                        self.put('space-limit', '1000');
                        self.put('username', tmpUsername);
                        self.put('email', tmpEmail);
                    }
                    resolve();
                }
            });                
        }).then(function(){
            return self.sync('remote');
        });

    }

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
            switch(self.userType){
                case 'cognito':
                    return self.cognitoUser !== undefined &&
                           self.cognitoUser !== null &&
                           self.cognitoUser.signInUserSession !== undefined &&
                           self.cognitoUser.signInUserSession !== null &&
                           self.cognitoUser.signInUserSession.isValid();

                case 'google':
                    return self.googleUser !== undefined &&
                           self.googleUser !== null &&
                           self.googleUser.isSignedIn();

                default:
                    return false;
            }
        },

        //after successful login, returns promise
        //updates AWS.credentials
        //sets identity in federated identity pool
        loggedIn: function(providerName, idToken) {
            console.log('Auth.js: loggedIn called');
            var self = this;

            //refresh credentials promise and create userData object
            var promise = new Promise(function(resolve, reject){
                self.credentials.params.Logins = {};
                self.credentials.params.Logins[ providerName ] = idToken;            
                self.credentials.expired = true; // Expire credentials to refresh them on the next request
                self.credentials.get(function(error){
                    if(error){
                        reject(error)
                    } else {
                        self.userData = new userData(self.tmpUsername, self.tmpEmail);
                        self.userData.promise.then(
                            function(){
                                delete self.tmpUsername;
                                delete self.tmpEmail;
                                resolve(); 
                            },
                            function(error){ 
                                reject(error) 
                            }
                        );
                    }
                });
            });

            //Set refreshSession TIMER, it obtains new ID and ACCESS tokens
            //timer is set for 50 minutes, because tokens live for 1 hour
            //cognito refresh token lives for 3649 days and is set in UserPool > General Settings > App clients
            TIMERS.set( function(){

                if(self.cognitoUser !== undefined){

                    self.cognitoUser.refreshSession(
                        self.cognitoUser.signInUserSession.getRefreshToken(), 
                        function(error, session){
                            if (error) {
                                abUtils.onError(error);
                                self.signOut();
                            } else {
                                self.credentials.params.Logins = {};
                                self.credentials.params.Logins[ self.CognitoProviderName ] = session.getIdToken().getJwtToken();
                                self.credentials.expired = true; // Expire credentials to refresh them on the next request
                                console.log('Auth.js: cognitoUser tokens refreshed at ' + Date() );
                            }                                        
                        }
                    );

                } else if(self.googleUser !== undefined){

                    self.googleUser
                        .reloadAuthResponse()
                        .then( function(new_credentials){
                            self.credentials.params.Logins = {};
                            self.credentials.params.Logins[ self.GoogleProviderName ] = new_credentials.id_token;
                            self.credentials.expired = true; // Expire credentials to refresh them on the next request
                            console.log('Auth.js: googleUser tokens refreshed at ' + Date() );
                        })
                        .catch( function(error){
                            abUtils.onError(error);
                            self.signOut();
                        }
                    );

                }

            }, 3000000, 'auth' );

            return promise;
        },

        //signUp new user in cognito user pool, returns promise
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
            
                self.userPool.signUp(username, password, attributeList, null, function(error, result){                
                    if (error) {
                        reject(error);
                    } else {
                        self.cognitoUser = result.user;
                        self.tmpUsername = username;
                        self.tmpEmail = email;
                        resolve();
                    }
                });
            });
        },

        //signIn user in cognito user pool, returns promise
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

				self.tmpPassword = password;
                self.cognitoUser.authenticateUser(authenticationDetails, {
                    onSuccess: function (session) {
                        self.loggedIn( self.CognitoProviderName, session.getIdToken().getJwtToken() )
                            .then(
                                function(){ 
                                    self.userType = 'cognito';
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

        //confirm user registration in cognito user pool
        confirmRegistration: function(code) {
            var self = this;
            return new Promise (function(resolve, reject){
                self.cognitoUser.confirmRegistration(code, true, function(error, result) {
                    if (error) reject(error);                                
                    else resolve();
                });
            });
        },        

        //start forgot password flow (cognito user pool)
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

        //reset forgotten password (cognito user pool)
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

        //sign out user & reload page
        signOut: function() {
            var self = this;

            new Promise(function(resolve, reject) {
                if(self.cognitoUser !== undefined){
                    console.log('Auth.js: Cognito sign out.');
                    self.cognitoUser.signOut();
                    resolve();
                } else if(g.googleyolo !== undefined){
                    console.log('Auth.js: Google sign out.');
                    Promise.all([
                        g.googleyolo.disableAutoSignIn(),
                        self.googleAuth.signOut()
                    ]).then(function(){
                        resolve();
                    }).catch(function(error){
                        console.log(error);
                        resolve();
                    });
                } else {
                    reject('Undefined account type. Do not know, how to sign out.')
                }
            }).then(function(){
                g.sessionStorage.clear();
                g.localStorage.clear();
                g.docCookies.keys().forEach(function(item){
                    g.docCookies.removeItem(item);
                });
                g.localStorage.setItem('abNoGoogleRetrieve', 1);
                g.location.reload();
            }).catch(function(error){
                console.log(error);
                abUtils.onError(error);
            });
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
                    console.log(error);
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
					if (error.name === 'UserNotConfirmedException') {
						self.showModal('confirm');
					} else {
						self.showAlert(error.code);
						console.log(error);
					}                               
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
                $username.text(self.userData.get('username'));
            } else {
                $('.authenticated-mode').addClass('hidden');

                $('.unauthenticated-mode').not('.link-google').removeClass('hidden');
                if(self.googleAuth !== undefined){
                    $('.unauthenticated-mode.link-google').removeClass('hidden');
                }
                $username.text(g.abUtils.translatorData['account'][g.LANG]);
            }
            $username.addClass('loaded');
        },

        showAlert: function(code, alert_class){
            var self = this;
            if(alert_class === undefined){
                alert_class = 'alert-danger';
            }
            if(g.abUtils.translatorData[code]){
                $alert.text(g.abUtils.translatorData[code][g.LANG]);
            } else {
                $alert.text(g.abUtils.translatorData['alertUnknownError'][g.LANG]);
            }
            $alert.removeClass('alert-success alert-info alert-warning alert-danger')
                  .addClass(alert_class);
            $alert_container.fadeIn('fast');
        },

        showGoogleHintsOrSignIn: function(forceSignIn){
            var self = this;

            if(g.googleyolo === undefined){
                console.log('Auth.js: Google sign in...');
                return self.googleAuth.signIn();
            } else {
                g.googleyolo
                    .hint(self.googleAuthParams)
                    .catch(function(error) {
                        if(forceSignIn && ['unsupportedBrowser', 'noCredentialsAvailable'].indexOf(error.type) !== -1){
                            console.log('Auth.js: Google hints unavailable! However, we can still use default google sign in...');
                            return;
                        } else {
                            throw error;
                        }
                    })
                    .then(function() {
                        console.log('Auth.js: Google sign in...');
                        return self.googleAuth.signIn();
                    })
                    .then(function(user){
                        self.userType = 'google';
                        self.googleUser = user;
                        self.tmpUsername = user.getBasicProfile().getName(); //set this data - it can be first user visit
                        self.tmpEmail = user.getBasicProfile().getEmail();
                        g.localStorage.setItem('abNoGoogleRetrieve', 0);
                        return self.loggedIn( self.GoogleProviderName, user.getAuthResponse().id_token );
                    })
                    .then(function(){
                        self.updateNavUsername();
                        g.ROUTER.setOwner(g.ROUTER.owner).open(g.ROUTER.doc);
                        return;
                    })
                    .catch(function(error) {
                        console.log(error);
                        var mute_errors = ['requestFailed', 'userCanceled', 'operationCanceled', 'illegalConcurrentRequest', 'unsupportedBrowser', 'noCredentialsAvailable'];
                        if(error.error === 'popup_blocked_by_browser'){
                            abUtils.onError('popup_blocked_by_browser');
                        } else if(mute_errors.indexOf(error.type) === -1 && error.error !== 'popup_closed_by_user') {
                            abUtils.onError(error);
                        } 
                    });
            }
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
                                '<span class="input-group-addon">'+g.abUtils.translatorData[params.label][g.LANG]+'</span>' + 
                                '<input id="'+params.id+'" type="'+type+'" class="form-control" placeholder="'+g.abUtils.translatorData[params.placeholder][g.LANG]+'" value="'+params.value+'"></input>' + 
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

            $forget_link = $('<a href="#">'+g.abUtils.translatorData['forgotPassword'][g.LANG]+'</a>');
            $google_link = $('<a href="#">'+g.abUtils.translatorData['loginWithGoogle'][g.LANG]+'</a>');

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
                abUtils.onError('Modal was not initialized');
                return;
            }

            if(g.googleyolo !== undefined){
                g.googleyolo.cancelLastOperation();
            }

            $alert_container.hide();
            $form.empty();
            $mfooter.empty();

            switch(type){
                case 'signUp': //sign up
                    $mtitle.text( g.abUtils.translatorData['registration'][g.LANG] );
                    $form.append(
                        self.getInputHTML('text', {
                            id: 'formAuthUsername',
                            label: 'username',
                            placeholder: 'yourUsername'
                        }),  
                        self.getInputHTML('text', {
                            id: 'formAuthEmail',
                            label: 'email',
                            placeholder: 'yourEmail'
                        }), 
                        self.getInputHTML('password', {
                            id: 'formAuthPassword',
                            label: 'password',
                            placeholder: 'yourPassword'
                        }),
                        self.getInputHTML('password', {
                            id: 'formAuthPassword2',
                            label: 'password',
                            placeholder: 'repeatPassword'
                        }) 
                    );                    
                    $submit.text( g.abUtils.translatorData['signUp'][g.LANG] );
                    $submit.on('click', self.signUpHandler.bind(self));
                    if(self.googleAuth !== undefined){
                        $google_link.on('click', function(){
                            $modal.modal('hide');
                            self.showGoogleHintsOrSignIn(1);
                        });
                        $mfooter.append($google_link);
                    }
                    $mfooter.append($submit);
                    break;

                case 'confirm':  //confirm
                    $mtitle.text( g.abUtils.translatorData['account confirmation'][g.LANG] );
                    $form.append(
                        self.getInputHTML('text', {
                            id: 'formAuthCode',
                            label: 'confirmationCode',
                            placeholder: 'yourConfirmationCode'
                        })
                    );
                    $submit.text( g.abUtils.translatorData['confirm'][g.LANG] );
                    $submit.on('click', self.confirmHandler.bind(self));
                    $mfooter.append($submit);
                    break;

                case 'signIn': //sign in
                    $mtitle.text( g.abUtils.translatorData['loginPage'][g.LANG] );
                    $form.append(
                        self.getInputHTML('text', {
                            id: 'formAuthUsername',
                            label: 'username',
                            placeholder: 'yourUsername'
                        }),
                        self.getInputHTML('password', {
                            id: 'formAuthPassword',
                            label: 'password',
                            placeholder: 'yourPassword'
                        })
                    );
                    $submit.text( g.abUtils.translatorData['enter'][g.LANG] );
                    $submit.on('click', self.signInHandler.bind(self));
                    $forget_link.on('click', self.forgotPasswordLinkHandler.bind(self));
                    $mfooter.append(
                        $forget_link,
                        $submit
                    );
                    break;

                case 'reset password': //reset password
                    $mtitle.text( g.abUtils.translatorData['resetPassword'][g.LANG] );
                    $form.append(
                        self.getInputHTML('text', {
                            id: 'formAuthCode',
                            label: 'confirmationCode',
                            placeholder: 'yourConfirmationCode'
                        }),
                        self.getInputHTML('password', {
                            id: 'formAuthPassword',
                            label: 'password',
                            placeholder: 'yourPassword'
                        }),
                        self.getInputHTML('password', {
                            id: 'formAuthPassword2',
                            label: 'password',
                            placeholder: 'repeatPassword'
                        }) 
                    );
                    $submit.text( g.abUtils.translatorData['resetPassword'][g.LANG] );
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

        //main auth promise
        self.promise = new Promise(function(resolve, reject){
            $username = $('#username');

            self.CognitoProviderName = 'cognito-idp.eu-west-1.amazonaws.com/eu-west-1_dtgGGP4kG';
            self.GoogleProviderName = 'accounts.google.com';
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

            AWS.config.credentials = self.credentials;

            //tries to get user object from local storage
            var cognitoUser = self.userPool.getCurrentUser();
            if (cognitoUser === null) {
                console.log('Auth.js: Current cognitoUser is null!');
                resolve(0);
            } else {
                self.userType = 'cognito';
                self.cognitoUser = cognitoUser;
                //looks for session in variable
                //if not found, looks in local storage
                //if not found, tries to obtain session using refreshToken
                self.cognitoUser.getSession(function(error, session) {
                    if (error) {
                        reject(error);
                    } else if(session.isValid()){
                        console.log('Auth.js: Already authorized by cognito! Signing in...');
                        self.loggedIn( self.CognitoProviderName, session.getIdToken().getJwtToken() )
                            .then(function(){ 
                                resolve(1); 
                            })
                            .catch(function(error){ 
                                reject(error); 
                            });
                    } else {
                        resolve(0);
                    }
                });                
            }

        }).then(function(authorized){

           return new Promise(function(resolve, reject){

                if(authorized){ //already authorized by cognito

                   self.updateNavUsername();
                    resolve();

                } else { //try to authorize using Google sign in service
                    
                    self.googleClientId = "1010406543475-vd7rc1gcevq3er1v3fuf9raf5fipmefg.apps.googleusercontent.com";

                    var authPromise = new Promise(function(resolve, reject){
                        gapi.load(
                            'auth2', 
                            {
                                callback: function() {
                                    gapi.auth2.init({
                                        client_id: self.googleClientId,
                                        scope: 'profile email'
                                    }).then(
                                        function(){
                                            console.log('Auth.js: self.googleAuth ready.');
                                            self.googleAuth = gapi.auth2.getAuthInstance();
                                            resolve();
                                        },
                                        function(error){
                                            console.log('Auth.js: self.googleAuth init failed!', error);
                                            reject();
                                        }
                                    );
                                },
                                onerror: function() {
                                    console.log('Auth.js: gapi.auth2 failed to load!');
                                    reject();
                                },
                                timeout: 5000, // 5 seconds.
                                ontimeout: function() {
                                    console.log('Auth.js: gapi.auth2 failed could not load in a timely manner!');
                                    reject();
                                }
                            }
                        );
                    });

                    Promise.all([authPromise, g.yoloPromise]).then(function(){ //auth and yolo ready, let's rock!

                        if(self.googleAuth.isSignedIn.get()){

                            console.log('Auth.js: Already authorized by Google! Signing in...');
                            self.userType = 'google';
                            self.googleUser = self.googleAuth.currentUser.get();                            
                            var credential = self.googleUser.getAuthResponse(true);
                            self.loggedIn( self.GoogleProviderName, credential.id_token )
                                .then( function(){
                                    self.updateNavUsername();
                                    resolve();
                                });

                        } else {

                            console.log('Auth.js: Using Google one tap service!');
                            self.googleAuthParams = {
                                supportedAuthMethods: [ "https://accounts.google.com" ],
                                supportedIdTokenProviders: [{
                                    uri: "https://accounts.google.com",
                                    clientId: self.googleClientId
                                }]
                            };

                            if( g.localStorage.getItem('abNoGoogleRetrieve') === '1' ){ 
                                console.log('Auth.js: Google retrieve switched off, just show hints!');
                                self.showGoogleHintsOrSignIn(0);
                                self.updateNavUsername();
                                self.initModal();
                                resolve();
                            } else {
                                g.googleyolo
                                    .retrieve(self.googleAuthParams)
                                    .then(function(credential) {
                                        console.log('Auth.js: Google credentails retrieved! Signing in...');
                                        return self.googleAuth.signIn();
                                    })
                                    .then(function(user){
                                        self.userType = 'google';
                                        self.googleUser = user;
                                        return self.loggedIn( self.GoogleProviderName, user.getAuthResponse().id_token );
                                    })
                                    .then( function(){
                                        self.updateNavUsername();
                                        resolve();
                                    })
                                    .catch(function(error){ //google auth using retreive failed, init auth modal & show google hints
                                    if (error.type === 'noCredentialsAvailable') {
                                            console.log('Auth.js: Google credentails not retrieved, show hints!');
                                            self.showGoogleHintsOrSignIn(0);
                                        } else {
                                            console.log(error);
                                        }
                                        self.updateNavUsername();
                                        self.initModal();
                                        resolve();
                                    });
                            }
                        }

                    })
                    .catch(function(){ //even if google auth services failed resolve Auth promise!
                        self.updateNavUsername();
                        self.initModal();
                        resolve();  
                    });

                }
                
            });

        });
          
	}

	// trick borrowed from jQuery so we don't have to use the 'new' keyword
	abAuth.init.prototype = abAuth.prototype;
	// add our abAuth object to jQuery
	$.fn.abAuth = abAuth;

}(window, jQuery));  //pass external dependencies just for convenience, in case their names change outside later
