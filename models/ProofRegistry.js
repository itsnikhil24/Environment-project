// models/ProofRegistry.js

const mongoose = require('mongoose');

const proofRegistrySchema = new mongoose.Schema({
    proofId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true // optional: makes matching easier
    },
    factoryName: {
        type: String,
        required: true,
        trim: true
    },
    practiceName: {
        type: String,
        required: true,
        trim: true
    },
    issuedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ProofRegistry', proofRegistrySchema);
