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
router.post("/practices", upload.single("proofFile"), userController.addPractice);
router.get("/practices", userController.addPracticeForm);

// Leaderboard routes
router.get("/api/leaderboard", userController.leaderboard);
router.get("/leaderboard", userController.leaderboardPage);

// Static pages
router.get("/home", userController.home);
router.get("/ngo", userController.ngoPage);
router.get("/tax", userController.renderTaxPage);
router.get("/profile", userController.profile);

// Apply for tax benefits
router.post("/apply-tax", userController.applyTax);

module.exports = router;
