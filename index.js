const async = require('async')
  , { connect: mongoConnect } = require('./storage/mongo')
  , psql = require('./storage/postgres');

const mongoConnectWrapper = (cb) => {
  // TODO: Put in config file
  const mongoURI = 'mongodb://localhost:27017/tpgeodb';
  mongoConnect(mongoURI, cb);
}

const postgresConnectWrapper = (cb) => {
  const postgresConfig = {
    user: 'jpascale',
    host: 'localhost',
    database: 'sdbgis',
    password: '',
    port: 5432,
  }
  psql.config(postgresConfig, cb);
}

async.series([
  mongoConnectWrapper,
  postgresConnectWrapper
], (err) => {
  if (err) {
    console.error('BANG! 💥💥💥💥 Failed startup process.');
    console.error(err);
    process.exit(1);
  }

  require('./app');
});

