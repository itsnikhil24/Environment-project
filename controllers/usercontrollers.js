const user = require('../models/usermodel'); // Adjust the path as necessary
const bcrypt = require('bcrypt');
const cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken');
const Practice = require('../models/Practice');
const Tax = require('../models/taxmodel');

// Render pages
exports.loginPage = (req, res) => {
    res.render("login.ejs");
};

exports.registerPage = (req, res) => {
    res.render("register.ejs");
};

exports.ngoPage = (req, res) => {
    res.render("NGOs.ejs");
};

exports.home = (req, res) => {
    res.render("home.ejs");
};

// Render the tax page
exports.renderTaxPage = async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).send({ message: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, 'secretKey');
    const username = decoded.username;

    try {
        // Debugging logs
        console.log("Username received:", username);

        // Fetch the user by username
        const userData = await user.findOne({ username });

        // Log the user fetched
        console.log("User fetched from database:", userData);

        if (!userData) {
            return res.status(404).render("error", { message: "User not found" });
        }

        // Define tax tiers
        const tiers = [
            { tier: "Bronze", points: 0, taxBenefit: "10% Tax Reduction", cost: 50 },
            { tier: "Silver", points: 100, taxBenefit: "20% Tax Reduction", cost: 100 },
            { tier: "Gold", points: 200, taxBenefit: "30% Tax Reduction", cost: 150 },
            { tier: "Platinum", points: 300, taxBenefit: "40% Tax Reduction", cost: 200 },
        ];

        // Safely handle undefined Points
        const userPoints = userData.Points || 0;
        console.log("User points:", userPoints);

        // Find the eligible tier
        const eligibleTier = tiers.reverse().find(t => userPoints >= t.points);
        console.log("Eligible tier:", eligibleTier);

        // Render the EJS page with the user and eligibility details
        res.render("taxpage", {
            username: userData.username,
            points: userPoints,
            tier: eligibleTier?.tier || "None",
            taxBenefit: eligibleTier?.taxBenefit || "No Benefits",
            cost: eligibleTier?.cost || 0,
        });
    } catch (error) {
        console.error("Error in renderTaxPage:", error.message);
        res.status(500).render("error", { message: "An error occurred while fetching tax benefits" });
    }
};




exports.leaderboardPage = (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).send({ message: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, 'secretKey');
    const factoryusername = decoded.username;

    user.findOne({ username: factoryusername })
        .then(user => {
            if (!user) {
                return res.status(404).send({ message: 'User not found' });
            }

            const profilePic = user.profile_pic;
            if (profilePic.length > 0) {
                res.render("leaderboard.ejs", { profilePic: profilePic[0] });
            } else {
                res.render("leaderboard.ejs");
            }
        })
        .catch(err => {
            console.error(err);
            return res.status(500).send({ message: 'Error fetching user data' });
        });
};

// Leaderboard API
exports.leaderboard = async (req, res) => {
    try {
        const factories = await user
            .find()
            .select('username name profile_pic Points practices')
            .populate('practices')
            .sort({ Points: -1 });

        res.status(200).send(factories);
    } catch (err) {
        console.error('Error fetching leaderboard:', err);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Add Practice Form
exports.addPracticeForm = (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).send({ message: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, 'secretKey');
    const factoryId = decoded.id;

    res.render("addpracticeform.ejs", { factoryId: factoryId });
};

// Add Practice
exports.addPractice = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).send({ message: 'Not authenticated' });
        }

        const decoded = jwt.verify(token, 'secretKey');
        const factoryId = decoded.id;

        const { practice, description, points } = req.body;

        if (!practice || !description || !points) {
            return res.status(400).send({ message: 'All fields are required' });
        }

        const parsedPoints = Number(points);
        if (isNaN(parsedPoints)) {
            return res.status(400).send({ message: 'Points must be a valid number' });
        }

        if (!req.file) {
            return res.status(400).send({ message: 'Proof file is required' });
        }

        const proofFileUrl = await exports.upload(req.file.buffer);

        const newPractice = new Practice({
            factory: factoryId,
            practice,
            description,
            points: parsedPoints,
            proofFile: proofFileUrl,
            status: 'pending',
        });

        const savedPractice = await newPractice.save();

        const user = await user.findById(factoryId);
        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }

        user.practices.push(savedPractice._id);
        await user.save();

        res.status(201).send({
            message: 'Practice submitted successfully. Awaiting admin verification.',
            practice: savedPractice,
        });
    } catch (err) {
        console.error('Error during practice submission:', err);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Create User
exports.createUser = async (req, res) => {
    try {
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

// Login User
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

        res.cookie("token", token, { httpOnly: true, secure: true, maxAge: 3600000 });
        return res.status(200).redirect("/home");
    } catch (error) {
        console.error("Error during login:", error);
        return res.status(500).send("An internal error occurred");
    }
};

// Upload to Cloudinary
exports.upload = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            { folder: 'environment' },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    reject(new Error('Upload failed'));
                } else {
                    resolve(result.secure_url);
                }
            }
        ).end(fileBuffer);
    });
};

exports.checkEligibility = async (req, res) => {
    const { username } = req.body;

    try {
        const user = await user.findOne({ username });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const tiers = [
            { tier: "Bronze", points: 0, taxBenefit: "10% Tax Reduction" },
            { tier: "Silver", points: 100, taxBenefit: "20% Tax Reduction" },
            { tier: "Gold", points: 200, taxBenefit: "30% Tax Reduction" },
            { tier: "Platinum", points: 300, taxBenefit: "40% Tax Reduction" },
        ];

        const eligibleTier = tiers.reverse().find(t => user.Points >= t.points);

        res.json({
            userId: user._id,
            points: user.Points,
            tier: eligibleTier.tier,
            taxBenefit: eligibleTier.taxBenefit,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Apply Tax Benefits
exports.applyTax = async (req, res) => {
    const { username } = req.body;

    try {
        // Fetch the user by username
        const user = await user.findOne({ username });

        if (!user) {
            return res.status(404).render("error", { message: "User not found" });
        }

        // Define tax tiers
        const tiers = [
            { tier: "Bronze", points: 0, taxBenefit: "10% Tax Reduction", cost: 50 },
            { tier: "Silver", points: 100, taxBenefit: "20% Tax Reduction", cost: 100 },
            { tier: "Gold", points: 200, taxBenefit: "30% Tax Reduction", cost: 150 },
            { tier: "Platinum", points: 300, taxBenefit: "40% Tax Reduction", cost: 200 },
        ];

        // Find the eligible tier
        const eligibleTier = tiers.reverse().find(t => user.Points >= t.points);

        if (!eligibleTier) {
            return res.status(400).render("error", { message: "Insufficient points to claim benefits" });
        }

        // Deduct points
        user.Points -= eligibleTier.cost;
        await user.save();

        // Record the tax benefit
        const taxRecord = new Tax({
            user: user._id,
            tier: eligibleTier.tier,
            taxBenefit: eligibleTier.taxBenefit,
            pointsDeducted: eligibleTier.cost,
        });

        await taxRecord.save();

        // Redirect to the tax benefits page with updated details
        res.redirect(`/tax?username=${username}`);
    } catch (error) {
        res.status(500).render("error", { message: "An error occurred while applying tax benefits" });
    }
};

exports.profile = async (req, res) => {
    try {
        // Get the token from the cookie
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).send({ message: 'Not authenticated' });
        }

        // Verify the JWT token and extract the username
        const decoded = jwt.verify(token, 'secretKey');
        const username = decoded.username;

        if (!username) {
            return res.status(400).send('No username found in the token.');
        }

        // Fetch user details using the username
        const userDetails = await user.findOne({ username }).populate('practices');

        if (!userDetails) {
            return res.status(404).send('User not found.');
        }

        // Fetch all practices submitted by the user
        const practices = await Practice.find({ factory: userDetails._id });

        // Fetch tax claims submitted by the user
        const taxClaims = await Tax.find({ user: userDetails._id });

        // Render the profile page with the fetched data
        res.render('profile', {
            user: userDetails, // Pass user details to the view
            practices,         // Pass user's practices to the view
            taxClaims          // Pass user's tax claims to the view
        });
    } catch (error) {
        console.error('Error fetching profile data:', error);
        res.status(500).send('Internal Server Error');
    }
};