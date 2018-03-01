// Everything for about page is here
"use strict";

(function (g, $) {
	console.log('about.js');
	
	var MAX_TREES = 15;
	
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
			
			var $topTreesUl = $('#top-trees'),
				topTrees = []; // {$tree, size}
			
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
						
						// ignore empty trees
						if (size === 0) {
							return;
						}
						
						var $newTree = $('<li class="list-group-item">' + name + ' | ' + size + '</li>');
						var pos = topTrees.findIndex( function(t) {
							return size > t.size;
						});
						
						if (topTrees.length === 0) { 
							$topTreesUl.append($newTree);
							topTrees.push({
								$tree: $newTree,
								size: size
							});
						} else {
							if (pos > -1) {
								// Head or somewhere in the middle of list
								topTrees[pos].$tree.before($newTree);
								topTrees.splice(pos, 0, {
									$tree: $newTree,
									size: size
								});
								// keeping top <MAX_TREES> elements
								if (topTrees.length > MAX_TREES) {
									topTrees.pop().$tree.remove();
								}
							} else {
								// End of list
								if (topTrees.length < MAX_TREES) {
									$topTreesUl.append($newTree);
									topTrees.push({
										$tree: $newTree,
										size: size
									});
								}
							}
						}
						
						console.log(topTrees);
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
