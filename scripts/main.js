AWSCognito.config.region = 'us-west-2';
AWS.config.region = 'us-west-2';

var poolData = {
    UserPoolId : 'us-west-2_eb7axoHmO',
    ClientId : '1p7uks7hoothql33e17mssr7q1'
};

var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);

// zTree \/
var settings = {
	view: {
		selectedMulti: true,
		addHoverDom: addHoverDom,
		removeHoverDom: removeHoverDom,
	},
	edit: {
		enable: true,
		showRemoveBtn: showRemoveBtn,
		showRenameBtn: showRenameBtn,
		drag: {
			isCopy: true,
			isMove: true,
			prev: true,
			inner: true,
			next: true
		}
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
		// For testing!
		onDrop: onDrop,
		onNodeCreated: onNodeCreated
	}
};

function beforeDrag(id, nodes) {
	var ok = true;
	nodes.forEach(function(x, i, arr) {
		// We can't drag head of the tree (node with username)
		if (x.head === true) {
			ok = false;
		}
	});
	
	return ok;
}

// It always moves files on drop.
// TODO: copying, handle situation when there is already folder with this name.
function beforeDrop (treeId, treeNodes, targetNode, moveType) {
	// We can't drop item out the tree
	if (targetNode === null) {
		return false;
	}
	// If targetNode is the head (username), there are 3 possible situations:
	// 1, 2: dropping before it or after it - not ok
	// 3: dropping inside it - ok
	if (targetNode.head && moveType != "inner") {
		return  false;
	}
	
	// S3 starts here
	treeNodes.map( function(n) {
		var newPrefix;
		if (moveType != "inner") {
			newPrefix = buildPrefixPath(targetNode) + "/" + n.name;
		} else {
			newPrefix = buildPath(targetNode) + "/" + n.name;
		}
		moveTreeS3(n, newPrefix);
	});
	
	return true;
}

function beforeEditName(id, node) {
	// Do not allow editing name of the head (username)
	if (node.head === true) {
		return false;
	}
	return true;
}

function onClick(event, id, node, clickFlag) {
	$('#selectedDoc')[0].innerHTML = node.name;
}

function showRemoveBtn(id, node) {
	return !node.head;
}

function showRenameBtn(id, node) {
	return !node.head;
}

var newCount = 0;
function addHoverDom(treeId, treeNode) {
	var sObj = $("#" + treeNode.tId + "_span");
	if (treeNode.editNameFlag || $("#addBtn_"+treeNode.tId).length>0) {
		return;
	}
	
	var addStr = "<span class='button add' id='addBtn_" + treeNode.tId
		+ "' title='add node' onfocus='this.blur();'></span>";
		
	sObj.after(addStr);
	
	var btn = $("#addBtn_"+treeNode.tId);
	if (btn) btn.bind("click", function() {
		var zTree = $.fn.zTree.getZTreeObj("abTree");
		newCount++;
		zTree.addNodes(treeNode, {id:newCount, pId:treeNode.id, name:"new item " + newCount});
		return false;
	});
};

function removeHoverDom(treeId, treeNode) {
	$("#addBtn_"+treeNode.tId).unbind().remove();
};

/*function buildPath(treeNode) {
	var path = treeNode.s3path ? treeNode.s3path : treeNode.name
	var n = treeNode.getParentNode();
	
	while(n !== null) {
		path = (n.s3path ? n.s3path : n.name) + "/" + path;
		n = n.getParentNode();
	}
	
	return path;
};*/

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
	
};

// TODO: fix overwriting if object with this name already exists.
function onNodeCreated(event, treeId, treeNode) {
	var params = {
		Body: "",
		Bucket: "ab-doc-storage",
		Key: buildPath(treeNode)
	};
	s3.putObject(params, function(err, data) {
		if (err) {
			console.log(err);
		}
	});
};

function beforeRemove(treeId, treeNode) {
	removeTreeS3(treeNode);
	return true;
};

function beforeRename(treeId, treeNode, newName, isCancel) {
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
	
	neighbours = prevs.concat(nexts);
	
	// Refuse if one of the neighbours have same name.
	var ok = true;
	neighbours.map( function(n) {
		if (n.name === newName) {
			ok = false;
		}
	});
	
	//console.log(ok);
	
	if (ok) {
		// Moving files seems to be the only way to rename them. :-( 
		moveTreeS3(treeNode, buildPrefixPath(treeNode) + "/" + newName);
	}
	
	return ok;
}

function removeTreeS3(treeNode) {
	var params = {
		Bucket: "ab-doc-storage",
		Key: buildPath(treeNode)
	};
	//console.log(treeNode.getPath());
	s3.deleteObject(params, function(err, data) {
		if (err) {
			console.log(err);
		}
	});
	
	if(treeNode.isParent) {
		treeNode.children.map(removeTreeS3);
	}
}

function moveTreeS3(treeNode, newPrefix) {
	// If trying to move to the same location.
	if (buildPath(treeNode) === newPrefix) {
		return;
	}
	//console.log(buildPath(treeNode), newPrefix);
	
	var files = [];
	var oldPrefix = buildPath(treeNode);
	var params = {
		Bucket: "ab-doc-storage",
		Prefix: oldPrefix,
		MaxKeys: 1000
	};
	
	// Ugly recursion!!!!!!!!
	// TODO: rewrite it all!!!!!!!!
	function f(err, data) {
		if (err) {
			console.log(err);
			return;
		}
		// Data must be undefined when calling this function directly
		// It starts objects loading from S3
		// Then this function is only used as a callback in s3.listObjects
		if (!data) {
			s3.listObjects(params, f);
			return;
		}
		
		files = files.concat(data.Contents);
		if (data.isTruncated) {
			params.Marker = data.NextMarker;
			s3.listObjects(params, f);
		} else {
			g();
		}
	};
	// g is called inside f, when list of files is loaded from S3.
	function g() {
		// Copy each file to new location and remove old.
		files.map( function(f) {
			var oldKey = f.Key;
			var newKey = newPrefix + f.Key.slice(oldPrefix.length);
			var copyParams = {
				Bucket: "ab-doc-storage",
				CopySource: "/ab-doc-storage/" + oldKey,
				Key: newKey
			};
			//console.log(newKey);
			s3.copyObject(copyParams, function(err, data) {
				if (err) {
					console.log(err);
				}
				var deleteParams = {
					Bucket: "ab-doc-storage",
					Key: oldKey
				};
				s3.deleteObject(deleteParams, function(err, data) {
					if (err) {
						console.log(err);
					}
				});	
			});	
		});	
	};
	f(undefined, undefined);
}

// zTree /\

var s3;

$(document).ready( function() {
    var cognitoUser = userPool.getCurrentUser();
    		
	$('#linkSignOut').click( function() {
		cognitoUser.signOut();
		return true;	
	});	
	
	$('#username').text(cognitoUser.username);
    
    if(!cognitoUser) {
		$('#alertError').show();
		return;
	}
	cognitoUser.getSession( function(err, session) {
		if(err) {
			$('#alertError').show();
			return;			
		} 

		AWS.config.credentials = new AWS.CognitoIdentityCredentials({
			IdentityPoolId : 'us-west-2:f96a0ddb-ab25-4344-a0f9-3feb9ea80fa9',
			Logins : {
				'cognito-idp.us-west-2.amazonaws.com/us-west-2_eb7axoHmO' : session.getIdToken().getJwtToken()
			}
		});
		
		AWS.config.credentials.refresh( function(err) {
			if (err) {
				console.log(err);
				return;
			}
			
			AWS.config.credentials.get( function() {
				var accessKeyId = AWS.config.credentials.accessKeyId;
				var secretAccessKey = AWS.config.credentials.secretAccessKey;
				var sessionToken = AWS.config.credentials.sessionToken;
				
				s3 = new AWS.S3({
					apiVersion: '2006-03-01',
					accessKeyId: accessKeyId,
					secretAccessKey: secretAccessKey,
					sessionToken: sessionToken,
					region: "eu-west-1"
				});
				
				$.fn.zTree.init($("#abTree"), settings, []);
				// Adding head node (username)
				$.fn.zTree.getZTreeObj("abTree").addNodes(null, {id: 1, pId: 0, name: cognitoUser.username, s3path: AWS.config.credentials.identityId, open: true, head: true, icon: "/css/ztree/img/diy/1_open.png"});
			});
		});
	});
});
