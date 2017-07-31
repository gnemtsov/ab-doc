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
		
		$('#buttonSignUp').click( function() {
			$('.alert').hide();
			signUp($('#inputEmail').val(), $('#inputPassword').val(), $('#inputPassword2').val(), $('#inputCode').val());
			return false;			
		});
	});
});

function signUp(userEmail, userPassword, userPassword2, confirmationCode) {
	console.log('sign up');    

	if(userPassword != userPassword2) {
		$('#alertWrongRepeat').show();
		return false;
	}
	  
	var dataEmail = {
    	Name : 'email',
    	Value : userEmail
	};

    var attributeEmail = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataEmail);

	var attributeList = [attributeEmail];

	if(confirmationCode) {
		console.log('confirm');
		
		var userData = {
        	Username : userEmail,
        	Pool : userPool
    	};
    
    	var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);		
		
		cognitoUser.confirmRegistration(confirmationCode, true, function(err, result) {
			if(err) {
				console.log(err.name);
				switch(err.name) {
					case 'CodeMismatchException':
						$('#alertWrongCode').show();
						break;				
				}
				return false;		
			}
			window.location = '/index.html';
		});	
		
		return;
	}  

    userPool.signUp(userEmail, userPassword, attributeList, null, function(err, result){
        if (err) {
        	switch(err.name) {
        		case 'InvalidParameterException':
        		    $('#alertBadPassword').show();
        			break;
        		case 'InvalidPasswordException':
        			$('#alertBadPassword').show();
        			break;
        		case 'UsernameExistsException':
        			$('#div').show();
        			break;
        	}
            console.log(err.name);
            return;
        }
 
        cognitoUser = result.user;
        $('#divConfirmation').show();
    });
    
    return false;
};
