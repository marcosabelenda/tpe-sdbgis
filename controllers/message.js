const mongoose = require('mongoose')
  , Message = require('../models/message');

module.exports = mongoose.model('Message', Message);