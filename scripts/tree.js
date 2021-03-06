"use strict";

/******************************************************************/
/******************************Tree********************************/
/******************************************************************/
//TOTHINK first click only selects node, second click opens|closes folder

(function (g, $) {
	
	//----------- abTree object--------------//
	var	$abTree /*tree UL*/;

	// function creates object (calls abTree.init - constructor)
	var abTree = function (params) {
		params.treeContainer = this;
		params.treeKey = params.ownerid + '/tree.json';
		return new abTree.init(params);
	};

	// object prototype
	abTree.prototype = {
	}	
	
	//----------- zTree callbacks -----------//
	abTree.prototype.beforeDrag = function (id, nodes) {
		var self = this;

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
	abTree.prototype.beforeDrop = function  (treeId, treeNodes, targetNode, moveType) {
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
	abTree.prototype.nextNode = function (treeNode) {
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

	var _lastExpand = Date.now();
	abTree.prototype.beforeClick = function (treeId, treeNode, clickFlag) {
		var self = this;
		
		// Clicking on a node makes it expand/collapse. Node should not collapse
		// if selected node is inside it, so:
		// can collapse this node only if no selected nodes are it's child
		// currently there is only 1 selected node in a moment,
		// but it will change in the future.
		// expanding works always
		var ok = !treeNode.open || 
				 self.tree.getSelectedNodes().reduce( 
					function(acc, selected) {
						var path = selected.getPath();
						path.splice(-1, 1);
						return acc && (path.indexOf(treeNode) === -1);
					}, 
					true
			 	 );
		
		// expand the node
		if (ok) {
			if (Date.now() - _lastExpand > 350) {
				self.tree.expandNode(treeNode, !treeNode.open, false, true, true);
				_lastExpand = Date.now();
			}
		}
		
		//automatically switch to doc-solo on second click/touch for small devices
		if (g.isSmallDevice) {
			if(self.lastClicked === undefined || self.lastClicked.id !== treeNode.id){
				if (self.lastClicked !== undefined) {
					self.removeHoverDom(treeId, self.lastClicked);
				}
				self.lastClicked = treeNode;
				self.addHoverDom(treeId, treeNode);
			} else {
				g.COLUMNS_MODE = 'document';
				$(window).resize();
				ROUTER.open(treeNode.id);
			}
		} else {
			ROUTER.open(treeNode.id);
		}
		
		return false; //we don't need click to fire, node is always selected by ROUTER
	}

	abTree.prototype.addHoverDom = function (treeId, treeNode) {
		console.log('addHoverDom');
		
		var self = this;
		
		var sObj = $("#" + treeNode.tId + "_span");
		if (treeNode.editNameFlag || $('#' + treeNode.tId + '_add').length>0) {
			return;
		}
		
		if (!self.readOnly) {
			var addStr = "<span class='button add' id='" + treeNode.tId
			+ "_add' title='add node' onfocus='this.blur();'></span>";
		
			addStr += "<span class='button edit' id='" + treeNode.tId
				+ "_edit' title='rename' treenode_edit=''></span>";
			
			if (!treeNode.head) {
				addStr += "<span class='button remove' id='" + treeNode.tId
					+ "_remove' title='remove' treenode_remove=''></span>";		
			}
				
			sObj.after(addStr);
		}
		
		// Add new item
		var btnAdd = $('#' + treeNode.tId + '_add');
		if (btnAdd) {
			btnAdd.on('click', function() {
				var name,
					path,
					ok = false,
					i = 1;
				while(!ok) {
					name = 'new item ' + i;
					path = self.buildPath(treeNode) + '/' + name;
					function filter(n) {
						return self.buildPath(n) === path;
					}
					if(!self.tree.getNodesByFilter(filter, true)) {
						ok = true;
					}
					i++;
				}
				var guid = abUtils.GetGUID();
				self.tree.addNodes(treeNode, {id: guid, name: name, files: []});
				var newNode = self.tree.getNodeByParam('id', guid);
				
				ROUTER.open(guid);
				
				self.tree.editName(newNode);
				$('#' + newNode.tId + '_input').select();
				
				ACTIVITY.push('tree modify', 'pending');

				return false;
			});
			btnAdd.on('mousedown mouseup', function(){});
		}
		
		// Remove an item
		var btnRemove = $('#' + treeNode.tId + '_remove');
		if (btnRemove) {
			btnRemove.on('click', function() {
				self.tree.removeNode(treeNode, true);
				return false;
			});
			btnRemove.on('mousedown mouseup', function(){});
		}
		
		// Rename an item
		var btnRename = $('#' + treeNode.tId + '_edit');
		if (btnRename) {
			btnRename.on('click mouseup mousedown', function() {
				self.tree.editName(treeNode);
				return false;
			});
			btnRename.on('mousedown mouseup', function(){});
		}	
	};

	abTree.prototype.removeHoverDom = function(treeId, treeNode) {
		$('#' + treeNode.tId + '_add').off().remove();
		$('#' + treeNode.tId + '_remove').off().remove();
		$('#' + treeNode.tId + '_edit').off().remove();
	};

	abTree.prototype.buildPath = function(treeNode) {
		var parents = treeNode.getPath();
		var path = "";
		
		parents.map( function(n, i, arr) {
			path += n.s3path ? n.s3path : n.name;
			path += i < arr.length-1 ? "/" : "";
		});
		
		return path;
	}

	abTree.prototype.buildPrefixPath = function(treeNode) {
		var parents = treeNode.getPath();
		var path = "";
		
		parents.slice(0, parents.length-1).map( function(n, i, arr) {
			path += n.s3path ? n.s3path : n.name;
			path += i < arr.length-1 ? "/" : "";
		});
		
		return path;
	}

	abTree.prototype.onDrop = function(event, treeId, treeNodes, targetNode, moveType, isCopy) {
		var self = this;
		
		ACTIVITY.push('tree modify', 'pending');
		
		// Dropped node is selected in tree now. Select the node, opened in editor. 
		self.selectNode(self.selectedNode, false, true);
		console.log('Tree.js: onDrop Ok');
	};

	abTree.prototype.beforeRemove = function(treeId, treeNode) {
		var self = this;
		
		$('#buttonDelete').off('click');
		$('#buttonDelete').on('click', function() {
			
			// recursively go through all children
			var f = function(n) {
				if (n.children) {
					n.children.map(f)
				}
				
				abUtils.deleteRecursiveS3(self.ownerid + '/' + n.id)
					.then( function(ok) {
						g.INDICATOR.userUsedSpaceChanged = true;
					})
					.catch( function(err) {
						abUtils.onError(err);
					});
			};
			f(treeNode);
		
			if (treeNode === self.selectedNode) {
				ROUTER.open(self.tree.getNodes()[0].id);
			}
		
			var $node = $('#' + treeNode.tId + '_a');
			$node.html('<div class="small-preloader"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>');
			$node.fadeOut('slow', function () {
				self.tree.removeNode(treeNode, false);
			});
			
			ACTIVITY.push('tree modify', 'pending');
		});
		var message = abUtils.translatorData["deleteQuestion1"][LANG] + " <strong>" + treeNode.name + "</strong>" + abUtils.translatorData["deleteQuestion2"][LANG];
		if (treeNode.isParent) {
			message += abUtils.translatorData["deleteQuestion3"][LANG];
		}
		$("#pDeleteMessage").html(message);
		$("#modalDelete").modal("show");
		return false;
	};

	abTree.prototype.beforeRename = function(treeId, treeNode, newName, isCancel) {
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

	abTree.prototype.onRename = function(event, treeId, treeNode, isCancel) {
		var self = this;
		
		console.log('Tree.js: on rename');		
		if (isCancel) {
			if (self.selectedNode.tId === treeNode.tId) {
				var title = treeNode.name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
				$('#selectedDoc').html(title);
				document.title = treeNode.name;
			}
		} else {
			ACTIVITY.push('tree modify', 'pending');			
		}
		
		// Renamed node is selected in tree now. Select the node, opened in editor.
		self.selectNode(self.selectedNode, false, true);
	}

	// Mark this node as selected, call tree.selectNode
	abTree.prototype.selectNode = function(node) {
		this.selectedNode = node;
		this.tree.selectNode(node, false, true);
	}

	//** constructor **/
	abTree.init = function(params) {
		var self = this;
		$.extend(self, params);

		if(!$abTree instanceof $){
			$abTree.off().empty(); //empty and remove also unbind old event handlers
		}	
		$abTree = $(self.treeContainer);

		$abTree.on('input', 'input', function() {
			if($(this).attr('id') === self.selectedNode.tId + '_input'){
				var title = $(this).val().replace(/</g, '&lt;').replace(/>/g, '&gt;');
				$('#selectedDoc').html(title);
				document.title = $(this).val();
			}
		});

		var params = {
			Bucket: STORAGE_BUCKET,
			Key: self.treeKey
		}
		self.promise = s3.getObject(params).promise()
			.then( function(data) {
				return JSON.parse(data.Body.toString('utf-8'));
			})
			.catch( function(error) {
				if (!self.readOnly && error.code === 'NoSuchKey') {
					self.virgin = true;
					return [{id: abUtils.GetGUID(), name: g.abUtils.translatorData['rootName'][LANG]}];
				} else {
					abUtils.onFatalError(error, 'couldNotLoadTree');
					throw error;
				}
			})
			.then( function(zNodes) {
				self.zNodes = zNodes;
				self.rootGUID = self.zNodes[0].id;
				self.zNodes[0].head = true;
				self.zNodes[0].open = true;
				if(!self.zNodes[0].name.length){
					self.zNodes[0].name = g.abUtils.translatorData['rootName'][LANG];
				}
				if (self.zNodes[0].ab_username) {
					self.ownerName = self.zNodes[0].ab_username;
				}

				self.zSettings = {
					view: {
						selectedMulti: true,
						addHoverDom: self.readOnly ? false : self.addHoverDom.bind(self),
						removeHoverDom: self.removeHoverDom.bind(self),
						showLine: false,
						dblClickExpand: false
					},
					edit: {
						enable: !self.readOnly,
						showRemoveBtn: false,
						showRenameBtn: false
					},
					data: {
						simpleData: {
							enable: true
						}
					},
					callback: {
						beforeClick: self.beforeClick.bind(self),
						beforeDrag: self.readOnly ? false : self.beforeDrag.bind(self),
						beforeDrop: self.readOnly ? false : self.beforeDrop.bind(self),
						beforeRename: self.readOnly ? false : self.beforeRename.bind(self),
						beforeRemove: self.readOnly ? false : self.beforeRemove.bind(self),
						onDrop: self.onDrop.bind(self),
						onRename: self.onRename.bind(self),
						
						onMouseDown: function(){console.log('ztree mouse down test');},
						onMouseUp: function(){console.log('ztree mouse up test');}
					}
				};
							
				self.tree = $.fn.zTree.init($abTree, self.zSettings, self.zNodes);
				self.selectedNode = self.tree.getNodes()[0];
				
				// attach touch handlers
				attachTouchToMouseListeners($abTree, $('#ztree'), 8, 250);

				if(!self.readOnly){ 
					
					//init timer if not readOnly
					TIMERS.set(function () {
						if(ACTIVITY.get('tree modify') === 'pending'){

							ACTIVITY.push('tree modify', 'saving');

							var data,
								all_nodes = self.tree.getNodesByParam('id', self.rootGUID);

							if (all_nodes) {
								var f = function(n) {
									var abNode = {
										id : n.id,
										name : n.name,
										children : n.children ? n.children.map(f) : []
									};
									
									return abNode;
								};
								
								data = all_nodes.map(f);
								if (self.ownerName) {
									data[0].ab_username = self.ownerName;
								}
							} else {
								data = [];
							}
														
							var params = {
								Bucket: STORAGE_BUCKET,
								Key: self.treeKey,
								Body: JSON.stringify(data),
								ContentType: 'application/json',
								ContentDisposition: abUtils.GetContentDisposition('tree.json'),
								ACL: 'public-read'
							};

							Promise.all([ 
								s3.putObject(params).promise(), 
								new Promise(function(res, rej) { setTimeout(res, 800); })
							]).then(function(){
								ACTIVITY.flush('tree modify');
							}).catch(function(){
								g.abUtils.onWarning(g.abUtils.translatorData['couldNotSave'][g.LANG]);
							});

						}
					}, 3000, 'tree');

					if(self.virgin){
						ACTIVITY.push('tree modify', 'pending');
					}

				}
				return;
			});

	}

	// trick borrowed from jQuery so we don't have to use the 'new' keyword
	abTree.init.prototype = abTree.prototype;
	// add our abTree object to jQuery
	$.fn.abTree = abTree;
	
}(window, jQuery));  //pass external dependencies just for convenience, in case their names change outside later
