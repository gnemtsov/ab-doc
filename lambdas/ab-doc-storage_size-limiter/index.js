var AWS = require('aws-sdk');

var s3 = new AWS.S3();

var BUCKET = 'ab-doc-storage';
var MAX_USED_SPACE = 510 * 1024 * 1024; // Additional 10 Mb here.
// 500 Mb limit on a client side (soft limit),
// 510 Mb limit on a server side (hard limit)

// Gets a PUT event and 
exports.handler = (event, context, callback) => {
	var key = decodeURIComponent(event.Records[0].s3.object.key);
	//var msg = '';
	
	//msg += 'We have ' + key + ' in ' + BUCKET + '\n';
	
	var ks = key.split('/');
	if (ks.length > 1) {
		var userId = ks[0];
		
		//msg += 'Checking size of ' + userId + '\n';
	    exports.getDirectorySize(userId, BUCKET)
	        .then( (size) => {
				//msg += 'Size is ' + size + '\n';
        		if (size > MAX_USED_SPACE) {
					//msg += 'Deleting ' + key + '\n';
        			return s3.deleteObject({
        				Bucket: BUCKET,
        				Key: key
        			}).promise();
        		}
        		return Promise.resolve();
	        })
        	//.then( (ok) => {msg += 'Ok\n';})
        	//.catch( (err) => {msg += 'Error!\n';})
        	/*.then( () => {
                return s3.putObject({
            	    Bucket: BUCKET,
            	    Key: 'log-' + Date.now() + '.txt',
            	    Body: msg
            	}).promise();
        	});*/
	}

	callback(null);
};

exports.getDirectorySize = (key, bucket) => {
	return exports.listS3Files(key + '/', bucket)
		.then( (files) => {
			return files.reduce( (acc, f) => {
				return acc + f.Size;
			}, 0);
		});
}

exports.listS3Files = (prefix, bucket) => {
	var files = [];
	var params = {
		Bucket: bucket,
		Prefix: prefix,
		MaxKeys: 1000
	};
	
	var promise = new Promise( function(resolve, reject) {
		// It's ok
		function f(err, data) {
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