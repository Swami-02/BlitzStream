const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FollowSchema = new Schema({
  username:{
    type: String,
    required: true
  },
  following:{
    type: []
  }
});

mongoose.model('following', FollowSchema);
