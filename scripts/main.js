"use strict";

//------------------------------------------------
//------------- console.log on/off ---------------
//------------------------------------------------

$(function() {
	if (window.location.hostname === 'ab-doc.com') {
		console.log = function() {};
		PRODUCTION = true;
	}
});
// ====================

AWSCognito.config.region = 'us-west-2';
AWS.config.region = 'us-west-2';

var poolData = {
    UserPoolId : 'us-west-2_eb7axoHmO',
    ClientId : '1p7uks7hoothql33e17mssr7q1'
};

var USER_POOL = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);


function _errorPopover(c) {
	$('nav').popover({
		content: c,
		container: 'nav',
		animation: true,
		placement: 'bottom',
		trigger: 'manual',
		template: '\
			<div class="popover bg-danger" role="tooltip">\
				<div class="popover-body text-light"></div>\
			</div>'
	});
}

function onError(err) {
	if (err) {
		console.log("Error!", err);
	}
	
	$('.preloader-container').hide();
	_errorPopover(_translatorData['somethingWentWrong'][LANG]);
	$('nav').popover('show');
	setTimeout(function() {
		$('nav').popover('hide');
	}, 5000);
}

function onWarning(msg) {
	$('.preloader-container').hide();
	_errorPopover(msg);
	$('nav').popover('show');
	setTimeout(function() {
		$('nav').popover('hide');
	}, 2500);
}

var s3,
	USERID, // Id of a currently logged in user
	TREE_USERID, // Id of a user, whose tree is shown
	AWS_CDN_ENDPOINT = "https://s3-eu-west-1.amazonaws.com/ab-doc-storage/",
	STORAGE_BUCKET = "ab-doc-storage",
	LANG = localStorage.getItem('ab-doc.translator.lang') ? localStorage.getItem('ab-doc.translator.lang') : 'en',
	PRODUCTION = false,
	TREE_READY = false, // Is tree.json loaded?
	TREE_FILENAME = "tree.json",
	TREE_KEY,
	TREE_READONLY,
	FILES_MODIFIED = false,
	COGNITO_USER,
	ROOT_DOC_GUID = 'root-doc',
	DEFAULT_ROOT_DOC_LOCATION = 'root/'+LANG+'.html',
	sizeIndicator;

//TIMERS object to track all timers and prevent memory leaks
var TIMERS = {
	on: true,    //timers are ON when true
	set: function(callback, interval, name){ //call TIMERS.set('name') to create new timer
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
	execute: function(name){ //call TIMERS.execute('name') to run timer's code
		if (this.hasOwnProperty(name)) {
			this[name].execute();
		} else {
			console.log('TIMERS.execute: ' + name + ' doesn`t exist'); 
		}
	},
	destroy: function(name){
		if (this.hasOwnProperty(name)) {
			this[name].destroy(); //call TIMERS.destroy('name') to manually clear timer
		} else {
			console.log('TIMERS.destroy: ' + name + ' doesn`t exist'); 
		}	
	},

	Timer: function(callback, interval){ //timer constructor
		this.id = setInterval(callback, interval);
		this.execute = callback;
		this.destroy = function(){ clearInterval(this.id); };
	}
};

//ACTIVITY object stores activities states and updates indicator in navbar.
//Activities: doc edit, file [guid] upload, file [guid] delete or whatever.
//Two possible states: pending or saving.
//Each activity on each specific object must be reported independently!
//"saving" class is "!important", so it dominates if both classes are active
var ACTIVITY = {
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


$(document).ready( function() {
	var $main = $('#main'),
		$about = $('#about'),
		$preloader = $('.preloader-container');

	setUnknownMode();
	
	initS3()
		.then( function(ok) {
			return initTree();
		})
		.then( function() {
			// If we have COGNITO_USER, we set authenticated mode
			// If not, authenticated mode is set from googleSignInSuccess
			// TODO: not good. Make global USERNAME variable and use it in setAuthenticatedMode
			if (COGNITO_USER) {
				setAuthenticatedMode(COGNITO_USER.username);
			}
			routerOpen();
			updateUsedSpace();
		})
		.catch( function(err) {
			switch(err.name) {
				case 'NotSignedIn':
					setUnauthenticatedMode();
					break;
				default:
					onError(err);
					if (AWS.config.credentials) {
						AWS.config.credentials.clearCachedId();
					}
					/*setTimeout(	function() {
						window.location.reload(false);
					}, 2500);*/
			}
		});
	
	$('.link-sign-out, .link-return').click( function() {
		var promise;
		
		// Sign out cognito user
		if (COGNITO_USER) {
			COGNITO_USER.signOut();
			promise = Promise.resolve();
		}
		
		// Sign out google user
		if(true) {
			var auth2 = gapi.auth2.getAuthInstance();
			promise = auth2.signOut()
		}
		
		promise
			.catch( function(err) {
				onError(err);
				return true;
			})
			.then( function() {
				if (AWS.config.credentials) {
					AWS.config.credentials.clearCachedId();
				}
				AWS.config.credentials = null;
				setUnauthenticatedMode();
			});

		return true;	
	});	

	$('body').on('click', 'a.navbar-brand', function (e) {
		// Open root on brand logo click
		e.preventDefault();
		$preloader.hide();		
		$about.hide();
		$main.show();
		routerOpen(ROOT_DOC_GUID);
	});
	
	$('body').on('click', 'a.link-sign-in', function (e) {
		// Signing in
		e.preventDefault();
		$('#modalSignIn').modal('show');
	});
	
	$('body').on('click', 'a.link-sign-up', function (e) {
		// Signing up
		e.preventDefault();
		$('#modalSignUp').modal('show');
	});
	
	$('#btnSignIn').click( function() {
		$('#alertSignInError').hide();
		$('#btnSignIn').prop('disabled', true);
		$('#preloaderSignIn').show();
		var code;
		if ($('#signInConfirmationCode').is(':visible')) {
			code = $('#signInConfirmationCode').val();
		}
		new Promise( function(resolve, reject) {
			if(!$('#signInEmail').val()) {
				reject(ABError('NoUsername'));
			} else {
				resolve();
			}
		})
			.then( function() {
				console.log('SignIn 0/3');
				return signInCognito($('#signInEmail').val(), $('#signInPassword').val(), code);
			})
			.then( function() {
				console.log('SignIn 1/3');
				return initS3();
			})
			.then( function() {
				console.log('SignIn 2/3');
				return initTree();
			})
			.then( function() {
				console.log('SignIn 3/3');
				setAuthenticatedMode(COGNITO_USER.username);
				window.routerOpen();
				$('#btnSignIn').prop('disabled', false);
				$('#preloaderSignIn').hide();
				$('#modalSignIn').modal('hide');
				console.log('SignIn Ok');
			})
			.catch( function (err) {
				console.log(err);
				switch(err.name) {
					case 'UserNotFoundException':
						$('#alertSignInError').html(_translatorData['alertUserDoesntExist'][LANG]);
						$('#alertSignInError').show();
						break;
					case 'NotAuthorizedException':
						$('#alertSignInError').html(_translatorData['alertWrongPassword'][LANG]);
						$('#alertSignInError').show();
						break;		
					case 'UserNotConfirmedException':
						$('#divSignInConfirmationCode').show();
						break;
					case 'CodeMismatchException':
						$('#alertSignInError').html(_translatorData['alertWrongCode'][LANG]);
						$('#alertSignInError').show();
						break;
					case 'ExpiredCodeException':
						$('#alertSignInError').html(_translatorData['alertExpiredCode'][LANG]);
						$('#alertSignInError').show();
						resendConfirmationCode($('#signInEmail').val())
							.catch( function(err) {
								onError(err);
							});
						break;	
					case 'NoUsername':
						$('#alertSignInError').html(_translatorData['alertNoUsername'][LANG]);
						$('#alertSignInError').show();
						break;					
					default:
						$('#alertSignInError').html(_translatorData['alertUnknownLoginError'][LANG]);
						$('#alertSignInError').show();						
						onError(err);
				}
				$('#btnSignIn').prop('disabled', false);
				$('#preloaderSignIn').hide();
			})
	});
	
	$('#forgotPassword').click( function() {
		$('#alertSignInError').hide();
		$('#modalSignIn').find('.sign-in').hide();
		$('#modalSignIn').find('.forgot-password').show();
		$('#modalSignIn').find('.reset-password').hide();
		$('#modalSignIn .modal-title').html(_translatorData['resetPasswordPage'][LANG]);
		$('#forgotPasswordEmail').val($('#signInEmail').val());
	});
	
	$('#btnSendCode').click( function() {
		$('#btnSendCode').prop('disabled', true);
		$('#preloaderForgotPassword').show();
		$('#alertSignInError').hide();	
		requestResetPassword($('#forgotPasswordEmail').val())
			.then( function() {
				console.log('email was sent');
				$('#modalSignIn').find('.sign-in').hide();
				$('#modalSignIn').find('.forgot-password').hide();
				$('#modalSignIn').find('.reset-password').show();
			})
			.catch( function(err) {
				$('#alertSignInError').html(_translatorData['alertUnknownError'][LANG]);
				$('#alertSignInError').show();		
				onError(err);
			})
			.then( function() {
				$('#btnSendCode').prop('disabled', false);
				$('#preloaderForgotPassword').hide();
			})
	});
	
	$('#btnConfirmResetPassword').click( function() {
		$('#alertSignInError').hide();
		$('#btnConfirmResetPassword').prop('disabled', true);
		$('#preloaderConfirmReset').show();
		var code = $('#resetConfirmationCode').val();
		
		var email = $('#forgotPasswordEmail').val(),
			password = $('#resetPassword').val(),
			password2 = $('#resetRepeatPassword').val();
		confirmResetPassword(email, password, password2, code)
			.then( function() {
				return signIn(email, password);
			})
			.then( function() {
				return initS3();
			})
			.then( function() {
				return initTree();
			})
			.then( function() {
				setAuthenticatedMode(COGNITO_USER.username);
				routerOpen();
				$('#modalSignIn').modal('hide');
			})
			.catch( function (err) {
				console.log(err.name, 'Here!');
				switch(err.name) {
					case 'CodeMismatchException':
						$('#alertSignInError').html(_translatorData['alertWrongCode'][LANG]);
						$('#alertSignInError').show();
						break;
					case 'InvalidParameterException':
						$('#alertSignInError').html(_translatorData['alertBadPassword'][LANG]);
						$('#alertSignInError').show();
						break;
					case 'InvalidPasswordException':
						$('#alertSignInError').html(_translatorData['alertBadPassword'][LANG]);
						$('#alertSignInError').show();
						break;
					case 'UsernameExistsException':
						$('#alertSignInError').html(_translatorData['alertUserExists'][LANG]);
						$('#alertSignInError').show();
						break;
					case 'WrongRepeat':
						$('#alertSignInError').html(_translatorData['alertWrongRepeat'][LANG]);
						$('#alertSignInError').show();
						break;
					case 'ExpiredCodeException':
						$('#alertSignInError').html(_translatorData['alertExpiredCode'][LANG]);
						$('#alertSignInError').show();
						requestResetPassword(email)
							.catch( function(err) {
								onError(err);
							});
						break;
					default:
						$('#alertSignInError').html(_translatorData['alertUnknownError'][LANG]);
						$('#alertSignInError').show();
				}
			})
			.then( function() {
				$('#btnConfirmResetPassword').prop('disabled', false);
				$('#preloaderConfirmReset').hide();
				console.log('I`m here!');
			})
	});	
	
	$('#modalDelete').on('shown.bs.modal', function() {
		$('#buttonDelete').focus();
	});
	
	$('#modalSignIn').on('shown.bs.modal', function() {
		$('#alertSignInError').hide();
		$('#signInEmail').focus();
	});

	$('#modalSignUp').on('shown.bs.modal', function() {
		$('#alertSignUpError').hide();
		$('#signUpEmail').focus();
	});
	
	$('form').on('submit', function() {
		return false;
	});
	
	$('.link-about').on('click', function(e) {
		e.preventDefault();

		$main.hide();
		$preloader.hide();		
		$about.show();
		
		if (!$about.html().trim().length) {
			$preloader.show();
			$.get('about/' + LANG + '.html', function(data){
				$preloader.hide();
				$about.html(data);
			});
		}
	});

});

function googleSignInSuccess(user) {
	console.log('googleSignInSuccess');
	console.log(user);
	console.log(user.getAuthResponse());
	signInGoogle(user)
		.then( function() {
			return initS3();
		})
		.then( function() {
			return initTree();
		})
		.then( function() {
			setAuthenticatedMode(user.getBasicProfile().getEmail());
			window.routerOpen();
			$('#modalSignIn').modal('hide');
		})
		.catch( function(err) {
			onError(err);
		})
}

function googleSignInFailure(err) {
	console.log('googleSignInFailure');
	console.log(err);
}

// It's used with reCAPTCHA
function btnSignUpClick() {
	console.log('btnSignUpClick()');
	
	$('#alertSignUpError').hide();
	$('#btnSignUp').prop('disabled', true);
	$('#preloaderSignUp').show();
	var code;
	if ($('#signUpConfirmationCode').is(':visible')) {
		code = $('#signUpConfirmationCode').val();
	}
	var email = $('#signUpEmail').val(),
		password = $('#signUpPassword').val(),
		password2 = $('#signUpRepeatPassword').val();
	signUp(email, password, password2, code)
		.then( function() {
			return signIn(email, password);
		})
		.then( function() {
			return initS3();
		})
		.then( function() {
			return initTree();
		})
		.then( function() {
			setAuthenticatedMode(COGNITO_USER.username);
			routerOpen();
			$('#btnSignUp').prop('disabled', false);
			$('#preloaderSignIn').hide();
			$('#modalSignUp').modal('hide');
		})
		.catch( function (err) {
			console.log(err.name, 'Here!');
			switch(err.name) {
				case 'CodeMismatchException':
					$('#alertSignUpError').html(_translatorData['alertWrongCode'][LANG]);
					$('#alertSignUpError').show();
					break;
				case 'InvalidParameterException':
					$('#alertSignUpError').html(_translatorData['alertBadPassword'][LANG]);
					$('#alertSignUpError').show();
					break;
				case 'InvalidPasswordException':
					$('#alertSignUpError').html(_translatorData['alertBadPassword'][LANG]);
					$('#alertSignUpError').show();
					break;
				case 'UsernameExistsException':
					$('#alertSignUpError').html(_translatorData['alertUserExists'][LANG]);
					$('#alertSignUpError').show();
					break;
				case 'ConfirmationRequired':
					$('#signUpConfirmationCode').parent().show();
					break;
				case 'WrongRepeat':
					$('#alertSignUpError').html(_translatorData['alertWrongRepeat'][LANG]);
					$('#alertSignUpError').show();
					break;
				case 'ExpiredCodeException':
					$('#alertSignUpError').html(_translatorData['alertExpiredCode'][LANG]);
					$('#alertSignUpError').show();
					resendConfirmationCode($('#signUpEmail').val())
						.catch( function(err) {
							onError(err);
						});
					break;
				default:
					$('#alertSignUpError').html(_translatorData['alertUnknownError'][LANG]);
					$('#alertSignUpError').show();
			}
			$('#btnSignUp').prop('disabled', false);
			$('#preloaderSignUp').hide();
		})
}

function setProperty(obj, p, val) {
	if (obj[p] !== undefined) {
		obj[p] = val;
	}
}

//------------------------------------------------
//-----------  Signing in, signing up  -----------
//------------------------------------------------

// Returns Promise (ok, error)
function signUp(email, password, password2, confirmationCode) {
	var promise = new Promise( function(resolve, reject) {
		//AWSCognito.config.region = 'us-west-2';	 

		if(password != password2) {
			reject(ABError('WrongRepeat'));
			return;
		}
		  
		var dataEmail = {
			Name : 'email',
			Value : email
		};

		var attributeEmail = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataEmail);

		var attributeList = [attributeEmail];

		if(confirmationCode) {
			console.log('confirm');
			
			var userData = {
				Username : email,
				Pool : USER_POOL
			};
		
			var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);		
			
			cognitoUser.confirmRegistration(confirmationCode, true, function(err, result) {
				if(err) {
					reject(err);	
				} else {
					console.log(result);
					resolve(true);
				}
			});
			return;
		}  

		USER_POOL.signUp(email, password, attributeList, null, function(err, result) {
			if (err) {
				reject(err);
				return;
			}
	 
			reject(ABError('ConfirmationRequired'));
		});
    });
    
    return promise;
}

function confirmResetPassword(email, password, password2, code) {
	var promise = new Promise( function(resolve, reject) {
		if(password != password2) {
			reject(ABError('WrongRepeat'));
			return;
		}
		
		var userData = {
			Username : email,
			Pool : USER_POOL
		};
	
		var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);	
		cognitoUser.confirmPassword(code, password, {
			onSuccess: function(result) {
				resolve(result);
			},
			onFailure: function(err) {
				reject(err);
			}
		});
    });
    
    return promise;	
}

function resendConfirmationCode(email) {
	var promise = new Promise( function(resolve, reject) {
		var userData = {
			Username : email,
			Pool : USER_POOL
		};
	
		var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);		
		
		cognitoUser.resendConfirmationCode( function(err, result) {
			if(err) {
				reject(err);	
			} else {
				console.log(result);
				resolve(true);
			}
		});
    });
    
    return promise;
}

// Returns Promise (ok, error)
function signInCognito(email, password, confirmationCode) {
	//console.log(email, password);
	var promise = new Promise( function(resolve, reject) {
		//AWSCognito.config.region = 'us-west-2';	
		
		var authenticationData = {
			Username : email,
			Password : password,
		};
		
		var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);

		var userData = {
			Username : email,
			Pool : USER_POOL
		};
		
		var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
		
		// using promise to wait for confirmation. if confirmation is not needed, promise is resolved
		var confirmationPromise = Promise.resolve(true);
		if(confirmationCode){
			confirmationPromise = new Promise( function(resolve, reject) {
				console.log('confirm');
				cognitoUser.confirmRegistration(confirmationCode, true, function(err, result) {
					if(err) {
						console.log(err);
						reject(err);
					} else {
						console.log(result);
						resolve(result);
					}
				});	
			});
		}    
		
		confirmationPromise
			.then( function(ok) {
				cognitoUser.authenticateUser(authenticationDetails, {
					onSuccess: function (result) {;
						resolve(true);
					},

					onFailure: function(err) {
						reject(err);        
					},
					
					newPasswordRequired: function(userAttributes, requiredAttributes) {
						// User was signed up by an admin and must provide new 
						// password and required attributes, if any, to complete 
						// authentication.

						// Get these details and call 
						//alert('Требуется сменить пароль. Эта функция пока не работает.');
						reject();
						//cognitoUser.completeNewPasswordChallenge(newPassword, data, this)
					}
				});
			})
			.catch( function(err) {
				reject(err);
			});
    });
    
    return promise;
}

// Returns Promise (ok, error)
function signInGoogle(user) {
	var promise = new Promise( function(resolve, reject) {
		console.log(user.getAuthResponse());
		AWS.config.credentials = new AWS.CognitoIdentityCredentials({
			IdentityPoolId : 'us-west-2:f96a0ddb-ab25-4344-a0f9-3feb9ea80fa9',
			Logins : {
				'accounts.google.com': user.getAuthResponse().id_token
			}
		});
		console.log(AWS.config.credentials);
		resolve(true);
    });
    
    return promise;
}

// Returns Promise (ok, error)
function requestResetPassword(email) {
	var promise = new Promise( function(resolve, reject) {
		var userData = {
			Username : email,
			Pool : USER_POOL
		};
		
		var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
		
		cognitoUser.forgotPassword({
			onSuccess: function() {
				resolve();
			},
			onFailure: function(err) {
				reject(err);
			}
		});
    });
    
    return promise;
}

// Returns Promise(ok, error)
// Doesn't affect UI
function initS3() {
	// Try loading credentials from getCurrentUser()
	var promise = new Promise( function(resolve, reject) {
		var cognitoUser = USER_POOL.getCurrentUser();
		COGNITO_USER = cognitoUser;
		if (cognitoUser) {
			cognitoUser.getSession( function(err, session) {
				if(err) {
					//onError(err);
					console.log('error here!');
					reject(err);
					return;			
				} 

				AWS.config.credentials = new AWS.CognitoIdentityCredentials({
					IdentityPoolId : 'us-west-2:f96a0ddb-ab25-4344-a0f9-3feb9ea80fa9',
					Logins : {
						'cognito-idp.us-west-2.amazonaws.com/us-west-2_eb7axoHmO' : session.getIdToken().getJwtToken()
					}
				});
				resolve(true);
			});
		} else {
			if (AWS.config.credentials) {
				resolve(true);
			} else {
				reject(ABError('NotSignedIn'));
			}
		}
	});
	
	return promise
		.then(function() {
			return new Promise( function(resolve, reject) {
				AWS.config.credentials.get( function(err) {
					if (err) {
						// No error messages
						console.log('error there!');
						if (COGNITO_USER) {
							cognitoUser.signOut();
						}
						AWS.config.credentials.clearCachedId();
						reject(err);
						return;
					}
					
					var accessKeyId = AWS.config.credentials.accessKeyId;
					var secretAccessKey = AWS.config.credentials.secretAccessKey;
					var sessionToken = AWS.config.credentials.sessionToken;
					
					s3 = new AWS.S3({
						apiVersion: '2006-03-01',
						accessKeyId: accessKeyId,
						secretAccessKey: secretAccessKey,
						sessionToken: sessionToken,
						region: "eu-west-1"
					});
					
					console.log('s3', s3);
					
					// Used in my.tmp.js
					USERID = AWS.config.credentials.identityId;
					TREE_USERID = USERID;
					TREE_KEY = TREE_USERID + '/' + TREE_FILENAME;	
					resolve(true);		
				});
			});
		});
}

// Refresh credentials every 15 mins.
$( function() {
	TIMERS.set( function() {
		if(AWS.config.credentials) {
			console.log('Refreshing credentials');
			AWS.config.credentials.get( function(err) {
				if (err) {
					console.log(err);
					return;
				}
				
				var accessKeyId = AWS.config.credentials.accessKeyId;
				var secretAccessKey = AWS.config.credentials.secretAccessKey;
				var sessionToken = AWS.config.credentials.sessionToken;
				
				s3 = new AWS.S3({
					apiVersion: '2006-03-01',
					accessKeyId: accessKeyId,
					secretAccessKey: secretAccessKey,
					sessionToken: sessionToken,
					region: "eu-west-1"
				});
				
				console.log('s3', s3);
			});
		}
	}, 9000000, 'credentials');
});

// Returns Promise(ok, err)
function initRootDoc(srcLocation, dstKey) {
	var getPromise = new Promise(function (resolve, reject) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', srcLocation);
		xhr.onload = function () {
			if (this.status >= 200 && this.status < 300) {
				resolve(xhr.response);
				console.log(xhr.response);
			} else {
				reject({
					status: this.status,
					statusText: xhr.statusText
				});
			}
		};
		xhr.onerror = function () {
			reject({
				status: this.status,
				statusText: xhr.statusText
			});
		};
		xhr.send();
	});
	
	return getPromise
		.then( function(data) {
			var params = {
				Body: data,
				Bucket: STORAGE_BUCKET,
				Key: dstKey,
				ACL: 'public-read'
			};
			
			return s3.putObject(params).promise();
		})
		.catch( function(err) {
			return err;
		});
}

// Returns Promise(ok, err)
function initTree() {
	TREE_READONLY = TREE_USERID !== USERID;
	var promise = new Promise( function(resolve, reject) {
		// Trying to load tree
		loadABTree(TREE_KEY).then(
			function(abTree) {
				return Promise.resolve(abTree);
			},
			function(err) {
				if (err.name == 'NoSuchKey') {
					// No tree. It user's first visit.
					// Create root-doc
					ROOT_DOC_GUID = GetGUID();
					//return Promise.resolve([]);
					return initRootDoc(DEFAULT_ROOT_DOC_LOCATION, USERID + '/' + ROOT_DOC_GUID + '/index.html')
						.then( function() {
							ACTIVITY.push('tree modify', 'pending');
							return [{
								id: ROOT_DOC_GUID,
								name: ""
							}];
						})
						.catch( function(err) {
							return Promise.reject(err);
						});
				} else {
					return Promise.reject(err);
				}
			}
		).then(function(abTree) {
			//console.log(abTree);
			
			var zNodes = abTree;
			zNodes[0].head = true;
			//zNodes[0].iconOpen = '/img/icons/home-opened.svg';
			//zNodes[0].iconClose= '/img/icons/home-closed.svg';
			zNodes[0].name = zNodes[0].name.length ? zNodes[0].name : _translatorData['rootName'][LANG];
			zNodes[0].open = true;
			
			ROOT_DOC_GUID = zNodes[0].id;
			
			$.fn.zTree.init($("#abTree"), zTreeSettings, zNodes);
			
			TREE_READY = true;
			
			resolve(true);
		}).catch( function(err) {
			reject(err);
		});
		
	});
	
	return promise;
}

// Reset UI on Modals
$(function() {
	$('#modalSignIn').on('show.bs.modal', function(event) {
		$('#divSignInConfirmationCode').hide();
		$('#signInConfirmationCode').val('');
		$('#btnSignIn').show();
		$('preloaderSignIn').hide();
		$('#modalSignIn .modal-title').html(_translatorData['loginPage'][LANG]);
		
		$('#modalSignIn').find('.sign-in').show();
		$('#modalSignIn').find('.forgot-password').hide();
		$('#modalSignIn').find('.reset-password').hide();
		
		$('#btnSignIn').prop('disabled', false);
		$('#btnSendCode').prop('disabled', false);
		$('#btnConfirmResetPassword').prop('disabled', false);
	});
	$('#modalSignUp').on('show.bs.modal', function(event) {
		$('#signUpConfirmationCode').val('');
		//$('#divSignUpConfirmationCode').hide();
		// The above line stopped working. Don't know why.
		$('#signUpConfirmationCode').parent().hide();
	});
});

//------------------------------------------------
//-----------       App-mode           -----------
//------------------------------------------------

// Changes UI for using in authenticated mode (tree + doc)
function setAuthenticatedMode(username) {
	// TODO
	console.log('authenticated');
	
	$('.preloader-container').hide();
	$('.app-container').show();
	
	$('.authenticated-mode').show();
	$('.unauthenticated-mode').hide();
	
	$('#username').text(username);
	$('#username').addClass('loaded');
}

// Changes UI for using in unauthenticated mode (only doc)
function setUnauthenticatedMode() {
	console.log('unauthenticated');
	
	$('.preloader-container').hide();
	$('.app-container').show();
	
	$('.unauthenticated-mode').show();
	$('.authenticated-mode').hide();

	$('#username').text(_translatorData['account'][LANG]);
	$('#username').addClass('loaded');
}

function setUnknownMode() {
	console.log('unknown');
	
	$('.authenticated-mode').hide();
	$('.unauthenticated-mode').hide();
}

//--------------------------------------
//----------- Custom error -------------
//--------------------------------------

function ABError(name) {
	var err = new Error(name);
	err.name = name;
	return err;
}

//------------------------------------------------
//----------- ABTree-related functions -----------
//------------------------------------------------

// Loads JSON with a specified key (String) from STORAGE_BUCKET
// Returns a Promise (ABTree JSON)
function loadABTree(key) {
	var params = {
		Bucket: STORAGE_BUCKET,
		Key: key
	};
	
	var promise = new Promise( function (resolve, reject) {
		s3.getObject(params).promise().then(
			function (data) {
				var d = new TextDecoder('utf-8');
				var abTree = JSON.parse(d.decode(data.Body));
				resolve(abTree);
			},
			function (err) {
				reject(err);
			}
		);
	});
	
	return promise;
}

// Searches for document in all user's folders
// Returns Promise(userId | null, error)
// !!! null - not found, error - something bad happened!
function findOwner(guid) {
	// finding user
	console.log('findDocument', guid);
	
	// serching with no prefix
	return listS3Files(undefined)
		.then( function(files) {
			var result = null;
			if (guid) {
				files.forEach(function(f) {
					ss = f.Key.split('/');
					// We have UserId and GUID here
					if (ss[0] && (ss[1] === guid)) {
						console.log(ss[0], ss[1]);
						result = ss[0];
					}
				});
			}
			return Promise.resolve(result);
		})
		.catch( function(err) {
			console.log('findDocument:', err);
		});
}

//---------------------------------------
//--------------- Routing ---------------
//---------------------------------------



function routerOpen(wantGUID) {
	// showing preloader on Editor
	preloaderOnEditor(true);
	
	if (!wantGUID) {
		wantGUID = window.location.pathname.slice(1); // drop first '/'
	}
	
	if (TREE_READY) {
		TIMERS.execute('doc');
		
		var ok = false;
		var zTree = $.fn.zTree.getZTreeObj("abTree");
		var node = zTree.getNodesByParam('id', wantGUID)[0];
		var promise;
		// if current tree has wantGUID-node
		if (node) {
			ok = true;
			promise = Promise.resolve(true);
		} else {
			// if not, try to find owner
			promise = findOwner(wantGUID)
				.then( function(uid) {
					if (uid) {
						// owner is found, load their tree
						console.log('found: ', uid, wantGUID);
						TREE_USERID = uid;
						TREE_KEY = TREE_USERID + '/' + TREE_FILENAME;
						return initTree();
					} else {
						// owner is not found
						console.log('not found!');
						return Promise.reject(null);
					}
				})
		}
		
		promise
			.then( function(ok) {
				history.pushState(null, null, '/' + wantGUID);
				var zTree = $.fn.zTree.getZTreeObj('abTree');
				var node = zTree.getNodesByParam('id', wantGUID)[0];
				if (node) {
					zTree.selectNode(node);
					ZTREE_SELECTED_NODE = node;
					// ...And load document
					try {
						$('#selectedDoc')[0].innerHTML = node.name;
						$('#document-wrap').abDoc(node.id, TREE_USERID, TREE_USERID !== USERID);
					} catch(err) {
						onError(err);
					}
				} else {
					console.log("You will never get this error!");
				}				
			})
			.catch( function(err) {
				var tmp = Promise.resolve(true);
				if (TREE_USERID !== USERID) {
					TREE_USERID = USERID;
					TREE_KEY = TREE_USERID + '/' + TREE_FILENAME;
					tmp = initTree();
				}
				tmp.then( function(ok) {
					setTimeout(function() {
						routerOpen(ROOT_DOC_GUID);
					}, 0);
				})
				.catch( function(err) {
					onError(err);
				});		
			});
	}
}

//---------------------------------------
//----------- Translation ---------------
//---------------------------------------

$(function() {
	$('[data-translate]').each( function(i, el) {
		var dt = $(el).attr('data-translate'),
			at = $(el).attr('attr-translate');

		if (!_translatorData[dt]) {
			console.log('"' + dt + '" not found in _translatorData');
			return
		}
		
		if (at) {
			$(el).attr(at, _translatorData[dt][LANG]);
		} else {
			$(el).html(_translatorData[dt][LANG]);
		}
	});
	
	$('#selectLang').change( function(event) {
		localStorage.setItem('ab-doc.translator.lang', $('#selectLang option:selected').val());
		location.reload();
	});
	$('#selectLang').val(LANG);
});

//---------------------------------------
//----------- Columns resizing ----------
//---------------------------------------

/* 3 possible modes:
 * 'tree' - only tree is shown, splitter is on the left, hidden
 * 'split' - tree | splitter | document
 * 'document' - only document is shown, splitter is on the left, hidden
 * 
 * Small window:
 * 
 *   tree <-----> document
 * 
 * Big window:
 *   
 *    split <-----> document
*/

// Used when in 'split' mode. Sets tree's width = w, document's width and splitter's position to fit page
function updateWidthSplit(w) {
	$('#toggleButton, #splitter').removeClass('ab-closed').addClass('ab-opened');
	$('#splitter').removeClass('thin');
	
	var sw = $('#splitter').outerWidth();
	
	$('#ztree-div').show();
	$('#ztree-div').css('left', 0 + 'px');
	$('#ztree-div').outerWidth(w);
	$('#splitter').css('left', w + 'px');
	$('#document').show();
	$('#document').outerWidth(window.innerWidth - w - sw);
	$('#document').css('left', (w + sw) + 'px');
}

// Update columns' sizes when in 'tree' mode
function updateWidthTree() {
	$('#toggleButton, #splitter').removeClass('ab-opened').addClass('ab-closed');
	$('#splitter').removeClass('thin');
	
	var sw = $('#splitter').outerWidth();
	
	$('#ztree-div').show();
	$('#ztree-div').css('left', sw + 'px');
	$('#ztree-div').outerWidth(window.innerWidth - sw);
	$('#splitter').css('left', 0 + 'px');
	$('#document').hide();
}

// Update columns' sizes when in 'document' mode
function updateWidthDocument(small) {
	if (small) {
		$('#toggleButton, #splitter').removeClass('ab-closed').addClass('ab-opened');
		$('#splitter').addClass('thin');
		
		$('#document').css('left', 0 + 'px');
		$('#document').outerWidth(window.innerWidth - 1);
		$('#document').show();
		$('#splitter').css('left', window.innerWidth - 1 + 'px');
		$('#ztree-div').hide();	
	} else {
		$('#toggleButton, #splitter').removeClass('ab-opened').addClass('ab-closed');
		$('#splitter').removeClass('thin');
		
		var sw = $('#splitter').outerWidth();
		
		$('#document').css('left', sw + 'px');
		$('#document').outerWidth(window.innerWidth - sw);
		$('#document').show();
		$('#splitter').css('left', 0 + 'px');
		$('#ztree-div').hide();	
	}
}

// Update columns' sizes, use given mode
// Returns true on success, false on wrong mode value
function updateMode(mode, small, w) {
	switch(mode) {
		case 'tree':
			updateWidthTree();
			return true;
		case 'document':
			updateWidthDocument(small);
			return true;
		case 'split':
			updateWidthSplit(w);
			return true;
		default:
			return false;
	}
}

var COLUMNS_MODE;
var TREE_WIDTH;

$(function () {	
	var $document = $('#document'),
		$ztree_div = $('#ztree-div'),
		$splitter = $('#splitter'),
		$app_container = $('.app-container'),
		$about_container = $('#about'),
		$nav = $('nav');	
		
	// if (window's width < smallWidth) window is considered small, otherwise it's big 
	var smallWidth = 600;
	// save navbar's initial height
	var navHeight = $nav.outerHeight();
		
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
		$app_container.outerHeight(window.innerHeight - 1 - navHeight);
		$about_container.outerHeight(window.innerHeight - 1 - navHeight);
	});
	
	// Init columns
	var thresholdLeft = parseFloat($ztree_div.css('padding-left')) + parseFloat($ztree_div.css('padding-right')),
		thresholdRight = $splitter.outerWidth() +
						parseFloat($document.css('padding-left')) +
						parseFloat($document.css('padding-right')) +
						300;	
	
	$app_container.outerHeight(window.innerHeight - 1 - navHeight);
	$app_container.css('top', $nav.outerHeight() + 'px');
	$about_container.outerHeight(window.innerHeight - 1 - navHeight);
		
	TREE_WIDTH = parseFloat(localStorage.getItem('ab-doc.columns.treeWidth'));
	if (isNaN(TREE_WIDTH)) {
		TREE_WIDTH = window.innerWidth * 0.25;
	}
	console.log(TREE_WIDTH);
	COLUMNS_MODE = localStorage.getItem('ab-doc.columns.mode');
	// Let window.resize() correct the layout
	$(window).resize();

	// Splitter moving
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
					zTreeWidth = $ztree_div.outerWidth(),
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
});

//-------------------------------------------------
//------ Timer (tree, document, used space) -------
//-------------------------------------------------


$(function() {
	TIMERS.set(function () {
		// Save tree column's size
		localStorage.setItem('ab-doc.columns.treeWidth', TREE_WIDTH);
		localStorage.setItem('ab-doc.columns.mode', COLUMNS_MODE);
		
		// TREE
		if (ACTIVITY.get('tree modify') === 'pending') {
			if (TREE_USERID === USERID) {
				var zTree = $.fn.zTree.getZTreeObj("abTree");
				var nodes = zTree.getNodesByParam('id', ROOT_DOC_GUID);
				var abTree;
				if (nodes) {
					var f = function(n) {
						var abNode = {
							id : n.id,
							name : n.name,
							children : n.children ? n.children.map(f) : []
						};
						
						return abNode;
					};
					
					abTree = nodes.map(f);
				} else {
					abTree = [];
				}
				
				ACTIVITY.push('tree modify', 'saving');
				s3.putObject({
					Body: JSON.stringify(abTree),
					Bucket: STORAGE_BUCKET,
					Key: TREE_KEY
				}).promise().then(
					function (ok) {
						ACTIVITY.flush('tree modify');
					},
					function (err) {
						onError(err);
					}
				);
			}
		}

	}, 3000, 'tree');
	
	// USED SPACE
	// Update it less frequently	
	TIMERS.set(function () {
		if (USER_USED_SPACE_CHANGED) {
			updateUsedSpace();
		}
	}, 5000, 'space');
});


//------------------------------------------------
//------------------- Editor ---------------------
//------------------------------------------------

$( function() {
	preloaderOnEditor(true);
});

// GUI-only
// Turns preloader on editor on and off
function preloaderOnEditor(on) {
	if (on) {
		$('#document-wrap').hide();
		$('#editor-preloader').show();
	} else {
		$('#editor-preloader').hide();
		$('#document-wrap').show();
	}
}


//------------------------------------------------
//---------- Size indicator and limit ------------
//------------------------------------------------

// This section will be moved upper later.

// Returns Promise (size, error)
function getDirectorySize(key) {
	return listS3Files(key + '/')
		.then( function(files) {
			return files.reduce( function(acc, f) {
				return acc + f.Size;
			}, 0);
		});
}

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

var USER_USED_SPACE = 0, // Getting list of objects in s3 and finding sum of their sizes (It happens rarely)
	USER_USED_SPACE_DELTA = 0, // Temporary value. It is changed every time we finish file upload or delete file.
								// It's erased after calculating USER_USED_SPACE
	USER_USED_SPACE_PENDING = 0, // Size of uploads in progress.
								// It is changed every time upload is started, finished or aborted.
								// It is NOT erased after calculating USER_USED_SPACE
	MAX_USED_SPACE = 500 * 1024 * 1024, // 500 Mb
	USER_USED_SPACE_CHANGED = false;

function updateUsedSpace() {
	// update variables, do nothing on error
	getDirectorySize(USERID)
		.then( function(size) {
			USER_USED_SPACE = size;
			USER_USED_SPACE_DELTA = 0;
			USER_USED_SPACE_CHANGED = false;
			updateIndicator();
			console.log('Synchronized USER_USED_SPACE ', USER_USED_SPACE/1000000, 'Mb');
		});
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
