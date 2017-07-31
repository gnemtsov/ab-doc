function translatePage() {
	$("#legend").html(translator.translate("registration"));
	$("#alertWrongRepeat").html(translator.translate("alertWrongRepeat"));
	$("#alertBadPassword").html(translator.translate("alertBadPassword"));
	$("#alertUserExists").html(translator.translate("alertUserExists"));
	$("#labelInputEmail").html(translator.translate("email"));
	$("#inputEmail").attr("placeholder", translator.translate("yourEmail"));
	$("#labelInputPassword").html(translator.translate("password"));
	$("#inputPassword").attr("placeholder", translator.translate("yourPassword"));
	$("#inputPassword2").attr("placeholder", translator.translate("repeatPassword"));	
	$("#alertWrongCode").html(translator.translate("alertWrongCode"));
	$("#labelInputCode").html(translator.translate("confirmationCode"));
	$("#inputCode").attr("placeholder", translator.translate("yourConfirmationCode"));
	$("#buttonSignUp").html(translator.translate("signUp2"));
}
