const express = require("express");
const multer = require("multer");
const userController = require("../controllers/usercontrollers");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Authentication routes
router.get("/login", userController.loginPage);
router.get("/", userController.registerPage);
router.post("/register", upload.single("profile_pic"), userController.createUser);
router.post("/login", userController.login);

// Practices routes
router.post("/practices",userController.isLoggedIn, upload.single("proofFile"), userController.addPractice);
router.get("/practices", userController.isLoggedIn,userController.addPracticeForm);

// Leaderboard routes
router.get("/api/leaderboard",userController.isLoggedIn, userController.leaderboard);
router.get("/leaderboard",userController.isLoggedIn, userController.leaderboardPage);

// Static pages
router.get("/home",userController.isLoggedIn, userController.home);
router.get("/ngo",userController.isLoggedIn, userController.ngoPage);
router.get("/tax",userController.isLoggedIn, userController.taxPage);
router.get("/profile",userController.isLoggedIn, userController.profile);

// Apply for tax benefits
router.post("/apply-tax",userController.isLoggedIn, userController.applyTax);


router.get("/logout", userController.logout);

module.exports = router;
