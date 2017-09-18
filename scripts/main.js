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
	},
	
	"saving": {
		"ru": "сохранение...",
		"en": "saving..."
	},
	"saved": {
		"ru": "сохранено",
		"en": "saved"
	},
	"edited": {
		"ru": "изменено",
		"en": "edited"
	},
	"typeYourText": {
		"ru": "ваш текст...",
		"en": "type your text..."
	},
	
	"deleteTitle": {
		"ru": "Удаление",
		"en": "Delete"
	},
	"deleteQuestion1": {
		"ru": "Документ",
		"en": "You are going to delete document"
	},
	"deleteQuestion2": {
		"ru": " будет удалён, продолжить?",
		"en": ", continue?"
	},
	"deleteQuestion3": {
		"ru": " Также будут удалены все вложенные документы и папки.",
		"en": " All sub-documents are going to be deleted too."
	},
	"ok": {
		"ru": "Ок",
		"en": "Ok"
	},
	"cancel": {
		"ru": "Отмена",
		"en": "Cancel"
	},
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
		onDrop: onDrop,
		onNodeCreated: onNodeCreated,
		onRename: onRename
	}
};



// TODO: fix overwriting if object with this name already exists.
function createObjectS3(path, body, errCallback) {
	var params = {
		Body: body,
		Bucket: "ab-doc-storage",
		Key: path
	};
	return s3.putObject(params, function(err, data) {
		if (err && (errCallback instanceof Function)) {
			errCallback(err);
		}
	});
};

function createObjectS3Params(params, errCallback) {
	params.Bucket = "ab-doc-storage";
	
	return s3.putObject(params, function(err, data) {
		if (err && (errCallback instanceof Function)) {
			errCallback(err);
		}
	});
};

function getObjectS3(path, errCallback) {
	var params = {
		Bucket: "ab-doc-storage",
		Key: path
	};
	return s3.getObject(params, function(err, data) {
		if (err && (errCallback instanceof Function)) {
			errCallback(err);
		}		
	});
}

function getObjectS3Params(params, errCallback) {
	params.Bucket = "ab-doc-storage";
	
	console.log(params);
	
	return s3.getObject(params, function(err, data) {
		if (err && (errCallback instanceof Function)) {
			errCallback(err);
		}		
	});
}

function removeTreeS3(treeNode, errCallback) {
	var params = {
		Bucket: "ab-doc-storage",
		Key: buildPath(treeNode)
	};
	//console.log(treeNode.getPath());
	s3.deleteObject(params, function(err, data) {
		if (err && (errCallback instanceof Function)) {
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
				if (err && (errCallback instanceof Function)) {
					errCallback(err);
				}
				var deleteParams = {
					Bucket: "ab-doc-storage",
					Key: oldKey
				};
				s3.deleteObject(deleteParams, function(err, data) {
					if (err && (errCallback instanceof Function)) {
						errCallback(err);
					}
				});	
			});	
		});
	}, errCallback);
}

// Loads list of files with specified prefix and passes each one to callback
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
		if (err && (errCallback instanceof Function)) {
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
			files.forEach(callback);
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
		console.log("Error!", err);
	}
	$('.preloader-container').hide();
	$('#alertError').show();
	return;
}

var s3;
var USERID;
var AWS_CDN_ENDPOINT = "https://s3-eu-west-1.amazonaws.com/ab-doc-storage/";
var STORAGE_BUCKET = "ab-doc-storage";
var LANG;
var TREE_MODIFIED = false;
var TREE_FILENAME = "tree.json";
var $updated;

$(document).ready( function() {
	// Translation
	LANG = localStorage.getItem('ab-doc.translator.lang');
	if (!LANG) {
		LANG = "ru";
	}
	$('[data-translate]').each( function(i, el) {
		var dt = $(el).attr('data-translate'),
			at = $(el).attr('attr-translate');
		
		if (at) {
			$(el).attr(at, _translatorData[dt][LANG]);
		} else {
			$(el).html(_translatorData[dt][LANG]);
		}
	});
	// ========
	
	$('#selectLang').change( function(event) {
		localStorage.setItem('ab-doc.translator.lang', $('#selectLang option:selected').val());
		location.reload();
	});
	$('#selectLang').val(LANG);
	
	$('.app-container').hide();

	//$('#splitter').bsSplitter();
	//$('.draggable').draggable({cancel: ".draggable *"});
	
	var cognitoUser = userPool.getCurrentUser();
	if(!cognitoUser) {
		onError();
		// no user. redirect to login.html
		window.location.replace('/login.html');
		return;
	}
			
	$('#linkSignOut').click( function() {
		cognitoUser.signOut();
		window.location.replace('/login.html');
		return true;	
	});	
	$('#linkReturn').click( function() {
		cognitoUser.signOut();
		window.location.replace('/login.html');
		return true;	
	});
	
	$('#username').text(cognitoUser.username);
	
	// Columns resizing
	/*$('#ztree-div').resizable({
		handles: 'e'
	}).bind('resize', function (event, ui) {
		var $document = $('#document'),
			$ztree_div = $('#ztree-div'),
			$app_container = $('.app-container');
		
		var totalWidth = $app_container.width(),
			docWidth = totalWidth - $ztree_div.outerWidth(),
			zTreeWidth = $ztree_div.outerWidth();
			
		var threshold = 50;
		
		console.log(ui);

		/*if (docWidth < threshold) {
			$document.outerWidth(threshold);
			$ztree_div.outerWidth(totalWidth - threshold);
			
			return;
		}
		
		if (zTreeWidth < threshold) {
			$document.outerWidth(totalWidth - threshold);
			$ztree_div.outerWidth(threshold);
			
			return;
		}*/
/*

		console.log(totalWidth);

		$document.outerWidth(docWidth);
	});*/
	
	/*$('#document').resizable({
		handles: 'w'
	}).bind('resize', function (event, ui) {
		console.log('resize event ', event);
	});*/
	
	// Init splitter, ztree and document columns
	var $document = $('#document'),
		$ztree_div = $('#ztree-div'),
		$splitter = $('#splitter'),
		$app_container = $('.app-container'),
		$nav = $('.navbar');
	
	{
		$app_container.outerHeight($(window).height() - 1 - $nav.outerHeight());
		var totalWidth = $app_container.width(),
			zTreeWidth = totalWidth * 0.15,
			splitterWidth = $splitter.outerWidth(),
			docWidth = totalWidth - zTreeWidth - splitterWidth;
		
		$ztree_div.outerWidth(zTreeWidth);
		$splitter.css('left', zTreeWidth + 'px');
		$document.outerWidth(docWidth);
		$document.css('left', zTreeWidth + splitterWidth);
	}
	
	// Splitter moving
	{
		var splitterDragging = false,
			oldX;
		
		$splitter.mousedown(function(event) {
			splitterDragging = true;
			oldX = event.clientX;
		});
		
		$(document).mouseup(function(event) {
			splitterDragging = false;
		});
		
		$(document).mousemove(function(event) {
			if (splitterDragging) {
				var newX = event.clientX;
				
				var totalWidth = $app_container.width(),
					zTreeWidth = $ztree_div.outerWidth(),
					newZTreeWidth = zTreeWidth + newX - oldX;
					
				if (newZTreeWidth > 32 && newZTreeWidth < totalWidth - 32) {
					zTreeWidth = newZTreeWidth;
					
					var	splitterWidth = $splitter.outerWidth(),
						docWidth = totalWidth - zTreeWidth - splitterWidth;	
						
					$ztree_div.outerWidth(zTreeWidth);
					$splitter.css('left', zTreeWidth + 'px');
					$document.outerWidth(docWidth);
					$document.css('left', zTreeWidth + splitterWidth);
				}			
				
				oldX = newX;
			}
		});
	}
	
	// Keep columns proportions and height when resizing window
	$(window).resize(function() {

		
		var docWidth = $document.outerWidth(),
			splitterWidth = $splitter.outerWidth(),
			zTreeWidth = $ztree_div.outerWidth(),
			totalWidth = $app_container.width() - splitterWidth,
			oldTotalWidth = docWidth + zTreeWidth,
			k = totalWidth / oldTotalWidth;
		
		// proportions
		$ztree_div.outerWidth(zTreeWidth * k);
		$splitter.css('left', zTreeWidth * k + 'px');
		$document.outerWidth(docWidth * k);
		$document.css('left', (zTreeWidth * k + splitterWidth) + 'px');
		
		
		// app-container's height
		$app_container.outerHeight($(window).height() - 1 - $nav.outerHeight());
	});
	
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
				
				// Used in my.tmp.js
				USERID = AWS.config.credentials.identityId;
				/*s3.getBucketLocation({Bucket: "ab-doc-storage"}).promise()
					.then(
						function(data) {
							AWS_CDN_ENDPOINT = "https://s3-" + data.LocationConstraint + ".amazonaws.com/ab-doc-storage/";
						},
						function(err) {
							onError(err);
						}
					)*/
				
				// Trying to load the tree
				var treeKey = USERID + '/' + TREE_FILENAME;
				loadABTree(treeKey).then(
					function(abTree) {
						return Promise.resolve(abTree);
					},
					function(err) {
						if (err.name == 'NoSuchKey') {
							return Promise.resolve([]);
						} else {
							return Promise.reject(err);
						}
					}
				).then(
					function(abTree) {
						console.log(abTree);
						var zNodes = [{
							id: 'top',
							head: true,
							icon: "/css/ztree/img/diy/1_open.png",
							name: "",
							children: abTree,
							open: false
						}];
						
						$.fn.zTree.init($("#abTree"), settings, zNodes);
						$('.app-container').show();
						$('.preloader-container').hide();					
					},
					function(err) {
						onError(err);
					}
				);
				
				$updated = $('#updated');
				
				setInterval(function () {
					if (TREE_MODIFIED) {
						var zTree = $.fn.zTree.getZTreeObj("abTree");
						var nodes = zTree.getNodesByParam('id', 'top')[0].children;
						var abTree;
						if (nodes) {
							var f = function(n) {
								var abNode = {
									id : n.id,
									name : n.name,
									children : n.children ? n.children.map(f) : []
								};
								
								return abNode;
							};
							
							abTree = nodes.map(f);
						} else {
							abTree = [];
						}
						
						$updated.html(_translatorData['saving'][LANG]);
						saveABTree(abTree, treeKey).then(
							function (ok) {
								$updated.fadeOut('slow', function () {
									$(this).text(_translatorData['saved'][LANG]).fadeIn('fast');
								});
							},
							function (err) {
								onError(err);
							}
						);
						TREE_MODIFIED = false;
					}
					
					$('#editor[modified="1"]').each(function (index, element) {
						var $editor = $('#editor'),
							$files = $('#files');
						
						$updated.html(_translatorData['saving'][LANG]);
						$(element).attr('modified', 0);
						
						saveDocument('#editor').then(
							function (ok) {
								$updated.fadeOut('slow', function () {
									console.log($editor.attr('modified') === '0', $editor.attr('waiting') === '0', $files.attr('waiting') === '0')
									if ($editor.attr('modified') === '0' && $editor.attr('waiting') === '0' && $files.attr('waiting') === '0') {
										$(this).removeClass('pending');
									}
									
									$(this).text(_translatorData['saved'][LANG]).fadeIn('fast');
								});
							},
							function (err) {
								onError(err);
							}
						);
					});
				}, 3000);
				
				/*loadTree(AWS.config.credentials.identityId + "/trees", cognitoUser.username, $.fn.zTree.getZTreeObj("abTree"), function() {
					$('.app-container').show();
					$('.preloader-container').hide();
				});*/
			});
		});
	});
});

//------------------------------------------------
//----------- ABTree-related functions -----------
//------------------------------------------------

// Loads JSON with a specified key (String) from STORAGE_BUCKET
// Returns a Promise (ABTree JSON)
function loadABTree(key) {
	var params = {
		Bucket: STORAGE_BUCKET,
		Key: key
	};
	
	var promise = new Promise( function (resolve, reject) {
		s3.getObject(params).promise().then(
			function (data) {
				var d = new TextDecoder('utf-8');
				var abTree = JSON.parse(d.decode(data.Body));
				resolve(abTree);
			},
			function (err) {
				reject(err);
			}
		);
	});
	
	return promise;
}

// Saves abTree (JSON) with a specified key (String) from STORAGE_BUCKET
// Returns a Promise
function saveABTree(abTree, key) {
	var params = {
		Body: JSON.stringify(abTree),
		Bucket: STORAGE_BUCKET,
		Key: key
	};
	return s3.putObject(params).promise();
}

//---------------------------------------
//----------- zTree callbacks -----------
//---------------------------------------

function beforeDrag(id, nodes) {
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
	
	tree = $.fn.zTree.getZTreeObj(treeId);
	
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
	// expand the node
	tree = $.fn.zTree.getZTreeObj(treeId);
	tree.expandNode(treeNode, true, false, true, true);
	
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
	
	try {
		if (!treeNode.head) {
			$('#selectedDoc')[0].innerHTML = treeNode.name;
			initQuill('#document', treeNode.id);
		}
	} catch(err) {
		onError(err);
	}
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
	
	// Add new item
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
		zTree.addNodes(treeNode, {id: GetGUID(), name: name, files: []});
		
		$updated.addClass('pending');
		$updated.html(_translatorData['edited'][LANG]);
		TREE_MODIFIED = true;

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
	$updated.addClass('pending');
	$updated.html(_translatorData['edited'][LANG]);
	TREE_MODIFIED = true;
};

function onNodeCreated(event, treeId, treeNode) {

};

function beforeRemove(treeId, treeNode) {
	var tree = $.fn.zTree.getZTreeObj(treeId);
	$('#buttonDelete').click( function() {
		tree.removeNode(treeNode, false);
		$updated.addClass('pending');
		$updated.html(_translatorData['edited'][LANG]);
		TREE_MODIFIED = true;
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
	neighbours.forEach( function(n) {
		if (n.name === newName) {
			ok = false;
		}
	});
	
	//console.log(ok);
	
	return ok;
}

function onRename(event, treeId, treeNode, isCancel) {
	if (!isCancel) {
		$updated.addClass('pending');
		$updated.html(_translatorData['edited'][LANG]);
		TREE_MODIFIED = true;
	}
}
