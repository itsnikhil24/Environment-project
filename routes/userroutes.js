const express = require("express");
const router = express.Router();
const usercontroller = require("../controllers/usercontrollers");
const multer = require("multer");


const upload = multer({ storage: multer.memoryStorage() }); // Move upload middleware here


router.get("/login", usercontroller.loginpage);
router.get("/", usercontroller.registerpage);
router.post("/register", upload.single("profile_pic"), usercontroller.createUser); // Use multer middleware
router.post("/login", usercontroller.login); // Use multer middleware
router.post('/practices',  upload.single('proofFile'), usercontroller.addPractice);
router.get('/practices',  usercontroller.addPracticeform);


module.exports = router; // Ensure this exports the router
