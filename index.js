const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");

require("dotenv").config();
const upload = multer({ storage: multer.memoryStorage() }); // Memory storage for file uploads

const app = express();
const PORT = process.env.PORT || 5007;

// Dependencies
const userroutes = require("./routes/userroutes");

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

module.exports = mongoose; // Export mongoose if needed elsewhere

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Middleware
app.set("view engine", "ejs");

// Explicitly set the views directory
app.set("views", path.join(__dirname, "views")); // Make sure "views" folder is in the root

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(userroutes); // Routes
app.use(express.static("public"));

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on Port ${PORT}`);
});


module.exports = app;