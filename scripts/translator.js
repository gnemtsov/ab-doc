var translator = {
	setLang: function(lang) {
		localStorage.setItem("ab-doc.translator.lang", lang);
		this._lang = lang;
	},
	getLang: function() {
		return this._lang;
	},
	setData: function(data) {
		this._data = data;
	},
	translate: function(text) {
		var d = this._data[text];
		if(d) {
			return this._data[text][this._lang];
		} else {
			console.log("Can't translate ", text);
			return "";
		}
	},
	initFromLocalStorage: function() {
		var lang = localStorage.getItem("ab-doc.translator.lang");
		if(lang) {
			this.setLang(lang);
		} else {
			this.setLang("ru");
		}
	}
};
