const express = require('express')
  , mongoose = require('mongoose')
  , bodyParser = require("body-parser")
  , async = require('async')
  , { connect: mongoConnect } = require('./storage/mongo');

const maxRange = 3000; //In meters

// mongoose.connect('mongodb://localhost:27017/tpgeodb', { useNewUrlParser: true });


var messageSchema = {
  username: String,
  range: Number,
  message: String,
  geometry: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  type: String
};

var message_schema = mongoose.Schema(messageSchema);

var message = mongoose.model('messages', message_schema);
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'jade');

app.get('/', function (req, res) {
  console.log('-------------------------------------------------------------------\nGET: Index Page');
  res.render('index');
});

app.post('/', function (req, res) {
  var respMessage = new message({
    username: req.body.username,
    message: req.body.message,
    range: maxRange,
    geometry: {
      type: 'Point',
      coordinates: [req.body.lat, req.body.lon]
    },
    type: 'Feature'
  });

  message.create(respMessage, function () {
    message.find(function (err, doc) {
      var resp = JSON.stringify(doc);
      console.log('-------------------------------------------------------------------\ncreate message: ' + resp);
      res.render('index', { response: resp });
    });
  });
});


app.get('/messages/:lat/:lgn', function (req, res) {
  message.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [parseFloat(req.params.lat), parseFloat(req.params.lgn)] },
        distanceField: 'dist.calculated',
        maxDistance: maxRange,
        spherical: true
      }
    }
  ], function (err, result) {
    if (err) {
      console.log('-------------------------------------------------------------------\nError: ' + err);
      return;
    }
    var array = new Array();
    result.forEach(function (val) {
      if (val.range >= val.dist.calculated) {
        array.push(val);
      }
    });
    console.log('-------------------------------------------------------------------\n' + req.params.lat + ',' + req.params.lgn + '\nget messages: \n' + array.toString());
    res.send(array);
  });
});

const mongoConnectWrapper = (cb) => {
  // TODO: Put in config file
  const mongoURI = 'mongodb://localhost:27017/tpgeodb';
  mongoConnect(mongoURI, cb);
}

async.series([
  mongoConnectWrapper
], (err) => {
  if (err) {
    console.error('BANG! 💥💥💥💥 Failed startup process.');
    console.error(err);
    process.exit(1);
  }

  app.listen(3000, () => {
    console.log('Server listening on port 3000 🚀');
  });

});

