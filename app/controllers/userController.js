const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const UserModel = require("../models/user");
const BlogModel = require("../models/blog");
const CommentModel = require("../models/comments");
const OtpModel = require("../models/otpModel");
const sendOTPEmail = require("../utils/verifyOTPEmail");
const cloudinary = require("cloudinary").v2

class userController {
  async userRegister(req, res) {
    try {
      const { userName, email, password, phone } = req.body
      const exists = await UserModel.findOne({ email });
      if (exists) {
        req.flash("error", "Email already registered");
        return res.redirect("/user/register-view");
      }

      const hashed = await bcrypt.hash(password, 10);
      await UserModel.create({
        userName,
        email,
        password: hashed,
        phone,
        profileImage: req.file.path,
        publicId: req.file.filename,
      });
      req.flash("success", "User registered. Please login.");
      res.redirect("/user/login-view");
    } catch (err) {
      req.flash("error", err.message);
      res.redirect("/user/register-view");
    }
  }

  async userLogin(req, res) {
    try {
      const { email, password } = req.body;

      // Validate
      if (!email || !password) {
        req.flash("error", "All input is required");
        return res.redirect("/user/login-view");
      }

      // Find user
      const user = await UserModel.findOne({ email });

      if (!user || user.role !== "user") {
        req.flash("error", "USER access only");
        return res.redirect("/user/login-view");
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        req.flash("error", "Invalid email or password");
        return res.redirect("/user/login-view");
      }

      // Check if user is verified
      if (user.isVerified === false) {
        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await OtpModel.deleteMany({ email }); // Clear previous OTPs
        await OtpModel.create({ email, otp });

        // Send OTP
        await sendOTPEmail(email, otp);

        // Render login page with OTP modal flag
        return res.render("user/login", {
          title: "Verify OTP",
          showOtpModal: true,
          email: email,
          error: req.flash("error"),
          success: req.flash("success")
        });
      }

      // Tokens
      const userAccessToken = jwt.sign(
        {
          userId: user._id,
          userName: user.userName,
          email: user.email,
          isActive: user.isActive,
        },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "1m" },
      );

      const userRefreshToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_REFRESH_SECRET_KEY,
        { expiresIn: "7d" },
      );

      // Save refresh token
      user.refreshToken = userRefreshToken;
      await user.save();

      // Cookies
      res.cookie("userAccessToken", userAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 1 * 60 * 1000,
      });

      res.cookie("userRefreshToken", userRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      req.flash("success", "User logged in successfully");
      return res.redirect("/user/home");
    } catch (error) {
      console.error("Admin Login Error:", error);

      req.flash("error", "Something went wrong");
      return res.redirect("/user/login-view");
    }
  }

  async verifyOtp(req, res) {
    try {
      const { email, otp } = req.body;
      
      if (!email || !otp) {
        req.flash("error", "Email and OTP are required");
        return res.redirect("/user/login-view");
      }

      const otpRecord = await OtpModel.findOne({ email, otp });

      if (!otpRecord) {
        return res.render("user/login", {
          title: "Verify OTP",
          showOtpModal: true,
          email: email,
          error: ["Invalid or expired OTP"],
          success: []
        });
      }

      // Update user to verified
      const user = await UserModel.findOne({ email });
      user.isVerified = true;
      await user.save();

      // Clear OTP
      await OtpModel.deleteMany({ email });

      // Generate tokens
      const userAccessToken = jwt.sign(
        {
          userId: user._id,
          userName: user.userName,
          email: user.email,
          isActive: user.isActive,
        },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "1m" },
      );

      const userRefreshToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_REFRESH_SECRET_KEY,
        { expiresIn: "7d" },
      );

      // Save refresh token
      user.refreshToken = userRefreshToken;
      await user.save();

      // Cookies
      res.cookie("userAccessToken", userAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 1 * 60 * 1000,
      });

      res.cookie("userRefreshToken", userRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      req.flash("success", "User verified and logged in successfully");
      return res.redirect("/user/home");

    } catch (error) {
      console.error("Verify OTP Error:", error);
      req.flash("error", "Something went wrong during OTP verification");
      return res.redirect("/user/login-view");
    }
  }


  //user Blog CRUD operations
  // get all blogs
  async getBlogs(req, res) {
    try {

      const blogs = await BlogModel.aggregate([

        // SOFT DELETE FILTER
        {
          $match: {
            isDeleted: { $ne: true }
          }
        },

        // COMMENTS
        {
          $lookup: {
            from: "comments",
            let: { blogId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$blog", "$$blogId"] },
                },
              },

              {
                $lookup: {
                  from: "users",
                  localField: "user",
                  foreignField: "_id",
                  as: "user",
                },
              },

              {
                $unwind: {
                  path: "$user",
                  preserveNullAndEmptyArrays: true,
                },
              },

              {
                $project: {
                  content: 1,
                  createdAt: 1,
                  user: {
                    _id: "$user._id",
                    userName: "$user.userName",
                  },
                },
              },
            ],
            as: "comments",
          },
        },

        // AUTHOR
        {
          $lookup: {
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "author",
          },
        },

        {
          $unwind: {
            path: "$author",
            preserveNullAndEmptyArrays: true,
          },
        },

        // COUNTS
        {
          $addFields: {
            totalComments: {
              $size: "$comments",
            },

            totalLikes: {
              $size: {
                $ifNull: ["$likes", []],
              },
            },
          },
        },

        {
          $sort: {
            createdAt: -1,
          },
        },

      ]);

      return res.render("user/blogs", {
        title: "Blogs",
        blogs,
        user: req.user,
        success: req.flash("success"),
        error: req.flash("error"),
      });

    } catch (err) {
      console.log(err);

      req.flash("error", err.message || "Something went wrong");

      return res.redirect("/user/dashboard/blogs");
    }
  }


  // create blog by user
  async createBlog(req, res) {
    try {

      const { title, content, excerpt, category } = req.body;

      if (!title || !content || !excerpt || !category) {
        req.flash("error", "All fields are required");

        return res.redirect("/user/dashboard/blogs");
      }

      if (!req.user) {
        return res.redirect("/user/login-view");
      }

      const user = await UserModel.findById(req.user.userId);

      await BlogModel.create({
        title,
        content,
        excerpt,
        category,
        author: user._id,
        authorModel: "user",
        coverImage: req.file?.path,
        publicId: req.file?.filename,
      });

      req.flash("success", "Blog created successfully");

      return res.redirect("/user/dashboard/blogs");

    } catch (err) {
      console.log(err);

      req.flash("error", err.message || "Something went wrong");

      return res.redirect("/user/dashboard/blogs");
    }
  }


  // update blog
  async updateBlog(req, res) {
    try {

      const { id } = req.params;

      const blog = await BlogModel.findById(id);

      if (!blog || blog.isDeleted) {
        req.flash("error", "Blog not found");

        return res.redirect("/user/dashboard/blogs");
      }

      // OWNER CHECK
      if (blog.author.toString() !== req.user.userId.toString()) {
        req.flash("error", "Unauthorized action");

        return res.redirect("/user/dashboard/blogs");
      }

      const { title, content, excerpt, category } = req.body;

      if (title) blog.title = title;
      if (content) blog.content = content;
      if (excerpt) blog.excerpt = excerpt;
      if (category) blog.category = category;

      // IMAGE UPDATE
      if (req.file) {

        try {

          if (blog.publicId) {
            await cloudinary.uploader.destroy(blog.publicId);
          }

          blog.coverImage = req.file.path;
          blog.publicId = req.file.filename;

        } catch (err) {

          console.log("Cloudinary Error:", err.message);

          req.flash("error", "Image upload failed");

          return res.redirect("/user/dashboard/blogs");
        }
      }

      await blog.save();

      req.flash("success", "Blog updated successfully");

      return res.redirect("/user/dashboard/blogs");

    } catch (err) {

      console.log(err);

      req.flash("error", err.message || "Something went wrong");

      return res.redirect("/user/dashboard/blogs");
    }
  }


  // soft delete by user
  async deleteBlog(req, res) {
    try {

      const { id } = req.params;

      const blog = await BlogModel.findById(id);

      if (!blog || blog.isDeleted) {
        req.flash("error", "Blog not found");

        return res.redirect("/user/dashboard/blogs");
      }

      // OWNER CHECK
      if (blog.author.toString() !== req.user.userId.toString()) {
        req.flash("error", "Unauthorized action");

        return res.redirect("/user/dashboard/blogs");
      }

      // soft delete
      blog.isDeleted = true;
      blog.deletedAt = new Date();

      await blog.save();

      req.flash("success", "Blog deleted successfully");

      return res.redirect("/user/dashboard/blogs");

    } catch (err) {

      console.log(err);

      req.flash("error", err.message || "Something went wrong");

      return res.redirect("/user/dashboard/blogs");
    }
  }

  // toggle like
  async toggleLikeBlog(req, res) {
    try {
      const { blogId } = req.params;
      const userId = req.user.userId;

      const blog = await BlogModel.findById(blogId);

      if (!blog) {
        req.flash("error", "No blog found");
        return res.redirect("/user/home");
      }

      const index = blog.likes.findIndex((id) => id.toString() === userId);

      if (index > -1) {
        //unlike
        blog.likes.splice(index, 1);
      } else {
        //like
        blog.likes.push(userId);
      }

      await blog.save();

      req.flash("success", "Blog Liked");
      return res.redirect(`/user/fullblog-view/${blogId}`);
    } catch (err) {
      console.error("LIKE ERROR:", err);

      req.flash("error", "Something went Wrong");
      return res.redirect("/user/home");
    }
  }

  async addComment(req, res) {
    try {
      const { blogId } = req.params;
      const { content } = req.body;
      const userId = req.user.userId;

      console.log("USER", req.user);

      if (!content || content.trim() === "") {
        req.flash("error", "Comment cannot be empty");
        return res.redirect(`/user/view-blog/${blogId}`);
      }

      const blog = await BlogModel.findById(blogId);

      if (!blog) {
        req.flash("error", "Blog not found");
        return res.redirect(`/user/home`);
      }

      await CommentModel.create({
        blog: blogId,
        user: userId,
        content: content.trim(),
      });

      req.flash("success", "Comment added successfully");
      return res.redirect(`/user/fullblog-view/${blogId}`);
    } catch (err) {
      console.error("COMMENT ERROR:", err);

      req.flash("error", "Something went wrong while adding comment");
      return res.redirect(`/user/home`);
    }
  }

  async userPasswordUpdate(req, res) {
    try {
      console.log(req.user);
      const { currentPassword, newPassword } = req.body;

      //validate input
      if (!currentPassword || !newPassword) {
        req.flash("error", "all password field are required");
        return res.redirect("/user/profile");
      }

      if (newPassword.length < 6) {
        req.flash("error", "New password must be at least 6 characters");
        return res.redirect("/user/profile");
      }

      // get admin from DB
      const user = await UserModel.findById(req.user.userId);

      if (!user) {
        req.flash("error", "User not found");
        return res.redirect("/user/login-view");
      }

      // compare current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);

      if (!isMatch) {
        req.flash("error", "Current password is incorrect");
        return res.redirect("/user/profile");
      }

      // hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // update password
      user.password = hashedPassword;
      await user.save();

      req.flash("success", "Password updated successfully");
      return res.redirect("/user/home");
    } catch (err) {
      req.flash("error", err.message);

      res.redirect("/user/profile");
    }
  }

  async updateProfileImage(req, res) {
    try {
      if (!req.file) {
        req.flash("error", "Please upload an image");

        return res.redirect("/user/profile");
      }

      const user = await UserModel.findById(req.user.userId);

      // delete old image
      if (user.publicId) {
        await cloudinary.uploader.destroy(user.publicId);
      }

      user.profileImage = req.file.path;
      user.publicId = req.file.filename;

      await user.save();

      req.flash("success", "Profile image updated");

      return res.redirect("/user/profile");
    } catch (err) {
      console.log(err);

      req.flash("error", err.message);

      return res.redirect("/user/profile");
    }
  }

  //logout
  async userLogout(req, res) {
    try {
      const refreshToken = req.cookies.userRefreshToken;

      console.log("TOKEN FROM COOKIE:", refreshToken);

      if (refreshToken) {
        const user = await UserModel.findOne({ refreshToken });

        console.log("USER FOUND:", user);

        if (user) {
          user.refreshToken = null;
          await user.save();
          console.log("TOKENS CLEARED IN DB");
        }
      }

      res.clearCookie("userAccessToken");
      res.clearCookie("userRefreshToken");

      req.flash("success", "Logged out Successfully");
      res.redirect("/user/login-view");
    } catch (error) {
      console.log("LOGOUT ERROR:", error.message);
      req.flash("error", error.message);
      res.redirect("/user/login-view");
    }
  }
}

module.exports = new userController();
