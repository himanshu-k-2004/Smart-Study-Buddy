const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  gender: { type: String },
  phone: { type: String },
  profilePicture: { type: String },
  progress: { type: Map, of: Number },
  assignments: { type: Map, of: Boolean }
});

module.exports = mongoose.model('User', userSchema);
