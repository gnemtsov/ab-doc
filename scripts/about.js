// Everything for about page is here
"use strict";

(function (g, $) {
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
			
			var $topTreesDiv = $('#top-trees'),
				topTreesChildren = [],
				topTreesSizes = [];
			
			trees.forEach( function(tree) {
				var params = {
					Bucket: STORAGE_BUCKET,
					Key: tree.key
				}
				s3.getObject(params).promise()
					.then( function(obj) {
						var treeJson = JSON.parse(obj.Body.toString('utf-8'));
						var name = tree.owner,
							size = numberOfSubNodes(treeJson[0]);
						
						var newTreeHtml = '<div>' + name + ' | ' + size + '</div>';
						var pos = topTreesSizes.findIndex( function(s) {
							return size > s;
						});
						if (pos > -1) {
							topTreesSizes.splice(pos, 0, size);
						} else {
							topTreesSizes.push(size);
						}
						
						console.log(topTreesSizes);
					});
			});
		});
		
	function numberOfSubNodes(node) {
		var n = node.children.length;
		return node.children.reduce( function(acc, c) {
			return acc + numberOfSubNodes(c);
		}, n);
	}
}(window, jQuery));
