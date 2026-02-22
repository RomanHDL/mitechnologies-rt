const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // ✅ email opcional (para quien sí tenga), pero único si existe
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true, default: '' },

    passwordHash: { type: String, required: true },

    // ✅ login principal
    employeeNumber: { type: String, required: true, trim: true, unique: true },

    fullName: { type: String, default: '' },
    role: { type: String, enum: ['ADMIN', 'SUPERVISOR', 'OPERADOR'], default: 'OPERADOR' },
    position: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);