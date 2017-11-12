// Data for translation
var _translatorData = {
	"loginPage": {
		"ru": "Вход",
		"en": "Log in"
	},
	"welcomeMessage": {
		"ru": 'Чтобы работать с документами нужно <a class="link-sign-in" href="#">войти</a> или <a class="link-sign-up" href="#">создать учетную запись</a>.',
		"en": 'Please <a class="link-sign-in" href="#">log in</a> or <a class="link-sign-up" href="#">create account</a> to start working.'
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
		"en": "Log in"
	},
	"signUp": {
		"ru": "Нет учётной записи?",
		"en": "Create account"
	},
	
	"registration": {
		"ru": "Регистрация",
		"en": "Create account"
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
	"alertExpiredCode": {
		"ru": "Код подтверждения устарел. Вам был выслан новый.",
		"en": "Your confirmation code is expired. New confirmation code was sent to you."
	},
	"repeatPassword": {
		"ru": "Повторите пароль",
		"en": "Repeat password"
	},
	"signUp2": {
		"ru": "Создать учётную запись",
		"en": "Create account"
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
		"ru": "Напишите что-нибудь удивительное...",
		"en": "Compose something awesome..."
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
	"emptyDropzoneMessage" :{
		"ru": "Приложите вложения сюда, рисунки можно помещать сразу в текст",
		"en": "Drop your files here, you can place pictures right in the text"
	},
	"noSpace": {
		"ru": "Недостаточно места для загрузки файла",
		"en": "No space left to upload this file"
	},
	"areYouSure": {
		"ru": "Вы уверены?",
		"en": "Are you sure?"
	},
	"yes": {
		"ru": "да",
		"en": "yes"
	},
	"no": {
		"ru": "нет",
		"en": "no"
	}
}
// ====================


// s3 file uploader
// set updateFlag to true to update size indicator
// Returns Promise(key) with abort() method.
function s3Uploader(params, onprogress, updateFlag) {
    //console.log(params);
    
    if (params.ContentDisposition) {
        params.ContentDisposition = "attachment; filename*=UTF-8''" + encodeRFC5987ValueChars(params.ContentDisposition);
    }
    
    var request = createObjectS3Params(params);
    request.on('httpUploadProgress', function (progress, response) {
        var progressPercents = progress.loaded * 100.0 / progress.total;
        
        if (onprogress instanceof Function) {
            //onprogress.call(this, Math.round(progressPercents));
            onprogress.call(this, progressPercents);
        }	
    });

    var reqPromise = request.promise();
    var promise = reqPromise
        .then( function (data) {
            return Promise.resolve(params.Key);
        });

    
    // TODO Body can be File or ArrayBuffer. Maybe this line should be rewritten....
    // size undefined in console
    var size = (params.Body.size) ? (params.Body.size) : (params.Body.byteLength);
    // update pending used space
    // console.log('Body: ', params.Body, 'size: ', size);
    if (updateFlag) {
        updateUsedSpacePending(size);
    }
    promise
        .then(function(ok) {
            if (updateFlag) {
                updateUsedSpacePending(-size);
                updateUsedSpaceDelta(size);
            }
        });
    promise
        .catch(function(err) {
            if (updateFlag) {
                updateUsedSpacePending(-size);
            }
        });
    promise.abort = function () {
        request.abort();
        console.log('Upload aborted');
        if (updateFlag) {
            updateUsedSpacePending(-size);
        }
    };
    
    return promise;
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
