AWSCognito.config.region = 'us-west-2';

var poolData = {
    UserPoolId : 'us-west-2_eb7axoHmO',
    ClientId : '1p7uks7hoothql33e17mssr7q1'
};

var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);

$(document).ready( function() {
    var cognitoUser = userPool.getCurrentUser();
    
    if(!cognitoUser) {
		$('#alertError').show();
		return;
	}
	
	console.log(cognitoUser);
	$('#username').text(cognitoUser.username);
	
	$('#linkSignOut').click( function() {
		cognitoUser.signOut();
		return true;	
	});	
});