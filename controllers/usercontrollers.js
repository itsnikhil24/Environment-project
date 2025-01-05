const user = require('../models/usermodel'); // Adjust the path as necessary
const bcrypt = require('bcrypt');
const cloudinary = require('cloudinary').v2;
var jwt = require('jsonwebtoken');
const chatmodel = require('../models/chatmodel');
const Practice = require('../models/Practice');

exports.loginpage=(req,res)=>{
  res.render("login.ejs");
}
exports.registerpage=(req,res)=>{
  res.render("register.ejs");
}
exports.addPracticeform=(req,res)=>{
  const token = req.cookies.token; // Assuming cookie is named 'token'
        if (!token) {
            return res.status(401).send({ message: 'Not authenticated' });
        }

        // Verify the token and decode it
        const decoded = jwt.verify(token, 'secretKey'); // 'secretKey' should match the one used during login
        const factoryId = decoded.id; // Factory ID from the decoded token

        res.render("addpracticeform.ejs",{factoryId:factoryId});
}

exports.createUser = async (req, res) => {
    try {
      console.log("Request body:", req.body); // Log form data
      console.log("Uploaded file:", req.file); // Log uploaded file details
  
      const { name, username, phone_number, password } = req.body;
  
      if (!name || !username || !phone_number || !password) {
        return res.status(400).send({ message: 'All fields are required' });
      }
  
      if (!req.file) {
        return res.status(400).send({ message: 'Profile picture is required' });
      }
  
      const existingUser = await user.findOne({ username, phone_number });
      if (existingUser) {
        return res.status(400).send({ message: "User already exists with the same username or phone number" });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Handle profile picture upload to Cloudinary
      const profilePicUrl = await exports.upload(req.file.buffer);
  
      const newUser = await user.create({
        name,
        username,
        phone_number,
        password: hashedPassword,
        profile_pic: profilePicUrl,
      });
  
      res.status(201).send({ message: 'User created successfully', user: newUser });
    } catch (err) {
      console.error("Error during user creation:", err);
      res.status(500).send({ error: 'Internal server error' });
    }
  };
  
  
  exports.upload = (fileBuffer) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'environment' },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error); // Log the error
            reject(new Error('Upload failed'));
          } else {
            resolve(result.secure_url);
          }
        }
      ).end(fileBuffer);
    });
  };
  
  exports.login = async (req, res) => {
    try {
  
  
  
      const userfind = await user.findOne({ username: req.body.username });
      if (!userfind) {
        return res.status(400).send("User not found");
      }
  
  
      const isPasswordMatch = await bcrypt.compare(req.body.password, userfind.password);
      if (!isPasswordMatch) {
        return res.status(400).send("Incorrect Password");
      }
  
  
      const token = jwt.sign({ username: userfind.username, id: userfind._id }, "secretKey", { expiresIn: "1h" });
  
  
      res.cookie("token", token, { httpOnly: true, secure: true, maxAge: 3600000 }); // Secure cookies are recommended in production
  
      // Redirect the user or send a success response
      return res.status(200).redirect("/practices"); // Change "/dashboard" to your desired redirect path
    } catch (error) {
      console.error("Error during login:", error);
      return res.status(500).send("An internal error occurred");
    }
  };

  
  
  // Add Practice Function
  exports.addPractice = async (req, res) => {
    try {
        // Extract factory ID from the cookie
        const token = req.cookies.token;  // Assuming cookie is named 'token'
        if (!token) {
            return res.status(401).send({ message: 'Not authenticated' });
        }

        // Verify the token and decode it
        const decoded = jwt.verify(token, 'secretKey');  // 'secretKey' should match the one used during login
        const factoryId = decoded.id;  // Factory ID from the decoded token

        const { practice, description, points } = req.body;

        // Validate required fields
        if (!practice || !description || !points) {
            return res.status(400).send({ message: 'All fields are required' });
        }

        // Log the points value to check
        console.log("Points received:", points);

        // Ensure points is a valid number
        const parsedPoints = Number(points);
        if (isNaN(parsedPoints)) {
            return res.status(400).send({ message: 'Points must be a valid number' });
        }

        if (!req.file) {
            return res.status(400).send({ message: 'Proof file is required' });
        }

        // Upload proof file to Cloudinary
        const proofFileUrl = await exports.upload(req.file.buffer);

        // Create a new practice record in the database
        const newPractice = new Practice({
            factory: factoryId,  // Use the factory ID from the cookie
            practice,
            description,
            points: parsedPoints,  // Store the points but do not update factory points yet
            proofFile: proofFileUrl,
            status: 'pending',  // Set initial status as 'pending'
        });

        // Save the new practice record to the database
        await newPractice.save();

        res.status(201).send({ message: 'Practice submitted successfully', practice: newPractice });
    } catch (err) {
        console.error('Error during practice submission:', err);
        res.status(500).send({ error: 'Internal server error' });
    }
};

  
