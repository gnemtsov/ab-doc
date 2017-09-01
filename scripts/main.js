// Data for translation

var _translatorData = {
	"loginPage": {
		"ru": "Вход",
		"en": "Login page"
	},
	"email": {
		"ru": "Почта",
		"en": "Email"
	},
	"yourEmail": {
		"ru": "Ваш email",
		"en": "Your email"		
	},
	"password": {
		"ru": "Пароль",
		"en": "Password"
	},
	"yourPassword": {
		"ru": "Ваш пароль",
		"en": "Your password"		
	},
	"confirmationCode": {
		"ru": "Код подтверждения",
		"en": "Confirmation code"
	},
	"yourConfirmationCode": {
		"ru": "Ваш код подтверждения",
		"en": "Your confirmation code"
	},
	"alertUserDoesntExist": {
		"ru": "Пользователь с таким именем не зарегистрирован.",
		"en": "Username is not registered."
	},
	"alertWrongPassword": {
		"ru": "Неправильное имя пользователя или пароль.",
		"en": "Wrong username or password."
	},
	"alertWrongCode": {
		"ru": "Неверный код подтверждения.",
		"en": "Wrong confirmation code."
	},
	"enter": {
		"ru": "Войти",
		"en": "Sign in"
	},
	"signUp": {
		"ru": "Нет учётной записи?",
		"en": "Sign up"
	},
	
	"registration": {
		"ru": "Регистрация",
		"en": "Registration"
	},
	"alertWrongRepeat": {
		"ru": "Пароли не совпали.",
		"en": "Passwords didn't match."
	},	
	"alertBadPassword": {
		"ru": "Пароль должен быть не короче 8 символов, содержать цифры и латинские буквы в разных регистрах. Например: PassW0rD.",
		"en": "Minimum password length is 8 symbols. Password must contain digits and both uppercase and lowercase letters. Example: PassW0rD."
	},
	"alertUserExists": {
		"ru": "Пользователь с таким именем уже существует.",
		"en": "This username is already taken."
	},
	"repeatPassword": {
		"ru": "Повторите пароль",
		"en": "Repeat password"
	},
	"signUp2": {
		"ru": "Создать учётную запись",
		"en": "Sign up"
	},
	
	"exit": {
		"ru": "Выход",
		"en": "Exit"
	},
	"somethingWentWrong": {
		"ru": "Что-то пошло не так.",
		"en": "Somenthing went wrong."
	},
	"return": {
		"ru": "Вернуться",
		"en": "Return"
	},
	"document": {
		"ru": "Документ",
		"en": "Document"
	}
}

// ====================

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
		onDrop: onDrop
		//onNodeCreated: onNodeCreated
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
	
	tree = $.fn.zTree.getZTreeObj(treeId);
	
	// S3 starts here
	treeNodes.map( function(n) {
		var newPrefix;
		var oldPrefix = buildPath(n);
		if (moveType != "inner") {
			newPrefix = buildPrefixPath(targetNode) + "/" + n.name;
		} else {
			newPrefix = buildPath(targetNode) + "/" + n.name;
		}
		
		// If item with this name already exists in a target node, rename it.
		function filter(n) {
			return buildPath(n) === newPrefixTmp;
		}
		var newPrefixTmp = newPrefix;
		if(tree.getNodesByFilter(filter, true)) {
			var i = 1;
			var ok = false;
			while(!ok) {
				newPrefixTmp = newPrefix + "(" + i + ")";
				ok = !tree.getNodesByFilter(filter, true);
				i++;
			}
			var a = newPrefixTmp.split("/");
			n.name = a[a.length - 1];
			tree.updateNode(n);
		}
		moveTreeS3(tree, oldPrefix, newPrefixTmp, onError);
	});
	
	return true;
}

function beforeEditName(treeId, treeNode) {
	// Do not allow editing name of the head (username)
	if (treeNode.head === true) {
		return false;
	}
	
	var zTree = $.fn.zTree.getZTreeObj(treeId);
	// Select text in node, which name we are going to edit.
	var inputId = treeNode.tId + "_input";
	// Input is not created yet, so we set timeout.
	setTimeout( function() {
		$('#' + inputId).select();
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

/*function preNode(treeNode) {
	var pre = treeNode.getPreNode();
	if (pre) {
		if (pre.isParent) {
			return pre.children[pre.children.length - 1];
		}
		return pre;
	}
	var pn = treeNode.getParentNode();
	if(pn) {
		return pn.getPreNode();
	}
	return null;
}*/

function onClick(event, treeId, treeNode, clickFlag) {
	$('#selectedDoc')[0].innerHTML = treeNode.name;
	
	// expand the node
	tree = $.fn.zTree.getZTreeObj(treeId);
	tree.expandNode(treeNode, true, false, true, true);
	
	// shift - select
	if((event.originalEvent.shiftKey) && (tree.lastClicked)) {
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
	}
	// my!
	tree.lastClicked = treeNode;
}

function showRemoveBtn(id, node) {
	return !node.head;
}

function showRenameBtn(id, node) {
	return !node.head;
}

var lastId = -1;
function newId() {
	lastId++;
	return lastId;
}

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
		var id = newId();
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
		zTree.addNodes(treeNode, {id: id, name:name});
		createObjectS3(path, "", onError);
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
	
};

function onNodeCreated(event, treeId, treeNode) {

};

function beforeRemove(treeId, treeNode) {
	var tree = $.fn.zTree.getZTreeObj(treeId);
	$('#buttonDelete').click( function() {
		removeTreeS3(treeNode, onError);
		tree.removeNode(treeNode, false);
	});
	var message = "Документ <b>" + treeNode.name + "</b> будет удалён, продолжить?";
	if (treeNode.isParent) {
		message += " Также будут удалены все вложенные документы и папки."
	}
	$("#pDeleteMessage").html(message);
	$("#modalDelete").modal("show");
	return false;
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
	
	// Refuse if one of the neighbours have the same name.
	var ok = true;
	neighbours.map( function(n) {
		if (n.name === newName) {
			ok = false;
		}
	});
	
	//console.log(ok);
	
	if (ok) {
		// Moving files seems to be the only way to rename them. :-( 
		moveTreeS3($.fn.zTree.getZTreeObj(treeId), buildPath(treeNode), buildPrefixPath(treeNode) + "/" + newName, onError);
	}
	
	return ok;
}

// TODO: fix overwriting if object with this name already exists.
function createObjectS3(path, body, errCallback) {
	var params = {
		Body: body,
		Bucket: "ab-doc-storage",
		Key: path
	};
	s3.putObject(params, function(err, data) {
		if (err) {
			errCallback(err);
		}
	});
};

function removeTreeS3(treeNode, errCallback) {
	var params = {
		Bucket: "ab-doc-storage",
		Key: buildPath(treeNode)
	};
	//console.log(treeNode.getPath());
	s3.deleteObject(params, function(err, data) {
		if (err) {
			errCallback(err);
		}
	});
	
	if(treeNode.isParent) {
		treeNode.children.map(removeTreeS3);
	}
}

function moveTreeS3(tree, oldPrefix, newPrefix, errCallback) {
	// If trying to move to the same location.
	if (oldPrefix === newPrefix) {
		return;
	}

	withS3Files(oldPrefix, function(files) {
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
					errCallback(err);
				}
				var deleteParams = {
					Bucket: "ab-doc-storage",
					Key: oldKey
				};
				s3.deleteObject(deleteParams, function(err, data) {
					if (err) {
						errCallback(err);
					}
				});	
			});	
		});
	}, errCallback);
}

// Loads list of files with specified prefix and passes it to callback
function withS3Files(prefix, callback, errCallback) {
	var files = [];
	var params = {
		Bucket: "ab-doc-storage",
		Prefix: prefix,
		MaxKeys: 1000
	};
	
	// Ugly recursion!!!!!!!!
	// TODO: rewrite it all!!!!!!!!
	function f(err, data) {
		if (err) {
			errCallback(err);
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
			callback(files);
		}
	};
	f(undefined, undefined);	
}

// prefix should not end with "/"
function loadTree(prefix, username, tree, callback, errCallback) {
	withS3Files(prefix+"/", function(files) {
		var head = {id: newId(), name: username, s3path: prefix, open: true, head: true, icon: "/css/ztree/img/diy/1_open.png"};
		tree.addNodes(null, head, true);
		files.map( function(f) {
			var pathArray = f.Key.split("/");
			var node = {
				id: newId(),
				name: pathArray[pathArray.length - 1]
			};
			function filter(n) {
				return buildPath(n) === pathArray.slice(0, pathArray.length - 1).join("/");
			}
			var parent = tree.getNodesByFilter(filter, true);
			tree.addNodes(parent, node, true);
		});
		
		callback();
	}, errCallback);
}

// zTree /\

function onError(err) {
	if (err) {
		console.log(err);
	}
	$('.preloader-container').hide();
	$('#alertError').show();
	return;
}

var s3;

$(document).ready( function() {
	// Translation
	var lang = localStorage.getItem('ab-doc.translator.lang');
	if (!lang) {
		lang = "ru";
	}
	$('[data-translate]').each( function(i, el) {
		var dt = $(el).attr('data-translate'),
			at = $(el).attr('attr-translate');
		
		if (at) {
			$(el).attr(at, _translatorData[dt][lang]);
		} else {
			$(el).html(_translatorData[dt][lang]);
		}
	});
	// ========
	
	$('#selectLang').change( function(event) {
		localStorage.setItem('ab-doc.translator.lang', $('#selectLang option:selected').val());
		location.reload();
	});
	$('#selectLang').val(lang);
	
	$('.app-container').hide();

	$('#splitter').bsSplitter();
	//$('.draggable').draggable({cancel: ".draggable *"});
	
	var cognitoUser = userPool.getCurrentUser();
	if(!cognitoUser) {
		onError();
		return;
	}
			
	$('#linkSignOut').click( function() {
		cognitoUser.signOut();
		return true;	
	});	
	$('#linkReturn').click( function() {
		cognitoUser.signOut();
		return true;	
	});
	
	$('#username').text(cognitoUser.username);
	
	cognitoUser.getSession( function(err, session) {
		if(err) {
			onError(err);
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
				onError(err);
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
				loadTree(AWS.config.credentials.identityId, cognitoUser.username, $.fn.zTree.getZTreeObj("abTree"), function() {
					$('.app-container').show();
					$('.preloader-container').hide();
					
					try {
						initQuill('#editor');
					} catch(err) {
						onError(err);
					}
				});
			});
		});
	});
});
