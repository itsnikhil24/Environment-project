const user = require('../models/usermodel');
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
exports.taxPage = async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).render("error", { message: "Not authenticated" });
    }

    try {
        const decoded = jwt.verify(token, 'secretKey');
        const username = decoded.username;

        const currentUser = await user.findOne({ username });

        if (!currentUser) {
            return res.status(404).render("error", { message: "User not found" });
        }

        const tiers = [
            { tier: "Bronze", points: 0, taxBenefit: "10% Tax Reduction", cost: 50 },
            { tier: "Silver", points: 100, taxBenefit: "20% Tax Reduction", cost: 100 },
            { tier: "Gold", points: 200, taxBenefit: "30% Tax Reduction", cost: 150 },
            { tier: "Platinum", points: 300, taxBenefit: "40% Tax Reduction", cost: 200 },
        ];

        const eligibleTier = tiers.reverse().find(t => currentUser.Points >= t.points);

        const previousTaxes = await Tax.find({ user: currentUser._id });

        const totalSavings = previousTaxes.reduce((acc, tax) => acc + (tax.previousAmount || 0), 0);

        res.render("taxpage", {
            user: currentUser,
            eligibleTier,
            previousTaxes,
            totalSavings,
        });
    } catch (error) {
        console.error(error);
        res.status(500).render("error", { message: "An error occurred" });
    }
};

exports.leaderboardPage = (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).send({ message: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, 'secretKey');
    const factoryusername = decoded.username;

    // Fetch the logged-in user's profile pic
    user.findOne({ username: factoryusername })
        .then(loggedInUser => {
            if (!loggedInUser) {
                return res.status(404).send({ message: 'User not found' });
            }

            const profilePic = loggedInUser.profile_pic;
            
            // Fetch all users for the leaderboard
            user.find()
                .select('username name profile_pic Points') // Adjust the fields as needed
                .sort({ Points: -1 }) // Sort by points in descending order
                .then(factories => {
                    // Send both the logged-in user's profile pic and the leaderboard data to the view
                    res.render("leaderboard.ejs", {
                        profilePic: profilePic[0] || '', // Handle empty profile pic
                        factories: factories
                    });
                })
                .catch(err => {
                    console.error('Error fetching leaderboard data:', err);
                    return res.status(500).send({ message: 'Error fetching leaderboard data' });
                });
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

        console.log('Request Body:', req.body);

        if (!practice || !description || points === undefined || points === null) {
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

        const userObj = await user.findById(factoryId);
        if (!userObj) {
            return res.status(404).send({ message: 'User not found' });
        }

        userObj.practices.push(savedPractice._id);
        userObj.Points += parsedPoints;
        await userObj.save();

        res.redirect("/tax");
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

        res.cookie("token", token, { httpOnly: true, secure: true });

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
        const factoryUser = await user.findOne({ username });

        if (!factoryUser) {
            return res.status(404).render("error", { message: "User not found" });
        }

        const tiers = [
            { tier: "Bronze", points: 0, taxBenefit: "10% Tax Reduction", cost: 50 },
            { tier: "Silver", points: 100, taxBenefit: "20% Tax Reduction", cost: 100 },
            { tier: "Gold", points: 200, taxBenefit: "30% Tax Reduction", cost: 150 },
            { tier: "Platinum", points: 300, taxBenefit: "40% Tax Reduction", cost: 200 },
        ];

        const eligibleTier = tiers.find(t => factoryUser.Points >= t.points);

        if (!eligibleTier) {
            return res.status(400).render("error", { message: "Insufficient points to claim benefits" });
        }

        factoryUser.Points -= eligibleTier.cost;
        await factoryUser.save();

        const taxRecord = new Tax({
            user: factoryUser._id,
            taxType: eligibleTier.tier,
            pointsDeducted: eligibleTier.cost,
            taxBenefit: eligibleTier.taxBenefit,
            previousAmount: eligibleTier.cost * 0.1,
        });

        await taxRecord.save();

        const updatedEligibleTier = tiers
            .filter(t => factoryUser.Points >= t.points)
            .pop();

        res.redirect(`/tax?username=${username}&tier=${updatedEligibleTier.tier}&taxBenefit=${updatedEligibleTier.taxBenefit}`);
    } catch (error) {
        console.error(error);
        res.status(500).render("error", { message: "An error occurred while applying tax benefits." });
    }
};

exports.profile = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).send({ message: 'Not authenticated' });
        }

        const decoded = jwt.verify(token, 'secretKey');
        const username = decoded.username;

        const userDetails = await user.findOne({ username }).populate('practices');

        if (!userDetails) {
            return res.status(404).send('User not found.');
        }

        const practices = await Practice.find({ factory: userDetails._id });
        const taxClaims = await Tax.find({ user: userDetails._id });

        res.render('profile', {
            user: userDetails,
            practices,
            taxClaims,
        });
    } catch (error) {
        console.error('Error fetching profile data:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.logout = (req, res) => {
    res.clearCookie('token'); // Clear the JWT cookie
    res.redirect('/login'); // Redirect to home page after logout
};

// isLoggedIn Middleware to check if the user is logged in
// isLoggedIn Middleware to check if the user is logged in
exports.isLoggedIn = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect("/login"); // Redirect to login page if not authenticated
    }

    try {
        const decoded = jwt.verify(token, 'secretKey');
        req.user = decoded; // Store user info in the request object
        next(); // Continue to the next middleware or route handler
    } catch (error) {
        return res.redirect("/login"); // Redirect to login page if token is invalid or expired
    }
};

