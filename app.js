var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
require('mongoose').Promise = global.Promise;

var Asset = require('./models/assets');

var app = express();

//Connect Mongoose to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/ytassets');

// Define the port to run on
app.set('port', 3000);

//This is how you serve a static folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.post('/upload', function (req, res) {
    var data = req.body;
    console.log(data);
    //now the password is not encrypted. You have to encrypt.
    var newAsset = new Asset({
        name: data.name,
        brand: data.brand,
        url: data.url,
        tags: data['tags[]'],
        offered:  data.offered,
        potential: data.potential
    });
    newAsset.save().then(function () {
        res.json({message: 'Asset successfully added!'});
    }).catch(function (error) {
        console.error(error);
        res.json({message: 'Oops! Something went wrong.'});
    });

});

// Listen for requests
var server = app.listen(app.get('port'), function () {
    var port = server.address().port;
    console.log('Server running on port ' + port);
});
