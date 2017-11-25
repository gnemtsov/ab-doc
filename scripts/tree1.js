"use strict";

var zTreeSettings = {
	view: {
		selectedMulti: true,
		addHoverDom: addHoverDom,
		removeHoverDom: removeHoverDom,
		showLine: false
	},
	edit: {
		enable: true,
		showRemoveBtn: showRemoveBtn,
		showRenameBtn: showRenameBtn,
	},
	data: {
		simpleData: {
			enable: true
		}
	},
	callback: {
		beforeDrag: beforeDrag,
		beforeDrop: beforeDrop,
		beforeEditName: beforeEditName,
		beforeRename: beforeRename,
		beforeRemove: beforeRemove,
		onClick: onClick,
		onDrop: onDrop,
		onNodeCreated: onNodeCreated,
		onRename: onRename
	}
};

//---------------------------------------
//----------- zTree callbacks -----------
//---------------------------------------

function beforeDrag(id, nodes) {
	if (TREE_READONLY) {
		return false;
	}
	
	var ok = true;
	nodes.forEach(function(x, i, arr) {
		// We can't drag head of the tree
		if (x.head === true) {
			ok = false;
		}
	});
	
	return ok;
}

// It always moves files on drop.
function beforeDrop (treeId, treeNodes, targetNode, moveType) {
	if (TREE_READONLY) {
		return false;
	}
	
	// We can't drop item out the tree
	if (targetNode === null) {
		return false;
	}
	
	// If targetNode is the head, there are 3 possible situations:
	// 1, 2: dropping before it or after it - not ok
	// 3: dropping inside it - ok
	if (targetNode.head && moveType != 'inner') {
		return false;
	}
	
	var tree = $.fn.zTree.getZTreeObj(treeId);
	
	// Renaming is temporarly disabled
	/*
	var neighbours;
	if (moveType == 'inner') {
		// children of targetNode
		neighbours = targetNode.children ? targetNode.children : [];
	} else {
		// neighbours of targetNode
		neighbours = targetNode.getParentNode().children;
	}
	
	// Verifying names to be unique within neighbours.
	// Non-unique names are changed.
	// TODO: rename 'item(n)' to 'item(n+1)'
	treeNodes.map( function(n) {
		// Check if name is unique. If not, add number to it.
		var ok = false;
		var i = 0;
		var newName;
		do {
			newName = i ? n.name + '(' + i + ')' : n.name;
			var x = neighbours.find( function(e) {
				return e.name == newName;
			});
			if (x) {
				i++;
			} else {
				ok = true;
			}
		} while (!ok);
		
		n.name = newName;
		tree.updateNode(n);
		neighbours.push(n);
	});*/
	
	return true;
}

function beforeEditName(treeId, treeNode) {
	console.log('beforeEditName');
	if (TREE_READONLY) {
		return false;
	}
	
	var zTree = $.fn.zTree.getZTreeObj(treeId);
	// Select text in node, which name we are going to edit.
	var inputId = treeNode.tId + "_input";
	// Input is not created yet, so we set timeout.
	setTimeout( function() {
		$('#' + inputId).select();
		if (treeNode.tId === ZTREE_SELECTED_NODE.tId) {
			$('#' + inputId).on('input', function() {
				$('#selectedDoc').text($(this).val());
			});
		}
	}, 20);
	
	return true;
}

/* Returns node which lies under the current node.
 * 
 *  1       || next
 *  |       \/
 *  |-2
 *  |-3
 *  | |
 *  | |-4
 *  | |-5
 *  | |-6
 *  |
 *  |-7
 *  |-8
 *    |
 *    |-9
 *      |
 *      |-10
 * 
 */
function nextNode(treeNode) {
	if (treeNode.isParent) {
		return treeNode.children[0];
	}
	var n = treeNode;
	for(;;) {
		var nn = n.getNextNode();
		if(nn) {
			return nn;
		}
		var pn = n.getParentNode();
		if(pn) {
			n = pn;
		} else {
			return null;
		}
	}
}

function onClick(event, treeId, treeNode, clickFlag) {
	// expand the node
	var tree = $.fn.zTree.getZTreeObj(treeId);
	tree.expandNode(treeNode, !treeNode.open, false, true, true);
	
	// shift - select
	/*if((event.originalEvent.shiftKey) && (tree.lastClicked)) {
		function pathToIndexes(path) {
			var indexes = [];
			path.map( function(p) {
				indexes.push(p.getIndex());
			});
			return indexes;
		}

		function compareIndexes(a, b) {
			for(var i = 0;;i++) {
				if(a[i] < b[i]) {
					return -1;
				}
				if(a[i] > b[i]) {
					return 1;
				}
				// a is over, b is not over
				if((a.length == i+1) && (b.length >= i+1)) {
					return -1;
				}
				// b is over, a is not over
				if((b.length == i+1) && (a.length >= i+1)) {
					return 1;
				}
				// a is over, b is over
				if((a.length == i+1) && (b.length == i+1)) {
					return 0;
				}
				//a is not over, b is not over -> next iteration
			}
		}
		
		var r = compareIndexes(
			pathToIndexes(treeNode.getPath()),
			pathToIndexes(tree.lastClicked.getPath())
		);
		
		var start;
		var finish;
		if (r != 0) {
			if (r < 0) {
				start = treeNode;
				finish = tree.lastClicked;
			} else {
				finish = treeNode;
				start = tree.lastClicked;				
			}
			
			var n = start;
			while(n != finish) {
				console.log(n);
				tree.selectNode(n, true, true);
				n = nextNode(n);
			}
			tree.selectNode(finish, true, true);
		}
	}*/
	// my!
	tree.lastClicked = treeNode;
	
	routerOpen(treeNode.id);
}

function showRemoveBtn(id, node) {
	if (TREE_READONLY) {
		return false;
	}
	return !node.head;
}

function showRenameBtn(id, node) {
	if (TREE_READONLY) {
		return false;
	}
	return true;
}

var lastId = -1;
function newId() {
	lastId++;
	return lastId;
}

function addHoverDom(treeId, treeNode) {
	if (TREE_READONLY) {
		return;
	}
	
	var sObj = $("#" + treeNode.tId + "_span");
	if (treeNode.editNameFlag || $("#addBtn_"+treeNode.tId).length>0) {
		return;
	}
	
	var addStr = "<span class='button add' id='addBtn_" + treeNode.tId
		+ "' title='add node' onfocus='this.blur();'></span>";
		
	sObj.after(addStr);
	
	// Add new item
	var btn = $("#addBtn_"+treeNode.tId);
	if (btn) btn.bind("click", function() {
		var zTree = $.fn.zTree.getZTreeObj(treeId);
		var name; 
		var path; 
		var ok = false;
		var i = 1;
		while(!ok) {
			name = "new item " + i;
			path = buildPath(treeNode) + "/" + name;
			function filter(n) {
				return buildPath(n) === path;
			}
			if(!zTree.getNodesByFilter(filter, true)) {
				ok = true;
			}
			i++;
		}
		var guid = GetGUID();
		zTree.addNodes(treeNode, {id: guid, name: name, files: []});
		var newNode = zTree.getNodeByParam('id', guid);
		
		routerOpen(guid);
		zTree.editName(newNode);
		$('#' + newNode.tId + '_input').select();
		
		ACTIVITY.push('tree modify', 'pending');

		return false;
	});
};

function removeHoverDom(treeId, treeNode) {
	$("#addBtn_"+treeNode.tId).unbind().remove();
};

function buildPath(treeNode) {
	var parents = treeNode.getPath();
	var path = "";
	
	parents.map( function(n, i, arr) {
		path += n.s3path ? n.s3path : n.name;
		path += i < arr.length-1 ? "/" : "";
	});
	
	return path;
}

function buildPrefixPath(treeNode) {
	var parents = treeNode.getPath();
	var path = "";
	
	parents.slice(0, parents.length-1).map( function(n, i, arr) {
		path += n.s3path ? n.s3path : n.name;
		path += i < arr.length-1 ? "/" : "";
	});
	
	return path;
}

function onDrop(event, treeId, treeNodes, targetNode, moveType, isCopy) {
	if (TREE_READONLY) {
		return false;
	}
	
	ACTIVITY.push('tree modify', 'pending');
	
	var zTree = $.fn.zTree.getZTreeObj(treeId);
	// Dropped node is selected in tree now. Select the node, opened in editor. 
	zTree.selectNode(ZTREE_SELECTED_NODE, false, true);
	console.log('Ok');
};

function onNodeCreated(event, treeId, treeNode) {

};

function beforeRemove(treeId, treeNode) {
	if (TREE_READONLY) {
		return false;
	}
	
	var tree = $.fn.zTree.getZTreeObj(treeId);
	$('#buttonDelete').click( function() {
		
		// recursively go through all children
		var f = function(n) {
			if (n.children) {
				n.children.map(f)
			}
			
			deleteRecursiveS3(USERID + '/' + n.id)
				.then( function(ok) {
					USER_USED_SPACE_CHANGED = true;
				})
				.catch( function(err) {
					onError(err);
				});
		};
		f(treeNode);
	
		if (treeNode === ZTREE_SELECTED_NODE) {
			routerOpen(tree.getNodes()[0].id);
		}
	
		var $node = $('#' + treeNode.tId + '_a');
		$node.html('<div class="small-preloader"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>');
		$node.fadeOut('slow', function () {
			tree.removeNode(treeNode, false);
		});
		
		ACTIVITY.push('tree modify', 'pending');
	});
	var message = _translatorData["deleteQuestion1"][LANG] + " <strong>" + treeNode.name + "</strong>" + _translatorData["deleteQuestion2"][LANG];
	if (treeNode.isParent) {
		message += _translatorData["deleteQuestion3"][LANG];
	}
	$("#pDeleteMessage").html(message);
	$("#modalDelete").modal("show");
	return false;
};

function beforeRename(treeId, treeNode, newName, isCancel) {
	if (TREE_READONLY) {
		return false;
	}
	
	if(isCancel) {
		return true;
	}
	
	// Get array of neighbours
	var prevs = [];
	var p = treeNode.getPreNode();
	//console.log('starting p loop...');
	while(p !== null) {
		prevs.push(p);
		p = p.getPreNode();
		//console.log('p loop');
	}
	
	var nexts = [];
	var n = treeNode.getNextNode();
	//console.log('starting n loop...');
	while(n !== null) {
		nexts.push(n);
		n = n.getNextNode();
		//console.log('n loop');
	}
	
	var neighbours = prevs.concat(nexts);
	
	// Refuse if one of the neighbours have the same name.
	var ok = true;
	neighbours.forEach( function(n) {
		if (n.name === newName) {
			ok = false;
		}
	});
	
	//console.log(ok);
	
	return ok;
}

var ZTREE_SELECTED_NODE;

function onRename(event, treeId, treeNode, isCancel) {
	var zTree = $.fn.zTree.getZTreeObj(treeId);
	
	// GUID of a document currently opened in editor
	var openedGUID = $('#editor').attr('guid');
	
	if (!isCancel) {
		ACTIVITY.push('tree modify', 'pending');
		
		if (treeNode.id == openedGUID) {
			$('#selectedDoc').html(treeNode.name);
		}
	}
	
	// Renamed node is selected in tree now. Select the node, opened in editor.
	zTree.selectNode(ZTREE_SELECTED_NODE, false, true);
}
