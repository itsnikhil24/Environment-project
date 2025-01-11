const mongoose = require("mongoose");

const taxClaimSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true }, // Reference to the user
    taxType: { type: String, required: true }, // Type of tax benefit claimed
    pointsDeducted: { type: Number, required: true }, // Points deducted for the claim
    previousAmount: { type: Number, required: true }, // Amount of money saved in this claim
    claimedAt: { type: Date, default: Date.now }, // Claim date
});

module.exports = mongoose.model('TaxClaim', taxClaimSchema);
