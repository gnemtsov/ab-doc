AWSCognito.config.region = 'us-west-2';

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
		onClick: onClick,
		// For testing!
		onDrop: function (event, treeId, treeNodes, targetNode, moveType, isCopy) {
			console.log(targetNode);
			console.log(moveType);
		}
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

function beforeDrop (id, nodes, targetNode, moveType) {
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

// zTree /\


$(document).ready( function() {
    var cognitoUser = userPool.getCurrentUser();
    
    if(!cognitoUser) {
		$('#alertError').show();
		return;
	}
	
	console.log(cognitoUser);
	$('#username').text(cognitoUser.username);
	
	$('#linkSignOut').click( function() {
		cognitoUser.signOut();
		return true;	
	});	
	
	$.fn.zTree.init($("#abTree"), settings, []);
	// Adding head node (username)
	$.fn.zTree.getZTreeObj("abTree").addNodes(null, {id: 1, pId: 0, name: cognitoUser.username, open: true, head: true, icon: "/css/ztree/img/diy/1_open.png"});
});
