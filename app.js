const express = require('express')
  , bodyParser = require("body-parser")
  , Message = require('./controllers/message');

const maxRange = 3000; //In meters

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'jade');

app.get('/', function (req, res) {
  // console.log('-------------------------------------------------------------------\nGET: Index Page');
  res.render('index');
});

app.post('/', function (req, res) {
  const respMessage = new Message({
    username: req.body.username,
    message: req.body.message,
    range: maxRange,
    geometry: {
      type: 'Point',
      coordinates: [req.body.lat, req.body.lon]
    },
    type: 'Feature'
  });

  Message.create(respMessage, function () {
    Message.find(function (err, doc) {
      const resp = JSON.stringify(doc);
      // console.log('-------------------------------------------------------------------\ncreate message: ' + resp);
      res.render('index', { response: resp });
    });
  });
});


app.get('/messages/:lat/:lgn', function (req, res) {
  console.log(req.params.lat);
  console.log(req.params.lgn);
  Message.aggregate([
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
      // console.log('-------------------------------------------------------------------\nError: ' + err);
      console.err(err);
      return;
    }
    const array = [];
    result.forEach((val) => {
      if (val.range >= val.dist.calculated) {
        array.push(val);
      }
    });
    // console.log('-------------------------------------------------------------------\n' + req.params.lat + ',' + req.params.lgn + '\nget messages: \n' + array.toString());
    res.send(array);
  });
});

app.listen(3000, () => {
  console.log('Server listening on port 3000 🚀');
});