"use strict";

/******************************************************************/
/******************************Tree********************************/
/******************************************************************/
(function (g, $) {

	// function creates object (calls abDoc.init - constructor)
	var abTree = function (docGUID) {
		var params = {  //external params
			treeWrap: this,
			docGUID : docGUID
		};
		return new abTree.init(params);
	};

	// object prototype
	abTree.prototype = {


	}	

	//** constructor **/
	abTree.init = function(params) {

		var self = this;
		$.extend(self, params);

		$.extend(self.prototype, $.fn.zTree.init($("#abTree"), zTreeSettings, zNodes));
		
	}

	// trick borrowed from jQuery so we don't have to use the 'new' keyword
	abTree.init.prototype = abTree.prototype;
	// add our abTree object to jQuery
	$.fn.abTree = abTree;
	
}(window, jQuery));  //pass external dependencies just for convenience, in case their names change outside later