function translatePage() {
	$("#legend").html(translator.translate("loginPage"));
	$("#alertUserDoesntExist").html(translator.translate("alertUserDoesntExist"));
	$("#alertWrongPassword").html(translator.translate("alertWrongPassword"));
	$("#labelInputEmail").html(translator.translate("email"));
	$("#inputEmail").attr("placeholder", translator.translate("yourEmail"));
	$("#labelInputPassword").html(translator.translate("password"));
	$("#inputPassword").attr("placeholder", translator.translate("yourPassword"));
	$("#alertWrongCode").html(translator.translate("alertWrongCode"));
	$("#labelInputCode").html(translator.translate("confirmationCode"));
	$("#inputCode").attr("placeholder", translator.translate("yourConfirmationCode"));
	$("#buttonLogin").html(translator.translate("enter"));
	$("#linkSignup").html(translator.translate("signUp"));
}

