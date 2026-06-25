const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const viewController = require("../controllers/viewController")

const upload = require("../utils/cloudinaryStorage")

const rateLimit = require("../utils/rateLimiter")
const validate = require('../middleware/validate');
const { registerSchema, loginSchema, blogSchema, updateBlogSchema, changePasswordSchema } = require('../utils/joiSchemaValidation');

const adminAuthCheck = require('../middleware/adminAuthCheck')

router.post('/register', upload.single("profileImage"), adminController.adminRegister)
router.post('/login', rateLimit, adminController.adminLogin)
router.get('/logout', adminController.adminLogout)



//view routes
router.get("/login-view", viewController.adminLoginView)
router.get("/register-view", viewController.adminRegisterView)
//protected view routes
router.get("/dashboard", adminAuthCheck, viewController.adminDashboardPage)
router.get("/dashboard/blogs", adminAuthCheck, viewController.adminBlogsPage)
router.get("/profile", adminAuthCheck, viewController.adminprofile)
router.get("/writers", adminAuthCheck, viewController.adminWritersPage);
router.get("/fullblog-view/:id", adminAuthCheck, viewController.fullBlogView);



//admin update password(API)
router.post('/password-update', adminAuthCheck, adminController.adminPasswordUpdate)
router.post('/update/profile-image', upload.single("profileImage"), adminAuthCheck, adminController.updateProfileImage)

//blog approval by admin(API)
router.post("/blog/approval/:blogId", adminAuthCheck, adminController.approveAndPublishBlog);
router.post("/blog/reject/:blogId", adminAuthCheck, adminController.rejectBlog);



//blog operations(CRUD) from one endpoint/route(API)
router.get("/blog", adminAuthCheck, upload.single("coverImage"), adminController.getBlogs);
router.post("/blog/create", adminAuthCheck, upload.single("coverImage"), adminController.createBlog);
router.post("/blog/update/:id", adminAuthCheck, upload.single("coverImage"), adminController.updateBlog);
router.post("/blog/delete/:id", adminAuthCheck, adminController.deleteBlog);

module.exports = router