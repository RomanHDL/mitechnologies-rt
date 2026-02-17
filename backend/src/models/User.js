const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  employeeNumber: { type: String, required: true, trim: true },
  fullName: { type: String, default: '' },
  role: { type: String, enum: ['ADMIN', 'SUPERVISOR', 'OPERADOR'], default: 'OPERADOR' },
  position: { type: String, default: '' }, // puesto: Supervisor, Coordinador, Gerente, Montacargista...
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
