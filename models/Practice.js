const mongoose = require('mongoose');

const practiceSchema = new mongoose.Schema({
    factory: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true }, // Reference to the factory (user)
    practice: { type: String, required: true }, // Name of the sustainable practice
    description: { type: String, required: true }, // Detailed description of the practice
    points: { type: Number, required: true }, // Points awarded for the practice
    proofFile: { type: String, required: true }, // URL of the uploaded proof file (e.g., on Cloudinary)
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    }, // Status of the claim (pending by default)
    submittedAt: { type: Date, default: Date.now }, // Timestamp of submission
});

module.exports = mongoose.model('Practice', practiceSchema);
