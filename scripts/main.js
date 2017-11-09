// Data for translation

var _translatorData = {
	"loginPage": {
		"ru": "Вход",
		"en": "Log in"
	},
	"welcomeMessage": {
		"ru": 'Чтобы работать с документами нужно <a class="link-sign-in" href="#">войти</a> или <a class="link-sign-up" href="#">создать учетную запись</a>.',
		"en": 'Please <a class="link-sign-in" href="#">log in</a> or <a class="link-sign-up" href="#">create account</a> to start working.'
	},
	"email": {
		"ru": "Почта",
		"en": "Email"
	},
	"yourEmail": {
		"ru": "Ваш email",
		"en": "Your email"		
	},
	"password": {
		"ru": "Пароль",
		"en": "Password"
	},
	"yourPassword": {
		"ru": "Ваш пароль",
		"en": "Your password"		
	},
	"confirmationCode": {
		"ru": "Код подтверждения",
		"en": "Confirmation code"
	},
	"yourConfirmationCode": {
		"ru": "Ваш код подтверждения",
		"en": "Your confirmation code"
	},
	"alertUserDoesntExist": {
		"ru": "Пользователь с таким именем не зарегистрирован.",
		"en": "Username is not registered."
	},
	"alertWrongPassword": {
		"ru": "Неправильное имя пользователя или пароль.",
		"en": "Wrong username or password."
	},
	"alertWrongCode": {
		"ru": "Неверный код подтверждения.",
		"en": "Wrong confirmation code."
	},
	"enter": {
		"ru": "Войти",
		"en": "Log in"
	},
	"signUp": {
		"ru": "Нет учётной записи?",
		"en": "Create account"
	},
	
	"registration": {
		"ru": "Регистрация",
		"en": "Create account"
	},
	"alertWrongRepeat": {
		"ru": "Пароли не совпали.",
		"en": "Passwords didn't match."
	},	
	"alertBadPassword": {
		"ru": "Пароль должен быть не короче 8 символов, содержать цифры и латинские буквы в разных регистрах. Например: PassW0rD.",
		"en": "Minimum password length is 8 symbols. Password must contain digits and both uppercase and lowercase letters. Example: PassW0rD."
	},
	"alertUserExists": {
		"ru": "Пользователь с таким именем уже существует.",
		"en": "This username is already taken."
	},
	"alertExpiredCode": {
		"ru": "Код подтверждения устарел. Вам был выслан новый.",
		"en": "Your confirmation code is expired. New confirmation code was sent to you."
	},
	"repeatPassword": {
		"ru": "Повторите пароль",
		"en": "Repeat password"
	},
	"signUp2": {
		"ru": "Создать учётную запись",
		"en": "Create account"
	},
	
	"exit": {
		"ru": "Выход",
		"en": "Exit"
	},
	"somethingWentWrong": {
		"ru": "Что-то пошло не так.",
		"en": "Somenthing went wrong."
	},
	"return": {
		"ru": "Вернуться",
		"en": "Return"
	},
	"document": {
		"ru": "Документ",
		"en": "Document"
	},
	
	"saving": {
		"ru": "сохранение...",
		"en": "saving..."
	},
	"saved": {
		"ru": "сохранено",
		"en": "saved"
	},
	"edited": {
		"ru": "изменено",
		"en": "edited"
	},
	"typeYourText": {
		"ru": "Напишите что-нибудь удивительное...",
		"en": "Compose something awesome..."
	},
	
	"deleteTitle": {
		"ru": "Удаление",
		"en": "Delete"
	},
	"deleteQuestion1": {
		"ru": "Документ",
		"en": "You are going to delete document"
	},
	"deleteQuestion2": {
		"ru": " будет удалён, продолжить?",
		"en": ", continue?"
	},
	"deleteQuestion3": {
		"ru": " Также будут удалены все вложенные документы и папки.",
		"en": " All sub-documents are going to be deleted too."
	},
	"ok": {
		"ru": "Ок",
		"en": "Ok"
	},
	"cancel": {
		"ru": "Отмена",
		"en": "Cancel"
	},
	
	"emptyDropzoneMessage" :{
		"ru": "Приложите вложения сюда, рисунки можно помещать сразу в текст",
		"en": "Drop your files here, you can place pictures right in the text"
	},
	"noSpace": {
		"ru": "Недостаточно места для загрузки файла",
		"en": "No space left to upload this file"
	},
	"areYouSure": {
		"ru": "Вы уверены?",
		"en": "Are you sure?"
	},
	"yes": {
		"ru": "да",
		"en": "yes"
	},
	"no": {
		"ru": "нет",
		"en": "no"
	}
}

// ====================

AWSCognito.config.region = 'us-west-2';
AWS.config.region = 'us-west-2';

var poolData = {
    UserPoolId : 'us-west-2_eb7axoHmO',
    ClientId : '1p7uks7hoothql33e17mssr7q1'
};

var USER_POOL = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);

// zTree \/
var settings = {
	view: {
		selectedMulti: true,
		addHoverDom: addHoverDom,
		removeHoverDom: removeHoverDom,
	},
	edit: {
		enable: true,
		showRemoveBtn: showRemoveBtn,
		showRenameBtn: showRenameBtn,
		drag: {
			isCopy: true,
			isMove: true,
			prev: true,
			inner: true,
			next: true
		}
	},
	data: {
		simpleData: {
			enable: true
		}
	},
	callback: {
		beforeDrag: beforeDrag,
		beforeDrop: beforeDrop,
		beforeEditName: beforeEditName,
		beforeRename: beforeRename,
		beforeRemove: beforeRemove,
		onClick: onClick,
		onDblClick: onDblClick,
		onDrop: onDrop,
		onNodeCreated: onNodeCreated,
		onRename: onRename
	}
};


/*
// TODO: fix overwriting if object with this name already exists.
function createObjectS3(path, body, errCallback) {
	var params = {
		Body: body,
		Bucket: "ab-doc-storage",
		Key: path
	};
	return s3.putObject(params, function(err, data) {
		if (err && (errCallback instanceof Function)) {
			errCallback(err);
		}
	});
};*/

function createObjectS3Params(params, errCallback) {
	params.Bucket = STORAGE_BUCKET;
	
	return s3.upload(params, {partSize: 6 * 1024 * 1024, queueSize: 2}, function(err, data) {
		if (err && (errCallback instanceof Function)) {
			errCallback(err);
		}
	});
};

/*function getObjectS3(path, errCallback) {
	var params = {
		Bucket: "ab-doc-storage",
		Key: path
	};
	return s3.getObject(params, function(err, data) {
		if (err && (errCallback instanceof Function)) {
			errCallback(err);
		}		
	});
}*/

function getObjectS3Params(params, errCallback) {
	params.Bucket = STORAGE_BUCKET;
	
	console.log(params);
	
	return s3.getObject(params, function(err, data) {
		if (err && (errCallback instanceof Function)) {
			errCallback(err);
		}		
	});
}

function deleteRecursiveS3(key) {
	console.log('deleteRecursiveS3', key);
	return listS3Files(key)
		.then( function(files) {
			var params = {
				Bucket: STORAGE_BUCKET,
				Delete: {
					Objects: []
				}
			};
			
			if (files.length > 0) {
				files.forEach( function(f) {
					params.Delete.Objects.push({Key: f.Key});
				});
				
				console.log(params);
				
				return Promise.resolve(params);
			}
			
			return Promise.reject('nothing to delete');
		})
		.then(
			function(params) {
				return s3.deleteObjects(params).promise();
			},
			function(err) {
				return Promise.resolve('nothing to delete'); // It's ok
			}
		);
}

// Loads list of files with specified prefix and passes each one to callback
// Old. Use listS3Files instead
function withS3Files(prefix, callback, errCallback) {
	var files = [];
	var params = {
		Bucket: STORAGE_BUCKET,
		Prefix: prefix,
		MaxKeys: 1000
	};
	
	// Ugly recursion!!!!!!!!
	// TODO: rewrite it all!!!!!!!!
	function f(err, data) {
		console.log('withS3Files f(' + err + ', ' + data + ')');
		if (err) {
			if (errCallback instanceof Function) {
				errCallback(err);
			}
			return;
		}
		// Data must be undefined when calling this function directly
		// It starts objects loading from S3
		// Then this function is only used as a callback in s3.listObjects
		if (!data) {
			s3.listObjectsV2(params, f);
			return;
		}
		
		files = files.concat(data.Contents);
		if (data.isTruncated) {
			params.Marker = data.NextMarker;
			s3.listObjectsV2(params, f);
		} else {
			files.forEach(callback);
		}
	};
	f(undefined, undefined);	
}

// Loads list of files with spicified prefix and returns Promise(files, error)
function listS3Files(prefix) {
	var files = [];
	var params = {
		Bucket: STORAGE_BUCKET,
		Prefix: prefix,
		MaxKeys: 1000
	};
	
	var promise = new Promise( function(resolve, reject) {
		// It's ok
		function f(err, data) {
			console.log('listS3Files f(' + err + ', ' + data + ')');
			if (err) {
				reject(err);
				return;
			}
			// Data must be undefined when calling this function directly
			// It starts objects loading from S3
			// Then this function is only used as a callback in s3.listObjects
			if (!data) {
				s3.listObjectsV2(params, f);
				return;
			}
			
			files = files.concat(data.Contents);
			if (data.isTruncated) {
				params.Marker = data.NextMarker;
				s3.listObjectsV2(params, f);
			} else {
				resolve(files);
			}
		};
		f(undefined, undefined);
	});
	
	return promise;
}

// prefix should not end with "/"
/*function loadTree(prefix, username, tree, callback, errCallback) {
	withS3Files(prefix+"/", function(files) {
		var head = {id: newId(), name: username, s3path: prefix, open: true, head: true, icon: "/css/ztree/img/diy/1_open.png"};
		tree.addNodes(null, head, true);
		files.map( function(f) {
			var pathArray = f.Key.split("/");
			var node = {
				id: newId(),
				name: pathArray[pathArray.length - 1]
			};
			function filter(n) {
				return buildPath(n) === pathArray.slice(0, pathArray.length - 1).join("/");
			}
			var parent = tree.getNodesByFilter(filter, true);
			tree.addNodes(parent, node, true);
		});
		
		callback();
	}, errCallback);
}*/

// zTree /\

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

var s3;
var USERID; // Id of a currently logged in user
var TREE_USERID; // Id of a user, whose tree is shown
var AWS_CDN_ENDPOINT = "https://s3-eu-west-1.amazonaws.com/ab-doc-storage/";
var STORAGE_BUCKET = "ab-doc-storage";
var LANG;
var TREE_MODIFIED = false;
var TREE_READY = false; // Is tree.json loaded?
var TREE_FILENAME = "tree.json";
var TREE_KEY;
var TREE_READONLY;
var COGNITO_USER;
var ROOT_DOC_GUID = 'root-doc';
var DEFAULT_ROOT_DOC_LOCATION = '/root-doc.html';
var $updated;

$(document).ready( function() {
	setUnknownMode();
	
	initS3()
		.then( function(ok) {
			return initTree();
		})
		.then( function() {
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
			}
		});
	
	$('.link-sign-out, .link-return').click( function() {
		if (COGNITO_USER) {
			COGNITO_USER.signOut();
		}
		
		AWS.config.credentials = null;
		
		//window.location.replace('/login.html');
		setUnauthenticatedMode();
		return true;	
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
		signIn($('#signInEmail').val(), $('#signInPassword').val(), code)
			.then( function() {
				return initS3();
			})
			.then( function() {
				setAuthenticatedMode();
				return initTree();
			})
			.then( function() {
				window.routerOpen();
				$('#btnSignIn').prop('disabled', false);
				$('#preloaderSignIn').hide();
				$('#modalSignIn').modal('hide');
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
					default:
						onError(err);
				}
				$('#btnSignIn').prop('disabled', false);
				$('#preloaderSignIn').hide();
			})
	});
	
	$('#btnSignUp').click( function() {
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
				setAuthenticatedMode();
				return initTree();
			})
			.then( function() {
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
						$('#divSignUpConfirmationCode').show();
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
						onError(err);
				}
				$('#btnSignUp').prop('disabled', false);
				$('#preloaderSignUp').hide();
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
});

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
			//cognitoUser = result.user;
			//$('#divConfirmation').show();
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
function signIn(email, password, confirmationCode) {
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
						alert('Требуется сменить пароль. Эта функция пока не работает.');
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

// Returns Promise(ok, error)
// Doesn't affect UI
function initS3() {
	var promise = new Promise( function(resolve, reject) {
		// Checking if we are signed in
		var cognitoUser = USER_POOL.getCurrentUser();
		COGNITO_USER = cognitoUser;
		if(!cognitoUser) {
			//setUnauthenticatedMode();
			//console.log('Not signed in');
			reject(ABError('NotSignedIn'));
			return;
		} else {
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
				AWS.config.credentials.clearCachedId();
					
				AWS.config.credentials.get( function(err) {
					if (err) {
						// No error messages
						console.log('error there!');
						cognitoUser.signOut();
						reject(err);
						return
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
					
					// Used in my.tmp.js
					USERID = AWS.config.credentials.identityId;
					TREE_USERID = USERID;
					TREE_KEY = TREE_USERID + '/' + TREE_FILENAME;	
					resolve(true);		
				});
			});
		}
	});
	
	return promise;
}

// Refresh credentials every 30 mins.
$( function() {
	setInterval( function() {
		if(AWS.config.credentials) {
			AWS.config.credentials.refresh( function(err) {
				if (err) {
					console.log(err);
				}
			});
		}
	}, 1800000);
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
		setAuthenticatedMode();
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
							TREE_MODIFIED = true;
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
			zNodes[0].iconOpen = '/img/icons/home-opened.svg';
			zNodes[0].iconClose= '/img/icons/home-closed.svg';
			zNodes[0].open = true;
			
			ROOT_DOC_GUID = zNodes[0].id;
			
			$.fn.zTree.init($("#abTree"), settings, zNodes);
			
			setAuthenticatedMode();
			
			TREE_READY = true;
			
			// Routing when page is loaded
			/*var wantGUID = window.location.href.split('#/')[1];
			if (wantGUID) {
				TryLoadGUID(wantGUID);
			}*/
			
			resolve(true);
		}).catch( function(err) {
			reject(err);
		});
		
		$updated = $('#updated');
	});
	
	return promise;
}

// Reset UI on Modals
$(function() {
	$('#modalSignIn').on('show.bs.modal', function(event) {
		$('#divSignInConfirmationCode').hide();
		$('#signInConfirmationCode').val('');
	});
	$('#modalSignUp').on('show.bs.modal', function(event) {
		$('#divSignUpConfirmationCode').hide();
		$('#signUpConfirmationCode').val('');
	});
});

//------------------------------------------------
//-----------       App-mode           -----------
//------------------------------------------------

// Changes UI for using in authenticated mode (tree + doc)
function setAuthenticatedMode() {
	// TODO
	console.log('authenticated');
	
	$('.preloader-container').hide();
	$('.app-container').show();
	
	$('.authenticated-mode').show();
	$('.unauthenticated-mode').hide();
	
	$('#username').text(COGNITO_USER.username);
}

// Changes UI for using in unauthenticated mode (only doc)
function setUnauthenticatedMode() {
	console.log('unauthenticated');
	
	$('.preloader-container').hide();
	$('.app-container').show();
	
	$('.unauthenticated-mode').show();
	$('.authenticated-mode').hide();
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

// Saves abTree (JSON) with a specified key (String) from STORAGE_BUCKET
// Returns a Promise
function saveABTree(abTree, key) {
	var params = {
		Body: JSON.stringify(abTree),
		Bucket: STORAGE_BUCKET,
		Key: key
	};
	return s3.putObject(params).promise();
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
					// ...And load document
					try {
						$('#selectedDoc')[0].innerHTML = node.name;
//						initQuill('#document', node.id, TREE_USERID, TREE_USERID !== USERID);
						$('#document').abDoc(node.id, TREE_USERID, TREE_USERID !== USERID);
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
	LANG = localStorage.getItem('ab-doc.translator.lang');
	if (!LANG) {
		LANG = "ru";
	}
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
		$nav = $('.navbar');	
		
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
	});
	
	// Init columns
	var thresholdLeft = parseFloat($ztree_div.css('padding-left')) + parseFloat($ztree_div.css('padding-right')),
		thresholdRight = $splitter.outerWidth() +
						parseFloat($document.css('padding-left')) +
						parseFloat($document.css('padding-right')) +
						300;
	console.log(thresholdRight, $('#dropzone-wrap').outerWidth());
	
	
	$app_container.outerHeight(window.innerHeight - 1 - navHeight);
	$app_container.css('top', $nav.outerHeight() + 'px');
	
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
			event.preventDefault();
			
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
	setInterval(function () {
		// Save tree column's size
		localStorage.setItem('ab-doc.columns.treeWidth', TREE_WIDTH);
		localStorage.setItem('ab-doc.columns.mode', COLUMNS_MODE);
		
		// TREE
		if (TREE_MODIFIED) {
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
				
				$updated.show();
				saveABTree(abTree, TREE_KEY).then(
					function (ok) {
						$updated.fadeOut('slow', function () {
							$(this).hide();
						});
					},
					function (err) {
						onError(err);
					}
				);
			}
			TREE_MODIFIED = false;
		}
		
		// EDITOR
		$('#editor[modified="1"]').each(function (index, element) {
			if (USERID === TREE_USERID) {
				var $editor = $('#editor'),
					$files = $('#files');
				
				$updated.show();
				$(element).attr('modified', 0);
				
				console.log('Saving! ', USERID, TREE_USERID);
				
				saveDocument('#editor').then(
					function (ok) {
						$updated.fadeOut('slow', function () {
							console.log($editor.attr('modified') === '0', $editor.attr('waiting') === '0', $files.attr('waiting') === '0')
							if ($editor.attr('modified') === '0' && $editor.attr('waiting') === '0' && $files.attr('waiting') === '0') {
								$(this).removeClass('pending');
							}
							
							$(this).hide();
						});
					},
					function (err) {
						onError(err);
					}
				);
			}
		});
	}, 3000);
	
	// USED SPACE
	// Update it less frequently	
	setInterval(function () {
		if (USER_USED_SPACE_CHANGED) {
			updateUsedSpace();
		}
	}, 5000);
});

//---------------------------------------
//----------- zTree callbacks -----------
//---------------------------------------

function beforeDrag(id, nodes) {
	if (TREE_READONLY) {
		return false;
	}
	
	var ok = true;
	nodes.forEach(function(x, i, arr) {
		// We can't drag head of the tree
		if (x.head === true) {
			ok = false;
		}
	});
	
	return ok;
}

// It always moves files on drop.
function beforeDrop (treeId, treeNodes, targetNode, moveType) {
	if (TREE_READONLY) {
		return false;
	}
	
	// We can't drop item out the tree
	if (targetNode === null) {
		return false;
	}
	
	// If targetNode is the head, there are 3 possible situations:
	// 1, 2: dropping before it or after it - not ok
	// 3: dropping inside it - ok
	if (targetNode.head && moveType != 'inner') {
		return false;
	}
	
	tree = $.fn.zTree.getZTreeObj(treeId);
	
	// Renaming is temporarly disabled
	/*
	var neighbours;
	if (moveType == 'inner') {
		// children of targetNode
		neighbours = targetNode.children ? targetNode.children : [];
	} else {
		// neighbours of targetNode
		neighbours = targetNode.getParentNode().children;
	}
	
	// Verifying names to be unique within neighbours.
	// Non-unique names are changed.
	// TODO: rename 'item(n)' to 'item(n+1)'
	treeNodes.map( function(n) {
		// Check if name is unique. If not, add number to it.
		var ok = false;
		var i = 0;
		var newName;
		do {
			newName = i ? n.name + '(' + i + ')' : n.name;
			var x = neighbours.find( function(e) {
				return e.name == newName;
			});
			if (x) {
				i++;
			} else {
				ok = true;
			}
		} while (!ok);
		
		n.name = newName;
		tree.updateNode(n);
		neighbours.push(n);
	});*/
	
	return true;
}

function beforeEditName(treeId, treeNode) {
	console.log('beforeEditName');
	if (TREE_READONLY) {
		return false;
	}
	
	var zTree = $.fn.zTree.getZTreeObj(treeId);
	// Select text in node, which name we are going to edit.
	var inputId = treeNode.tId + "_input";
	// Input is not created yet, so we set timeout.
	setTimeout( function() {
		$('#' + inputId).select();
	}, 20);
	
	return true;
}

/* Returns node which lies under the current node.
 * 
 *  1       || next
 *  |       \/
 *  |-2
 *  |-3
 *  | |
 *  | |-4
 *  | |-5
 *  | |-6
 *  |
 *  |-7
 *  |-8
 *    |
 *    |-9
 *      |
 *      |-10
 * 
 */
function nextNode(treeNode) {
	if (treeNode.isParent) {
		return treeNode.children[0];
	}
	var n = treeNode;
	for(;;) {
		var nn = n.getNextNode();
		if(nn) {
			return nn;
		}
		var pn = n.getParentNode();
		if(pn) {
			n = pn;
		} else {
			return null;
		}
	}
}

function onClick(event, treeId, treeNode, clickFlag) {
	// expand the node
	tree = $.fn.zTree.getZTreeObj(treeId);
	tree.expandNode(treeNode, !treeNode.open, false, true, true);
	
	// shift - select
	/*if((event.originalEvent.shiftKey) && (tree.lastClicked)) {
		function pathToIndexes(path) {
			var indexes = [];
			path.map( function(p) {
				indexes.push(p.getIndex());
			});
			return indexes;
		}

		function compareIndexes(a, b) {
			for(var i = 0;;i++) {
				if(a[i] < b[i]) {
					return -1;
				}
				if(a[i] > b[i]) {
					return 1;
				}
				// a is over, b is not over
				if((a.length == i+1) && (b.length >= i+1)) {
					return -1;
				}
				// b is over, a is not over
				if((b.length == i+1) && (a.length >= i+1)) {
					return 1;
				}
				// a is over, b is over
				if((a.length == i+1) && (b.length == i+1)) {
					return 0;
				}
				//a is not over, b is not over -> next iteration
			}
		}
		
		var r = compareIndexes(
			pathToIndexes(treeNode.getPath()),
			pathToIndexes(tree.lastClicked.getPath())
		);
		
		var start;
		var finish;
		if (r != 0) {
			if (r < 0) {
				start = treeNode;
				finish = tree.lastClicked;
			} else {
				finish = treeNode;
				start = tree.lastClicked;				
			}
			
			var n = start;
			while(n != finish) {
				console.log(n);
				tree.selectNode(n, true, true);
				n = nextNode(n);
			}
			tree.selectNode(finish, true, true);
		}
	}*/
	// my!
	tree.lastClicked = treeNode;
	
	routerOpen(treeNode.id);
}

function onDblClick(event, treeId, treeNode) {
	if (!treeNode) {
		return;
	}
	
	var tree = $.fn.zTree.getZTreeObj(treeId);
	tree.editName(treeNode);
	$('#' + treeNode.tId + '_input').select();
}

function showRemoveBtn(id, node) {
	if (TREE_READONLY) {
		return false;
	}
	return !node.head;
}

function showRenameBtn(id, node) {
	if (TREE_READONLY) {
		return false;
	}
	return true;
}

var lastId = -1;
function newId() {
	lastId++;
	return lastId;
}

function addHoverDom(treeId, treeNode) {
	if (TREE_READONLY) {
		return;
	}
	
	var sObj = $("#" + treeNode.tId + "_span");
	if (treeNode.editNameFlag || $("#addBtn_"+treeNode.tId).length>0) {
		return;
	}
	
	var addStr = "<span class='button add' id='addBtn_" + treeNode.tId
		+ "' title='add node' onfocus='this.blur();'></span>";
		
	sObj.after(addStr);
	
	// Add new item
	var btn = $("#addBtn_"+treeNode.tId);
	if (btn) btn.bind("click", function() {
		var zTree = $.fn.zTree.getZTreeObj(treeId);
		var name; 
		var path; 
		var ok = false;
		var i = 1;
		while(!ok) {
			name = "new item " + i;
			path = buildPath(treeNode) + "/" + name;
			function filter(n) {
				return buildPath(n) === path;
			}
			if(!zTree.getNodesByFilter(filter, true)) {
				ok = true;
			}
			i++;
		}
		var guid = GetGUID();
		zTree.addNodes(treeNode, {id: guid, name: name, files: []});
		var newNode = zTree.getNodeByParam('id', guid);
		
		routerOpen(guid);
		zTree.editName(newNode);
		$('#' + newNode.tId + '_input').select();
		
		$updated.addClass('pending');
		$updated.show();
		TREE_MODIFIED = true;

		return false;
	});
};

function removeHoverDom(treeId, treeNode) {
	$("#addBtn_"+treeNode.tId).unbind().remove();
};

function buildPath(treeNode) {
	var parents = treeNode.getPath();
	var path = "";
	
	parents.map( function(n, i, arr) {
		path += n.s3path ? n.s3path : n.name;
		path += i < arr.length-1 ? "/" : "";
	});
	
	return path;
}

function buildPrefixPath(treeNode) {
	var parents = treeNode.getPath();
	var path = "";
	
	parents.slice(0, parents.length-1).map( function(n, i, arr) {
		path += n.s3path ? n.s3path : n.name;
		path += i < arr.length-1 ? "/" : "";
	});
	
	return path;
}

function onDrop(event, treeId, treeNodes, targetNode, moveType, isCopy) {
	if (TREE_READONLY) {
		return false;
	}
	
	$updated.addClass('pending');
	$updated.show();
	TREE_MODIFIED = true;
};

function onNodeCreated(event, treeId, treeNode) {

};

function beforeRemove(treeId, treeNode) {
	if (TREE_READONLY) {
		return false;
	}
	
	var tree = $.fn.zTree.getZTreeObj(treeId);
	$('#buttonDelete').click( function() {
		
		// recursively go through all children
		var f = function(n) {
			if (n.children) {
				n.children.map(f)
			}
			
			deleteRecursiveS3(USERID + '/' + n.id)
				.then( function(ok) {
					USER_USED_SPACE_CHANGED = true;
				})
				.catch( function(err) {
					onError(err);
				});
		};
		f(treeNode);
	
		if (treeNode.id == $('#editor').attr('guid')) {
			routerOpen(tree.getNodes()[0].id);
		}
	
		var $node = $('#' + treeNode.tId + '_a');
		$node.html('<div class="small-preloader"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>');
		$node.fadeOut('slow', function () {
			tree.removeNode(treeNode, false);
		});
		
		$updated.addClass('pending');
		$updated.show();
		TREE_MODIFIED = true;
	});
	var message = _translatorData["deleteQuestion1"][LANG] + " <strong>" + treeNode.name + "</strong>" + _translatorData["deleteQuestion2"][LANG];
	if (treeNode.isParent) {
		message += _translatorData["deleteQuestion3"][LANG];
	}
	$("#pDeleteMessage").html(message);
	$("#modalDelete").modal("show");
	return false;
};

function beforeRename(treeId, treeNode, newName, isCancel) {
	if (TREE_READONLY) {
		return false;
	}
	
	if(isCancel) {
		return true;
	}
	
	// Get array of neighbours
	var prevs = [];
	var p = treeNode.getPreNode();
	//console.log('starting p loop...');
	while(p !== null) {
		prevs.push(p);
		p = p.getPreNode();
		//console.log('p loop');
	}
	
	var nexts = [];
	var n = treeNode.getNextNode();
	//console.log('starting n loop...');
	while(n !== null) {
		nexts.push(n);
		n = n.getNextNode();
		//console.log('n loop');
	}
	
	neighbours = prevs.concat(nexts);
	
	// Refuse if one of the neighbours have the same name.
	var ok = true;
	neighbours.forEach( function(n) {
		if (n.name === newName) {
			ok = false;
		}
	});
	
	//console.log(ok);
	
	return ok;
}

function onRename(event, treeId, treeNode, isCancel) {
	var zTree = $.fn.zTree.getZTreeObj(treeId);
	
	// GUID of a document currently opened in editor
	var openedGUID = $('#editor').attr('guid');
	
	if (!isCancel) {
		$updated.addClass('pending');
		$updated.show();
		TREE_MODIFIED = true;
		
		if (treeNode.id == openedGUID) {
			$('#selectedDoc').html(treeNode.name);
		}
	}
	
	// Renamed node is selected in tree now. Select the node, opened in editor.
	zTree.selectNode(zTree.getNodeByParam('id', openedGUID), false, true);
}


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
		$('#editor-wrap').hide();
		$('#editor-preloader').show();
	} else {
		$('#editor-preloader').hide();
		$('#editor-wrap').show();
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
	var f = Math.min(1.0, (USER_USED_SPACE + USER_USED_SPACE_DELTA + USER_USED_SPACE_PENDING) / MAX_USED_SPACE);
	
	var canvas = $('#sizeIndicator')[0],
		ctx = canvas.getContext('2d'),
		w = canvas.width,
		h = canvas.height;
	
	var topLX = w*0.08, topRX = w*0.92,
		topLY = h*0.08, topRY = h*0.08,
		botLX = w*0.15, botRX = w*0.85,
		botLY = h*0.92, botRY = h*0.92,
		edgeLX = topLX*f + botLX*(1.0 - f),
		edgeRX = topRX*f + botRX*(1.0 - f),
		edgeLY = topLY*f + botLY*(1.0 - f),
		edgeRY = topRY*f + botRY*(1.0 - f);
	
	/*setProperty(ctx, 'imageSmoothingEnabled', false);
	setProperty(ctx, 'mozImageSmoothingEnabled', false);
	setProperty(ctx, 'oImageSmoothingEnabled', false);
	setProperty(ctx, 'webkitImageSmoothingEnabled', false);*/
	
	ctx.clearRect(0, 0, w, h);
	
	ctx.lineWidth = 0;
	ctx.fillStyle = '#DD6600';
	ctx.beginPath();
	ctx.moveTo(edgeLX, edgeLY);
	ctx.lineTo(botLX, botLY);
	ctx.lineTo(botRX, botRY);
	ctx.lineTo(edgeRX, edgeRY);
	ctx.fill();
	
	ctx.lineWidth = 2.00;
	
	ctx.strokeStyle = '#FFFFFF';
	ctx.beginPath();
	ctx.moveTo(topLX, topLY);
	ctx.lineTo(botLX, botLY);
	ctx.lineTo(botRX, botRY);
	ctx.lineTo(topRX, topRY);
	ctx.stroke();
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
	if (typeof(d) !== 'number') {
		console.log('updateUsedSpaceDelta wrong d:', d);
		return;
	}
	USER_USED_SPACE_DELTA += d;
	USER_USED_SPACE_CHANGED = true;
	updateIndicator();
}

function updateUsedSpacePending(p) {
	if (typeof(p) !== 'number') {
		console.log('updateUsedSpacePending wrong p:', p);
		return;
	}
	USER_USED_SPACE_PENDING += p
	updateIndicator();
}




window.onbeforeunload = function() {
	if (TREE_MODIFIED || ((USERID === TREE_USERID) && ($('#editor[modified="1"]').length > 0))) {
		return '';
	}
}
