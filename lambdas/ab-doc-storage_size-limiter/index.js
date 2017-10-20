var AWS = require('aws-sdk');

var s3 = new AWS.S3();

var BUCKET = 'ab-doc-storage';
var MAX_USED_SPACE = 510 * 1024 * 1024; // Additional 10 Mb here.
// 500 Mb limit on a client side (soft limit),
// 510 Mb limit on a server side (hard limit)

// Gets a PUT event and 
exports.handler = (event, context, callback) => {
	var key = event.Records[0].s3.object.key;
	
	console.log('We have ', key, ' in ', BUCKET);
	
	var ks = key.split('/');
	if (ks.length > 1) {
		var userId = ks[0];
		
		console.log('Checking size of ', userId);
	    exports.getDirectorySize(userId, BUCKET)
	        .then( (size) => {
				console.log('Size is ', size);
        		if (size > MAX_USED_SPACE) {
					console.log('Deleting ', key);
        			return s3.deleteObject({
        				Bucket: BUCKET,
        				Key: key
        			}).promise();
        		}
	        })
        	.then( (ok) => {console.log('Ok');})
        	.catch( (err) => {console.log('Error!', err);});
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
