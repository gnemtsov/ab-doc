// Data for translation

var _translatorData = {
	"loginPage": {
		"ru": "Вход",
		"en": "Login page"
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
		"en": "Sign in"
	},
	"signUp": {
		"ru": "Нет учётной записи?",
		"en": "Sign up"
	},
	
	"registration": {
		"ru": "Регистрация",
		"en": "Registration"
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
	"repeatPassword": {
		"ru": "Повторите пароль",
		"en": "Repeat password"
	},
	"signUp2": {
		"ru": "Создать учётную запись",
		"en": "Sign up"
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
	}
}

// ====================

AWSCognito.config.region = 'us-west-2';

var poolData = {
    UserPoolId : 'us-west-2_eb7axoHmO',
    ClientId : '1p7uks7hoothql33e17mssr7q1'
};
    
var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);

$(document).ready( function() {
	// Translation
	var lang = localStorage.getItem('ab-doc.translator.lang');
	$('[data-translate]').each( function(i, el) {
		var dt = $(el).attr('data-translate'),
			at = $(el).attr('attr-translate');
		
		if (at) {
			$(el).attr(at, _translatorData[dt][lang]);
		} else {
			$(el).html(_translatorData[dt][lang]);
		}
	});
	// ========
	
	$('#selectLang').change( function(event) {
		localStorage.setItem('ab-doc.translator.lang', $('#selectLang option:selected').val());
		location.reload();
	});
	$('#selectLang').val(lang);
	
	$('#buttonLogin').click( function() {
		$('.alert').hide();
		login($('#inputEmail').val(), $('#inputPassword').val(), $('#inputCode').val());
		return false;	
	});
	
	var cognitoUser = userPool.getCurrentUser();
	if(cognitoUser) {
		window.location = '/main.html';
	}
});

function login(email, password, confirmationCode) {
	//console.log('Email: ' + email);
	//console.log('Password: ' + password);	
	
	AWSCognito.config.region = 'us-west-2';	
	
    var authenticationData = {
        Username : email,
        Password : password,
    };
    
    var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);

    var userData = {
        Username : email,
        Pool : userPool
    };
    
    var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
    
	if(confirmationCode){
		console.log('confirm');
		cognitoUser.confirmRegistration(confirmationCode, true, function(err, result) {
			if(err) {
				console.log(err.name);
				switch(err.name) {
					case 'CodeMismatchException':
						$('#alertWrongCode').show();
						break;				
				}
				return;		
			}
		});	
	}    
    
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            //console.log('access token: ' + result.getAccessToken().getJwtToken());
            /*Use the idToken for Logins Map when Federating User Pools with Cognito Identity or when passing through an Authorization Header to an API Gateway Authorizer*/
            //console.log('idToken: ' + result.idToken.jwtToken);
            window.location = '/main.html';
        },

        onFailure: function(err) {
        	console.log(err.name);
			switch(err.name) {
				case 'UserNotFoundException':
					$('#alertUserDoesntExist').show();
					break;
				case 'NotAuthorizedException':
					$('#alertWrongPassword').show();
					break;		
				case 'UserNotConfirmedException':
					$('#divConfirmation').show();
					break;									
			}            
        },
        
		newPasswordRequired: function(userAttributes, requiredAttributes) {
            // User was signed up by an admin and must provide new 
            // password and required attributes, if any, to complete 
            // authentication.

            // Get these details and call 
            alert('Требуется сменить пароль. Эта функция пока не работает.');
            //cognitoUser.completeNewPasswordChallenge(newPassword, data, this)
        }
    });
}
