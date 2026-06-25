const express = require('express');

const userController = require('../controllers/userController');
const userAuthCheck = require('../middleware/userAuthCheck')
const upload = require("../utils/cloudinaryStorage")
const validate = require('../middleware/validate');
const { registerSchema, loginSchema, blogSchema, updateBlogSchema, changePasswordSchema, otpSchema, commentSchema } = require('../utils/joiSchemaValidation');

const router = express.Router();

const rateLimit = require("../utils/rateLimiter");
const viewController = require('../controllers/viewController');

router.post('/register', upload.single("profileImage"), userController.userRegister)
router.post('/login', rateLimit, userController.userLogin)
router.post('/verify-otp', userController.verifyOtp)
router.get('/logout', userController.userLogout)


// user login page and register page
router.get("/login-view", viewController.userLoginPage)
router.get("/register-view", viewController.userRegisterPage)

// protected view routes
router.get("/home", userAuthCheck, viewController.userHomePage)
router.get("/fullBlog-view/:id", userAuthCheck, viewController.userFullBlogView)
router.get("/profile", userAuthCheck, viewController.userprofile)
router.get("/dashboard/blogs", userAuthCheck, viewController.userBlogsPage)


//update password
router.post("/password-update", userAuthCheck, userController.userPasswordUpdate)
router.post("/update/profile-image", upload.single("profileImage"), userAuthCheck, userController.updateProfileImage)

//comment & like on blog by user
router.post('/blog/like/:blogId', userAuthCheck, userController.toggleLikeBlog);
router.post('/blog/comment/:blogId', userAuthCheck, validate(commentSchema), userController.addComment);

//blog operations(CRUD) from one endpoint/route(API)
router.get("/blog", userAuthCheck, userController.getBlogs);
router.post("/blog/create", userAuthCheck, upload.single("coverImage"), userController.createBlog);
router.post("/blog/update/:id", userAuthCheck, upload.single("coverImage"), userController.updateBlog);
router.post("/blog/delete/:id", userAuthCheck, userController.deleteBlog);


module.exports = router