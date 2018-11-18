const express = require('express')
  , bodyParser = require("body-parser")
  , geolib = require('geolib')
  , Message = require('./controllers/message')
  , loremIpsum = require('lorem-ipsum')
  , async = require('async')
  , psql = require('./storage/postgres');

const maxRange = 3000; //In meters

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'jade');

const getRandomUserName = () => loremIpsum({ count: 1, units: 'words' });
const getRandomTweet = () => loremIpsum();

app.get('/', function (req, res) {
  res.render('index');
});

//________________________________

const transformPsqlToJsonObject = (result) => {
  const locSplit = result.geometry.split(/(\(| |\))/);
  const location = {
    lat: locSplit[2],
    lng: locSplit[4]
  };

  return {
    geometry: {
      type: 'Point',
      coordinates: [
        location.lat,
        location.lng
      ]
    },
    username: result.username,
    message: result.message,
    range: 3000, //TODO: DE-HARDCODE
    type: 'Feature' // Without this one we don't live.
  }
};

app.get('/postgres/index', (req, res) => res.render('indexpostgres'));

app.get('/postgres/messages/:lat/:lgn', (req, res) => {
  psql.query('SELECT st_AsText(geometry) as geometry, username, message FROM tweets;', (err, result) => {
    if (err) {
      console.error('Error quering postgress database: ', err);
    }
    res.send(result.rows.map(transformPsqlToJsonObject));
  });
});
//________________________________

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
      res.render('index', { response: resp });
    });
  });
});


app.get('/messages/:lat/:lgn', function (req, res) {
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
      console.err(err);
      return;
    }
    const array = [];
    result.forEach((val) => {
      if (val.range >= val.dist.calculated) {
        array.push(val);
      }
    });
    console.log(array);
    res.send(array);
  });
});

app.post('/messages/create_random', (req, res) => {

  const rndInt = (max) => Math.floor(Math.random() * Math.floor(max + 1));

  const amount = parseInt(req.body.amount);
  const lat = req.body.lat;
  const lon = req.body.lon;

  if (!amount || !lat || !lon) {
    return res.status(400).render('index');
  }
  const location = { lat, lon };

  const messageList = [];

  for (let i = 0; i < amount; i++) {
    const dist = rndInt(maxRange);
    const bearing = rndInt(360);
    const newLocaltion = geolib.computeDestinationPoint(location, dist, bearing);

    // Create message
    const message = new Message({
      username: getRandomUserName(),
      message: getRandomTweet(),
      range: maxRange,
      geometry: {
        type: 'Point',
        coordinates: [newLocaltion.latitude, newLocaltion.longitude]
      },
      type: 'Feature'
    });
    messageList.push(message);
  }

  async.each(messageList, (elem, cb) => Message.create(elem, cb), (err) => {
    if (err) {
      console.error(`Error creating random tweets. ${err}`);
      return res.status(500).redirect('/');
    }
    return res.status(200).redirect('/');
  })

});

app.listen(3000, () => {
  console.log('Server listening on port 3000 🚀');
});
