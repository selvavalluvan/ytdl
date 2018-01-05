var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var youtubedl = require('youtube-dl');
var randomstring = require("randomstring");
var FormData = require('form-data');
var Joi = require('joi');

var creativeParams = Joi.object().keys({
    url: Joi.string().required(),
    brand: Joi.string().required(),
    tags: Joi.array().required(),
    orientation: Joi.string().valid('portrait', 'landscape').default('landscape'),
    floorValue: Joi.number().required(),
    ceilValue: Joi.number().required()
});

var app = express();

// Define the port to run on
app.set('port', 9000);

//This is how you serve a static folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.post('/upload', function (req, res) {
    Joi.validate(req.body, creativeParams, function (error, params) {
        if(error) {
            console.error(error);
            return res.status(422).json("Missing parameters");
        }
        try {
            let video = youtubedl(req.body.url,
                // Optional arguments passed to youtube-dl.
                ['--format=18']);
            let randomName = randomstring.generate(7);
            let data = params;
            data.orientation = 'landscape';

            video.on('info', function (info) {
                data.name = info.title;
                data.thumbnail = info.thumbnail;
            });

            video.pipe(fs.createWriteStream(path.join(__dirname, 'files', randomName + ".mp4")));

            video.on('end', function () {
                var form = new FormData();

                download(data.thumbnail, randomName + '.jpg', function () {
                    form.append('creative', fs.createReadStream(path.join(__dirname, 'files', randomName + ".mp4")));
                    form.append('logo', fs.createReadStream(path.join(__dirname, 'files', randomName + ".jpg")));
                    form.append('thumbnail', fs.createReadStream(path.join(__dirname, 'files', randomName + ".jpg")));
                    form.append('name', data.name);
                    form.append('brand', data.brand);
                    form.append('tags', JSON.stringify(data.tags));
                    form.append('orientation', data.orientation);
                    form.append('floorValue', data.floorValue);
                    form.append('ceilValue', data.ceilValue);
                    var http = require('http');

                    let headers = Object.assign({}, form.getHeaders(), {'Cookie': 'bzr-enterprise=eyJzaWQiOiI0NmQ1MmUxZi00ZDI2LTQxYTktYTEyZC1jMjU0ZmFkY2UyYWUiLCJ1aWQiOiJlMTk5NzNkMS1iNWRmLTQ4OTYtYTY2Ny0zYTMxNzI1NWRlMzYifQ==;bzr-enterprise.sig=OtchgjqJr4QIh9HWeHlobh03Ii0;'});
                    var request = http.request({
                        method: 'POST',
                        hostname: 'localhost',
                        port:3000,
                        path: '/client/14/campaign/21/creative',
                        headers: headers
                    });

                    form.pipe(request);

                    request.on('response', function(resp) {
                        fs.unlinkSync(path.join(__dirname, 'files', randomName + ".mp4"));
                        fs.unlinkSync(path.join(__dirname, 'files', randomName + ".jpg"));
                        res.json({message: 'Asset successfully added!'});
                    });

                });

            });
        } catch (error){
            console.error(error);
            return res.status(422).json("Something went wrong! Try again");
        }

    });

});

var download = function(uri, filename, callback){
    var request = require('request');
    request.head(uri, function(err, res, body){
        console.log('content-type:', res.headers['content-type']);
        console.log('content-length:', res.headers['content-length']);

        request(uri).pipe(fs.createWriteStream(path.join(__dirname, 'files', filename))).on('close', callback);
    });
};



// Listen for requests
var server = app.listen(app.get('port'), function () {
    var port = server.address().port;
    console.log('Server running on port ' + port);
});
