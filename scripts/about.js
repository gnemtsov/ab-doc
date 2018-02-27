// Everything for about page is here
"use strict";

(function (g, $) {
	var topTrees = [],
		$treeList = $('#todo'); // TODO
	
	abUtils.listS3Files('')
		.then( function(files) {
			// TODO: 
			var trees = [];
			files.forEach( function(file) {
				var splitedKey = file.Key.split('/');
				if (splitedKey[1] === 'tree.json') {
					trees.push({
						owner: splitedKey[0],
						key: file.Key
					});
				}
			});
			
			console.log(trees);
			
			trees.forEach( function(tree) {
				var params = {
					Bucket: STORAGE_BUCKET,
					Key: tree.key
				}
				s3.getObject(params).promise()
					.then( function(obj) {
						var treeJson = JSON.parse(obj.Body.toString('utf-8'));
						
						console.log(treeJson);
					});
			});
		});
}(window, jQuery));
