// Data for translation

var _translatorData = {
	"back": {
		"ru": "На главную",
		"en": "Back to main page"
	}
}

//------------------------------------------------
//------------- console.log on/off ---------------
//------------------------------------------------

$(function() {
	if (window.location.hostname === 'ab-doc.com') {
		console.log = function() {};
	}
});


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
