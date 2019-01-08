const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const KeySchema = new Schema({
  username:{
    type: String,
    required: true
  },
  key:{
    type: String
  }
});

mongoose.model('keys', KeySchema);
