const mongoose = require('mongoose');

const Message = mongoose.Schema({
  username: String,
  range: Number,
  message: String,
  geometry: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  type: String
});

module.exports = Message;