const { Pool } = require('pg');

const Module = {};

let pool;

Module.config = (config, cb) => {
  if (pool) return;
  pool = new Pool(config);
  console.log('Postgres DB configured!');
  cb();
};

Module.query = function () {
  if (!pool) {
    throw new Error('module has no config');
  }
  return pool.query.apply(pool, arguments);
};

module.exports = Module;