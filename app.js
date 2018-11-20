const express = require('express')
  , bodyParser = require("body-parser")
  , geolib = require('geolib')
  , Message = require('./controllers/message')
  , loremIpsum = require('lorem-ipsum')
  , async = require('async')
  , psql = require('./storage/postgres')
  , { Profiler } = require('./utils/profiler');

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

app.get('/postgres/messages/:lat/:lng', (req, res) => {
  const loc = {
    lat: req.params.lat,
    lng: req.params.lng
  };

  /*SELECT
    st_AsText(geometry) as geometry, username, message
    FROM tweets
    WHERE ST_Within(geometry, ST_Transform(ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint(-58.491008, -34.5008638), 4326), 3857), 3000), 4326)) = true
  */

  const q = {
    select: 'st_AsText(geometry) as geometry, username, message',
    from: 'tweets',
    where: `ST_Within(geometry, ST_Transform(ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint(${loc.lat}, ${loc.lng}), 4326), 3857), ${maxRange}), 4326)) = true`
  };

  const queryStr = `SELECT ${q.select} FROM ${q.from} WHERE ${q.where};`;

  const timer = new Profiler();
  timer.start();

  psql.query(queryStr, (err, result) => {
    if (err) {
      console.error('Error quering postgress database: ', err);
      return res.status(500).send(err);
    }
    const timeSpent = timer.stop();
    res.send({ time: timeSpent, results: result.rows.map(transformPsqlToJsonObject) });
  });
});

app.post('/postgres', (req, res) => {
  const loc = {
    lat: req.body.lat,
    lng: req.body.lon
  }

  const q = {
    table: 'tweets',
    insert_type: '(geometry, username, message, range)',
    values: `(ST_SetSRID(ST_MakePoint(${loc.lat},${loc.lng}), 4326), '${req.body.username}', '${req.body.message}', ${maxRange})`
  };

  const queryStr = `INSERT INTO ${q.table}${q.insert_type} VALUES ${q.values}`;
  psql.query(queryStr, (err, result) => {
    if (err) {
      console.error('Error quering postgress database: ', err);
      return res.status(500).send(err);
    }
    return res.status(200).redirect('/postgres/index');
  });
});

app.post('/postgres/messages/create_random', (req, res) => {

  const amount = parseInt(req.body.amount);
  const lat = req.body.lat;
  const lon = req.body.lon;

  if (!amount || !lat || !lon) {
    return res.status(400).render('index');
  }

  const messageList = createRandomMessages(lat, lon, amount, (obj) => obj);

  async.each(messageList, (elem, cb) => postgresInsert(elem, cb), (err) => {
    if (err) {
      console.error(`Error creating random tweets. ${err}`);
      return res.status(500).send(err);
    }
    return res.status(200).redirect('/postgres/index');
  })

});

const postgresInsert = (elem, cb) => {
  const q = {
    table: 'tweets',
    insert_type: '(geometry, username, message, range)',
    values: `(ST_SetSRID(ST_MakePoint(${elem.geometry.coordinates[0]},${elem.geometry.coordinates[1]}), 4326), '${elem.username}', '${elem.message}', ${elem.range})`
  };

  const queryStr = `INSERT INTO ${q.table}${q.insert_type} VALUES ${q.values}`;
  psql.query(queryStr, (err, result) => {
    if (err) {
      console.error('Error quering postgress database: ', err);
      return cb(err);
    }
    cb();
  });
};
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
      console.error(err);
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


const createRandomMessages = (lat, lon, amount, builder) => {

  const rndInt = (max) => Math.floor(Math.random() * Math.floor(max + 1));

  const location = { lat, lon };

  const messageList = [];

  for (let i = 0; i < amount; i++) {
    const dist = rndInt(maxRange);
    const bearing = rndInt(360);
    const newLocaltion = geolib.computeDestinationPoint(location, dist, bearing);

    // Create message
    const message = builder({
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

  return messageList;
};


app.post('/messages/create_random', (req, res) => {

  const amount = parseInt(req.body.amount);
  const lat = req.body.lat;
  const lon = req.body.lon;

  if (!amount || !lat || !lon) {
    return res.status(400).render('index');
  }

  const messageList = createRandomMessages(lat, lon, amount, (obj) => new Message(obj));

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
