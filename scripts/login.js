AWSCognito.config.region = 'us-west-2';

var poolData = {
    UserPoolId : 'us-west-2_eb7axoHmO',
    ClientId : '1p7uks7hoothql33e17mssr7q1'
};
    
var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);

$(document).ready( function() {
	initTranslator( function() {
		$('#selectLang').change( function(event) {
			translator.setLang($("#selectLang option:selected").val());
			translatePage();
		});
		$('#selectLang').val(translator.getLang());
		translatePage();
		
		$('#buttonLogin').click( function() {
			$('.alert').hide();
			login($('#inputEmail').val(), $('#inputPassword').val(), $('#inputCode').val());
			return false;	
		});
		
		var cognitoUser = userPool.getCurrentUser();
		if(cognitoUser)
			window.location = '/main.html';
	});
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
