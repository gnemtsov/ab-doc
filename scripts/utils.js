"use strict";

//TODO utils should be abUtils object and all these functions should be methods of this object

// Data for translation
var _translatorData = {
    "about": {
        "ru": "О программе",
        "en": "About"
    },
    "account": {
        "ru": "Учетная запись",
        "en": "Account"
    },
    "account confirmation": {
        "ru": "Подтверждение аккаунта",
        "en": "Confirm account"
    },
    "alertNoEmail": {
        "ru": "Укажите ваш email.",
        "en": "Enter your email."
    },
    "alertNoPassword": {
        "ru": "Укажите пароль.",
        "en": "Enter password."
    },
    "alertNoUsername": {
        "ru": "Укажите ваше имя пользователя.",
        "en": "Enter your username."
    },
    "alertUnknownError": {
        "ru": "Произошла ошибка. Попробуйте ещё раз.",
        "en": "Unknown error. Try again."
    },
    "alertUnknownLoginError": {
        "ru": "Произошла ошибка. Попробуйте войти ещё раз.",
        "en": "Unknown error. Try again."
    },
    "alertUserDoesntExist": {
        "ru": "Пользователь с таким именем не зарегистрирован.",
        "en": "Username is not registered."
    },
    "alertWrongPassword": {
        "ru": "Неправильное имя пользователя или пароль.",
        "en": "Wrong username or password."
    },
    "alertWrongRepeat": {
        "ru": "Пароли не совпали.",
        "en": "Passwords didn't match."
    },
    "areYouSure": {
        "ru": "Вы уверены?",
        "en": "Are you sure?"
    },
    "back": {
        "ru": "Главная",
        "en": "Home"
    },
    "cancel": {
        "ru": "Отмена",
        "en": "Cancel"
    },
    "changesPending": {
        "ru": "Есть несохраненные изменения!",
        "en": "There are unsaved changes!"
    },
    "CodeMismatchException": {
        "ru": "Неверный код подтверждения.",
        "en": "Wrong confirmation code."
    },
    "confirm": {
        "ru": "Подтвердить",
        "en": "Confirm"
    },
    "confirmationCode": {
        "ru": "Код подтверждения",
        "en": "Confirmation code"
    },
    "couldNotLoadTree": {
		"ru": "Не удалось загрузить ваше дерево. Попробуйте перезагрузить страницу. Если ошибка повторится, напишите на support@erp-lab.com",
		"en": "Couldn't load your tree. Try reloading the page. If you get this error again, contact us at support@erp-lab.com"
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
    "deleteTitle": {
        "ru": "Удаление",
        "en": "Delete"
    },
    "document": {
        "ru": "Документ",
        "en": "Document"
    },
    "email": {
        "ru": "Почта",
        "en": "Email"
    },
    "emptyDropzoneMessage": {
        "ru": "Приложите вложения сюда, рисунки можно помещать сразу в текст",
        "en": "Drop your files here, you can place pictures right in the text"
    },
    "enter": {
        "ru": "Войти",
        "en": "Log in"
    },
    "exit": {
        "ru": "Выйти",
        "en": "Exit"
    },
    "ExpiredCodeException": {
        "ru": "Код подтверждения устарел. Вам был выслан новый.",
        "en": "Your confirmation code is expired. New confirmation code was sent to you."
    },
    "forgotPassword": {
        "ru": "Забыли пароль?",
        "en": "Forgot password?"
    },
    "InvalidParameterException": {
        "ru": "Один или несколько параметров введены неверно.",
        "en": "Some parameters are invalid."
    },
    "InvalidPasswordException": {
        "ru": "Пароль должен быть не короче 6 символов, содержать цифры и латинские буквы в разных регистрах. Например: PassW0rD.",
        "en": "Minimum password length is 6 symbols. Password must contain digits and both uppercase and lowercase letters. Example: PassW0rD."
    },
    "loginPage": {
        "ru": "Вход",
        "en": "Log in"
    },
    "multiple guids found": {
        "ru": "Обнаружено более 1 документа с данным GUID",
        "en": "More than 1 document with specified GUID found"
    },
    "no": {
        "ru": "нет",
        "en": "no"
    },
    "no guids found": {
        "ru": "Документ с этим GUID не найден",
        "en": "Document with this GUID not found"
    },
    "noSpace": {
        "ru": "Недостаточно места для загрузки файла",
        "en": "No space left to upload this file"
    },
    "ok": {
        "ru": "Ок",
        "en": "Ok"
    },
    "password": {
        "ru": "Пароль",
        "en": "Password"
    },
    "registration": {
        "ru": "Регистрация",
        "en": "Create account"
    },
    "repeatPassword": {
        "ru": "Повторите пароль",
        "en": "Repeat password"
    },
    "resetPassword": {
        "ru": "Сменить пароль",
        "en": "Set new password"
    },
    "return": {
        "ru": "Вернуться",
        "en": "Return"
    },
    "rootName": {
        "ru": "Добро пожаловать в AB-DOC!",
        "en": "Welcome to AB-DOC!"
    },
    "sendCode": {
        "ru": "Выслать код",
        "en": "Send confirmation code"
    },
    "signUp": {
        "ru": "Создать учетную запись",
        "en": "Create account"
    },
    "signUp2": {
        "ru": "Создать учётную запись",
        "en": "Create account"
    },
    "somethingWentWrong": {
        "ru": "Что-то пошло не так..",
        "en": "Somenthing went wrong.."
    },
    "typeYourText": {
        "ru": "Напишите что-нибудь удивительное...",
        "en": "Compose something awesome..."
    },
    "username": {
        "ru": "Имя пользователя",
        "en": "Username"
    },    
    "UsernameExistsException": {
        "ru": "Пользователь с таким именем уже существует.",
        "en": "This username is already taken."
    },    
    "welcomeMessage": {
        "ru": "Чтобы работать с документами нужно <a class=\"link-sign-in\" href=\"#\">войти</a> или <a class=\"link-sign-up\" href=\"#\">создать учетную запись</a>.",
        "en": "Please <a class=\"link-sign-in\" href=\"#\">log in</a> or <a class=\"link-sign-up\" href=\"#\">create account</a> to start working."
    },
    "yes": {
        "ru": "да",
        "en": "yes"
    },
    "yourConfirmationCode": {
        "ru": "Ваш код подтверждения",
        "en": "Your confirmation code"
    },
    "yourEmail": {
        "ru": "Ваш email",
        "en": "Your email"
    },
    "yourPassword": {
        "ru": "Ваш пароль",
        "en": "Your password"
    },
    "yourUsername": {
        "ru": "Ваше имя пользователя",
        "en": "Your username"
    },    
};
// ====================

function deleteRecursiveS3(key) {
	console.log('deleteRecursiveS3', key);
	return listS3Files(key)
		.then( function(files) {
			var params = {
				Bucket: STORAGE_BUCKET,
				Delete: {
					Objects: []
				}
			};
			
			if (files.length > 0) {
				files.forEach( function(f) {
					params.Delete.Objects.push({Key: f.Key});
				});
				
				console.log(params);
				
				return Promise.resolve(params);
			}
			
			return Promise.reject('nothing to delete');
		})
		.then(
			function(params) {
				return s3.deleteObjects(params).promise();
			},
			function(err) {
				return Promise.resolve('nothing to delete'); // It's ok
			}
		);
}

// Loads list of files with spicified prefix and returns Promise(files, error)
function listS3Files(prefix) {
	var files = [];
	var params = {
		Bucket: STORAGE_BUCKET,
		Prefix: prefix,
		MaxKeys: 1000
	};
	
	var promise = new Promise( function(resolve, reject) {
		// It's ok
		function f(err, data) {
			console.log('listS3Files f(' + err + ', ' + data + ')');
			if (err) {
				reject(err);
				return;
			}
			// Data must be undefined when calling this function directly
			// It starts objects loading from S3
			// Then this function is only used as a callback in s3.listObjects
			if (!data) {
				s3.listObjectsV2(params, f);
				return;
			}
			
			files = files.concat(data.Contents);
			if (data.isTruncated) {
				params.Marker = data.NextMarker;
				s3.listObjectsV2(params, f);
			} else {
				resolve(files);
			}
		};
		f(undefined, undefined);
	});
	
	return promise;
}


function GetContentDisposition(str){
	return "attachment; filename*=UTF-8''" +
		encodeURIComponent(str).
		// Замечание: хотя RFC3986 резервирует "!", RFC5987 это не делает, так что нам не нужно избегать этого
		replace(/['()]/g, escape). // i.e., %27 %28 %29
		replace(/\*/g, '%2A').
		// Следующее не требуется для кодирования процентов для RFC5987, так что мы можем разрешить немного больше читаемости через провод: |`^
		replace(/%(?:7C|60|5E)/g, unescape);
}

function GetGUID() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}

function GetSize(bytes) {
	if (bytes < 1024) { return bytes + ' b'; }
	else if (bytes < 1048576) { return (bytes / 1024).toFixed(1) + ' Kb'; }
	else if (bytes < 1073741824) { return (bytes / 1048576).toFixed(1) + ' Mb'; }
	else if (bytes < 1099511627776) { return (bytes / 1073741824).toFixed(1) + ' Gb'; }
	else { return (bytes / 1099511627776).toFixed(1) + ' Tb'; }
}

function encodeRFC5987ValueChars(str) {
	return encodeURIComponent(str).
		// Замечание: хотя RFC3986 резервирует "!", RFC5987 это не делает, так что нам не нужно избегать этого
		replace(/['()]/g, escape). // i.e., %27 %28 %29
		replace(/\*/g, '%2A').
		// Следующее не требуется для кодирования процентов для RFC5987, так что мы можем разрешить немного больше читаемости через провод: |`^
		replace(/%(?:7C|60|5E)/g, unescape);
}

// mimeTypeByExtension is used only to detect audio, image and video.
// It doesn't know about other types.
// It returns type if it knows specified ext
// And returns undefined otherwise
function mimeTypeByExtension(ext) {
    // Extenstion to MIME type
    var em = {
        "adp": "audio/adpcm",
        "au": "audio/basic",
        "mid": "audio/midi",
        "mp4a": "audio/mp4",
        "mpga": "audio/mpeg",
        "mp3": "audio/mpeg",
        "oga": "audio/ogg",
        "uva": "audio/vnd.dece.audio",
        "eol": "audio/vnd.digital-winds",
        "dra": "audio/vnd.dra",
        "dts": "audio/vnd.dts",
        "dtshd": "audio/vnd.dts.hd",
        "lvp": "audio/vnd.lucent.voice",
        "pya": "audio/vnd.ms-playready.media.pya",
        "ecelp4800": "audio/vnd.nuera.ecelp4800",
        "ecelp7470": "audio/vnd.nuera.ecelp7470",
        "ecelp9600": "audio/vnd.nuera.ecelp9600",
        "rip": "audio/vnd.rip",
        "weba": "audio/webm",
        "aac": "audio/x-aac",
        "aif": "audio/x-aiff",
        "m3u": "audio/x-mpegurl",
        "wax": "audio/x-ms-wax",
        "wma": "audio/x-ms-wma",
        "ram": "audio/x-pn-realaudio",
        "rmp": "audio/x-pn-realaudio-plugin",
        "wav": "audio/x-wav",
        "bmp": "image/bmp",
        "cgm": "image/cgm",
        "g3": "image/g3fax",
        "gif": "image/gif",
        "ief": "image/ief",
        "jpe": "image/x-citrix-jpeg",
        "jpeg": "image/x-citrix-jpeg",
        "jpg": "image/x-citrix-jpeg",
        "ktx": "image/ktx",
        "pjpeg": "image/pjpeg",
        "png": "image/x-png",
        "btif": "image/prs.btif",
        "svg": "image/svg+xml",
        "tiff": "image/tiff",
        "psd": "image/vnd.adobe.photoshop",
        "uvi": "image/vnd.dece.graphic",
        "djvu": "image/vnd.djvu",
        "sub": "image/vnd.dvb.subtitle",
        "dwg": "image/vnd.dwg",
        "dxf": "image/vnd.dxf",
        "fbs": "image/vnd.fastbidsheet",
        "fpx": "image/vnd.fpx",
        "fst": "image/vnd.fst",
        "mmr": "image/vnd.fujixerox.edmics-mmr",
        "rlc": "image/vnd.fujixerox.edmics-rlc",
        "mdi": "image/vnd.ms-modi",
        "npx": "image/vnd.net-fpx",
        "wbmp": "image/vnd.wap.wbmp",
        "xif": "image/vnd.xiff",
        "webp": "image/webp",
        "ras": "image/x-cmu-raster",
        "cmx": "image/x-cmx",
        "fh": "image/x-freehand",
        "ico": "image/x-icon",
        "pcx": "image/x-pcx",
        "pic": "image/x-pict",
        "pnm": "image/x-portable-anymap",
        "pbm": "image/x-portable-bitmap",
        "pgm": "image/x-portable-graymap",
        "ppm": "image/x-portable-pixmap",
        "rgb": "image/x-rgb",
        "xbm": "image/x-xbitmap",
        "xpm": "image/x-xpixmap",
        "xwd": "image/x-xwindowdump",
        "3gp": "video/3gpp",
        "3g2": "video/3gpp2",
        "h261": "video/h261",
        "h263": "video/h263",
        "h264": "video/h264",
        "jpgv": "video/jpeg",
        "jpm": "video/jpm",
        "mj2": "video/mj2",
        "mp4": "video/mp4",
        "mpeg": "video/mpeg",
        "ogv": "video/ogg",
        "ogg": "video/ogg",
        "qt": "video/quicktime",
        "uvh": "video/vnd.dece.hd",
        "uvm": "video/vnd.dece.mobile",
        "uvp": "video/vnd.dece.pd",
        "uvs": "video/vnd.dece.sd",
        "uvv": "video/vnd.dece.video",
        "fvt": "video/vnd.fvt",
        "mxu": "video/vnd.mpegurl",
        "pyv": "video/vnd.ms-playready.media.pyv",
        "uvu": "video/vnd.uvvu.mp4",
        "viv": "video/vnd.vivo",
        "webm": "video/webm",
        "f4v": "video/x-f4v",
        "fli": "video/x-fli",
        "flv": "video/x-flv",
        "m4v": "video/x-m4v",
        "asf": "video/x-ms-asf",
        "wm": "video/x-ms-wm",
        "wmv": "video/x-ms-wmv",
        "wmx": "video/x-ms-wmx",
        "wvx": "video/x-ms-wvx",
        "avi": "video/x-msvideo",
        "movie": "video/x-sgi-movie"
    };
    
    // it can return undefined
    return em[ext];
}


function mimeTypeToIconURL(type) {
    if (typeof type === 'string') {
        if (type.match('image.*')) {
            return '/img/icons/photo.svg';
        }
        if (type.match('audio.*')) {
            return '/img/icons/music.svg';
        }
        if (type.match('video.*')) {
            return '/img/icons/video.svg';
        }
    }
    return '/img/icons/file-attachment.svg';
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

//errors handlers
//TODO revise needed
function ABError(name) {
	var err = new Error(name);
	err.name = name;
	return err;
}

function onError(err) {
	if (err) {
		console.log("Error!", err);
	}
	
	_errorPopover(_translatorData['somethingWentWrong'][LANG]);
	$('nav').popover('show');
	setTimeout(function() {
		$('nav').popover('hide');
	}, 5000);
}

function onFatalError(err, msg) {
    if (err) {
        console.log("Fatal error!", err);
    }

    $('#root').hide(); //TODO ??
    _errorPopover(_translatorData[msg][LANG]);
    $('nav').popover('show');
}    

function onWarning(msg) {
	_errorPopover(msg);
	$('nav').popover('show');
	setTimeout(function() {
		$('nav').popover('hide');
	}, 2500);
}

function _errorPopover(c) {
	$('nav').popover({
		content: c,
		container: 'nav',
		animation: true,
		placement: 'bottom',
		trigger: 'manual',
		template: '\
			<div class="popover bg-danger" role="tooltip">\
				<div class="popover-body text-light"></div>\
			</div>'
	});
}