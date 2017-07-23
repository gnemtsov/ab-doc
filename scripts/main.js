AWSCognito.config.region = 'us-west-2';

var poolData = {
    UserPoolId : 'us-west-2_eb7axoHmO',
    ClientId : '1p7uks7hoothql33e17mssr7q1'
};

var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);

// zTree \/
var settings = {
	view: {
		selectedMulti: false
	},
	edit: {
		enable: true,
		showRemoveBtn: false,
		showRenameBtn: false,
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

var zNodes = [
	{ id: 1, pId: 0, name: "username", open: true, head: true},
	{ id: 11, pId: 1, name: "item1"},
	{ id: 12, pId: 1, name: "item2"},
	{ id: 13, pId: 1, name: "folder1", open: true},
	{ id: 131, pId: 13, name: "item3"}
];

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
	
	$.fn.zTree.init($("#abTree"), settings, zNodes);
});
