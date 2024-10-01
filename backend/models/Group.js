const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Track users
  createdAt: { type: Date, default: Date.now },
});

const Group = mongoose.model('Group', groupSchema);
module.exports = Group;
