var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var assetSchema = new Schema({
    name: {type: String, required: false},
    brand: {type: String, required: true},
    url: { type: String, required: true},
    tags: { type: Array, required: true },
    offered:  { type: Number, required: true },
    potential: { type: Number, required: true }
});

var Asset = mongoose.model('Asset', assetSchema);

module.exports = Asset;
