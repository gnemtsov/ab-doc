function initTranslator(callback) {
	translator.initFromLocalStorage();

	$.getJSON("/scripts/translator-data.json", function(data) {
		translator.setData(data);
		callback();
	});
}
