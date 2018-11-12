const mongoose = require('mongoose');


const connect = (uri, cb) => {
  console.log(`Connecting to mongoose on ${uri}...`);

  if (mongoose.connection.readyState) {
    console.log('Already connected!');
    return cb();
  }

  mongoose.connection.on('connected', ref => {
    console.log('Connected to DB!');
  });

  mongoose.connection.on('error', err => {
    console.log(`Failed to connect to db ${err.message}`);
    console.error(err);
  });

  mongoose.connection.on('disconnected', err => {
    console.log(`Mongoose default connection disconnected`);
  });

  mongoose.connect(uri, { useNewUrlParser: true }, cb);
};

module.exports = {
  connect
};