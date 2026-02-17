const mongoose = require('mongoose');

const AuthLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  email: { type: String, default: '' },
  event: { type: String, enum: ['LOGIN_SUCCESS','LOGIN_FAIL','LOGOUT'], required: true },
  ip: { type: String, default: '' },
  ua: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('AuthLog', AuthLogSchema);
