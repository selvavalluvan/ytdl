const csvFilePath = './sample.csv';
const csv = require('csvtojson');
var path = require('path');
var fs = require('fs');
var youtubedl = require('youtube-dl');
var randomstring = require('randomstring');
var FormData = require('form-data');

// const waitFor = (ms) => new Promise(r => setTimeout(r, ms));
//
// async function asyncForEach(array, callback) {
//     for (let index = 0; index < array.length; index++) {
//         await callback(array[index], index, array);
//     }
// }
//
// async function start(data) {
//     await asyncForEach(data, async (num) => {
//         await waitFor(1000);
//         console.log(num);
//     });
//     console.log('Done');
// }

var syncEach = function (items, next, callback) {
    if (!Array.isArray(items)) throw new TypeError('each() expects array as first argument');
    if (typeof next !== 'function') throw new TypeError('each() expects function as second argument');
    if (typeof callback !== 'function') callback = Function.prototype; // no-op

    if (items.length === 0) return callback(undefined, items);

    var transformed = new Array(items.length);
    var count = 0;
    var returned = false;

    var iterate = function (index) {
        var item = items[index];
        next(item, function (error, transformedItem) {
            if (returned) return;
            if (error) {
                returned = true;
                return callback(error);
            }
            transformed[index] = transformedItem;
            count += 1;
            if (count === items.length) return callback(undefined, transformed);
            if (index < items.length) {
                iterate(index + 1);
            }
        });

    };
    iterate(0);
};

var start = function (jsonArrayData) {
    var errorData = [];
    syncEach(jsonArrayData, function (data, next) {
        data.tags = data.tags.split(',').map(item => item.trim());
        upload(data, function (err, success) {
            if(err){
                errorData.push(data);
                console.error(data)
            }
            next();
        })
    }, function (err, updated) {
        console.log("Done with ", err, updated)
    })
};


csv()
    .fromFile(csvFilePath)
    .on('end_parsed', (jsonArrObj) => {
        start(jsonArrObj);
    })
    .on('done', (error) => {
        console.log("Starting...")
    });


var upload = function (data, callback) {
    console.log(data)
    let video = youtubedl(data.url,
        // Optional arguments passed to youtube-dl.
        ['--format=18']);
    let randomName = randomstring.generate(7);
    data.orientation = 'landscape';

    video.on('info', function (info) {
        data.name = info.title;
        data.thumbnail = info.thumbnail;
    });

    video.pipe(fs.createWriteStream(path.join(__dirname, 'files', randomName + '.mp4')));

    video.on('end', function () {
        var form = new FormData();

        download(data.thumbnail, randomName + '.jpg', function () {
            form.append('creative', fs.createReadStream(path.join(__dirname, 'files', randomName + '.mp4')));
            form.append('logo', fs.createReadStream(path.join(__dirname, 'files', randomName + '.jpg')));
            form.append('thumbnail', fs.createReadStream(path.join(__dirname, 'files', randomName + '.jpg')));
            form.append('name', data.name);
            form.append('brand', data.brand);
            form.append('tags', JSON.stringify(data.tags));
            form.append('orientation', data.orientation);
            form.append('floorValue', data.floorValue);
            form.append('ceilValue', data.ceilValue);
            var http = require('http');

            let headers = Object.assign({}, form.getHeaders(), {'Cookie': 'bzr-enterprise=eyJzaWQiOiI1ZWY0MjU3Ny1mOGQyLTRjMDAtYWEyYS02M2E3OTliMDIxZTAiLCJ1aWQiOiJlMTk5NzNkMS1iNWRmLTQ4OTYtYTY2Ny0zYTMxNzI1NWRlMzYifQ==;bzr-enterprise.sig=QT9PeGB87b1kpYCvZ_FQSGLm16U;'});
            var request = http.request({
                method: 'POST',
                hostname: 'localhost',
                port: 5000,
                path: '/client/1/campaign/1/creative',
                headers: headers
            });

            form.pipe(request);

            request.on('response', function (resp) {
                fs.unlinkSync(path.join(__dirname, 'files', randomName + '.mp4'));
                fs.unlinkSync(path.join(__dirname, 'files', randomName + '.jpg'));
                if (resp.statusCode === 200) {
                    // fs.unlinkSync(path.join(__dirname, 'files', randomName + '.mp4'));
                    // fs.unlinkSync(path.join(__dirname, 'files', randomName + '.jpg'));
                    callback(null, {message: 'Asset successfully added!'});
                } else {
                    console.log(resp.statusCode);
                    callback('The ad server is down. Contact admin', null);
                }
            });

        });

    });
};

var download = function (uri, filename, callback) {
    var request = require('request');
    request.head(uri, function (err, res, body) {
        console.log('content-type:', res.headers['content-type']);
        console.log('content-length:', res.headers['content-length']);

        request(uri).pipe(fs.createWriteStream(path.join(__dirname, 'files', filename))).on('close', callback);
    });
};
