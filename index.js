const async = require('async')
  , { connect: mongoConnect } = require('./storage/mongo');


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

  require('./app');
});

