// Everything for about page is here
"use strict";

(function (g, $) {
	console.log('about.js');
	
	var $topTreesUl = $('#top-trees'),
		MAX_TREES = 10;

	$topTreesUl.before( $small_preloader );
	
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
			
			var topTrees = []; // {$tree, size}

			
			trees.forEach( function(tree) {
				console.log('AWS.config.credentials when using s3', AWS.config.credentials);
				var params = {
					Bucket: STORAGE_BUCKET,
					Key: tree.key
				}
				s3.getObject(params).promise()
					.then( function(obj) {
						var treeJson = JSON.parse(obj.Body.toString('utf-8'));
						var size = 1 + numberOfSubNodes(treeJson[0]);
						
						// ignore empty trees
						if (size === 0) {
							return;
						}
						// ignore unnamed trees
						if (!treeJson[0].ab_username) {
							treeJson[0].ab_username = 'Incognito';
						}
						
						var href = '/' + tree.owner.replace(':','_') + '/' + treeJson[0].id;
						// security measure.
						// treeJson[0].id could contain " and malicious html after it
						href = href.split('"')[0];
						
						var $newTree = $(
							'<li class="list-group-item">' +
								'<a href="' + href + '">' + treeJson[0].ab_username.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</a>' +
								', <span class="docs-count">' + size + ' ' + abUtils.translatorData['docs'][LANG](size) + '</span>' +
							'</li>'
						);
						$newTree.on('click', function(event) {
							event.preventDefault();
							ROUTER.setOwner(tree.owner).open(treeJson[0].id);
						});
						
						var pos = topTrees.findIndex( function(t) {
							return size > t.size;
						});
						
						if (topTrees.length === 0) {
							$small_preloader.remove();
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
