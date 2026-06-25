const jwt = require("jsonwebtoken");

const bcrypt = require("bcryptjs");

const cloudinary = require("cloudinary").v2;

const AdminModel = require("../models/admin");
const BlogModel = require("../models/blog");

const passwordGen = require("../utils/passwordGen");
const transporter = require("../config/emailConfig");

//unique secret key generator use at the time of log in
const apiKeyGen = require("../utils/apiKeyGen");

class adminController {
  async adminRegister(req, res) {
    try {
      const { adminName, email, password, phone } = req.body;
      const exists = await AdminModel.findOne({ email });
      if (exists) {
        req.flash("error", "Email already registered");
        return res.redirect("/admin/register-view");
        // return res.status(401).json({
        //   success: false,
        //   message: "Email already registered",
        // });
      }

      const hashed = await bcrypt.hash(password, 10);

      await AdminModel.create({
        adminName,
        email,
        password: hashed,
        phone,
        profileImage: req.file.path,
        publicId: req.file.filename,
      });
      req.flash("success", "Admin registered. Please login.");
      res.redirect("/admin/login-view");
      // return res.status(201).json({
      //   success: true,
      //   message: "admin created successfully",
      //   apiKey: ADMIN_BLOG_API_SECRET_KEY,
      // });
    } catch (err) {
      req.flash("error", err.message);
      console.log(err);
      res.redirect("/admin/register-view");
      //   return res.status(500).json({
      //     success: false,
      //     message: err.message,
      //   });
    }
  }

  async adminLogin(req, res) {
    try {
      console.log("admin:", req.admin);
      const { email, password } = req.body;

      //Validate
      if (!email || !password) {
        req.flash("error", "All input is required");
        return res.redirect("/admin/login-view");
      }

      //Find user
      const user = await AdminModel.findOne({ email });

      if (!user || user.role !== "admin") {
        req.flash(
          "error",
          "unauthorized access, please make sure you are login as ADMIN",
        );
        return res.redirect("/admin/login-view");
      }

      //Compare password
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        req.flash("error", "Invalid email or password");
        console.log("error", "Invalid email or password");
        return res.redirect("/admin/login-view");
      }

      // Tokens
      const adminAccessToken = jwt.sign(
        {
          adminName: user.adminName,
          userId: user._id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "1m" },
      );

      const adminRefreshToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_REFRESH_SECRET_KEY,
        { expiresIn: "7d" },
      );

      //Save refresh token
      user.refreshToken = adminRefreshToken;
      await user.save();

      //Cookies
      res.cookie("adminAccessToken", adminAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 1 * 60 * 1000,
      });

      res.cookie("adminRefreshToken", adminRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      req.flash("success", "Welcome to Admin Dashboard");

      return res.redirect("/admin/dashboard");
    } catch (error) {
      console.error("Admin Login Error:", error);

      req.flash("error", "Something went wrong");
      return res.redirect("/admin/login-view");
    }
  }

  // Blog CRUD operations
  async getBlogs(req, res) {
    try {
      const blogs = await BlogModel.aggregate([
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

        {
          $lookup: {
            from: "admins",
            localField: "author",
            foreignField: "_id",
            as: "adminAuthor",
          },
        },

        {
          $lookup: {
            from: "writers",
            localField: "author",
            foreignField: "_id",
            as: "writerAuthor",
          },
        },

        {
          $addFields: {
            author: {
              $cond: {
                if: { $eq: ["$authorModel", "Writer"] },
                then: {
                  _id: { $arrayElemAt: ["$writerAuthor._id", 0] },
                  name: { $arrayElemAt: ["$writerAuthor.writerName", 0] },
                },
                else: {
                  _id: { $arrayElemAt: ["$adminAuthor._id", 0] },
                  name: { $arrayElemAt: ["$adminAuthor.adminName", 0] },
                },
              },
            },

            totalComments: { $size: "$comments" },

            totalLikes: {
              $size: { $ifNull: ["$likes", []] },
            },
          },
        },

        {
          $project: {
            adminAuthor: 0,
            writerAuthor: 0,
          },
        },

        {
          $sort: {
            createdAt: -1,
          },
        },
      ]);

      return res.render("admin/blogs", {
        title: "Blogs",
        blogs,
        success: req.flash("success"),
        error: req.flash("error"),
      });
    } catch (err) {
      console.log(err);

      req.flash("error", err.message || "Something went wrong");

      return res.redirect("/admin/dashboard/blogs");
    }
  }

  async createBlog(req, res) {
    try {
      const { title, content, excerpt, category } = req.body;

      if (!title || !content || !excerpt || !category) {
        req.flash("error", "All fields are required");

        return res.redirect("/admin/dashboard/blogs");
      }

      if (!req.admin) {
        return res.redirect("/admin/login-view");
      }

      const admin = await AdminModel.findById(req.admin.userId);

      await BlogModel.create({
        title,
        content,
        excerpt,
        category,
        author: admin._id,
        authorModel: "admin",
        coverImage: req.file?.path,
        publicId: req.file?.filename,
      });

      req.flash("success", "Blog created successfully");

      return res.redirect("/admin/dashboard/blogs");
    } catch (err) {
      console.log(err);

      req.flash("error", err.message || "Something went wrong");

      return res.redirect("/admin/dashboard/blogs");
    }
  }

  async updateBlog(req, res) {
    try {
      const { id } = req.params;

      const blog = await BlogModel.findById(id);

      if (!blog) {
        req.flash("error", "Blog not found");

        return res.redirect("/admin/dashboard/blogs");
      }

      // OWNER CHECK
      if (blog.author.toString() !== req.admin.userId.toString()) {
        req.flash("error", "Unauthorized action");

        return res.redirect("/admin/dashboard/blogs");
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
          console.log("Cloudinary error:", err.message);

          req.flash("error", "Image upload failed");

          return res.redirect("/admin/dashboard/blogs");
        }
      }

      await blog.save();

      req.flash("success", "Blog updated successfully");

      return res.redirect("/admin/dashboard/blogs");
    } catch (err) {
      console.log(err);

      req.flash("error", err.message || "Something went wrong");

      return res.redirect("/admin/dashboard/blogs");
    }
  }

  async deleteBlog(req, res) {
    try {
      const { id } = req.params;

      const blog = await BlogModel.findById(id);

      if (!blog) {
        req.flash("error", "Blog not found");

        return res.redirect("/admin/dashboard/blogs");
      }

      // // OWNER CHECK
      // if (blog.author.toString() !== req.admin.userId.toString()) {
      //   req.flash("error", "Unauthorized action");

      //   return res.redirect("/admin/dashboard/blogs");
      // }

      // DELETE CLOUDINARY IMAGE
      if (blog.publicId) {
        await cloudinary.uploader.destroy(blog.publicId);
      }

      await BlogModel.findByIdAndDelete(id);

      req.flash("success", "Blog deleted successfully");

      return res.redirect("/admin/dashboard/blogs");
    } catch (err) {
      console.log(err);

      req.flash("error", err.message || "Something went wrong");

      return res.redirect("/admin/dashboard/blogs");
    }
  }

  async dashboard(req, res) {
    try {
      console.log("admin:", req.admin);
      return res.render("admin/dashboard");
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  async adminPasswordUpdate(req, res) {
    try {
      console.log(req.admin);
      const { currentPassword, newPassword } = req.body;

      // validate input
      if (!currentPassword || !newPassword) {
        req.flash("error", "all password field are required");
        return res.redirect("/admin/profile");
      }

      if (newPassword.length < 6) {
        req.flash("error", "New password must be at least 6 characters");
        return res.redirect("/admin/profile");
      }

      // get admin from DB
      const admin = await AdminModel.findById(req.admin.userId);

      if (!admin) {
        req.flash("error", "Admin not found");
        res.clearCookie("adminAccessToken");
        res.clearCookie("adminRefreshToken");
        res.clearCookie("apiKey");
        return res.redirect("/admin/login-view");
      }

      // compare current password
      const isMatch = await bcrypt.compare(currentPassword, admin.password);

      if (!isMatch) {
        req.flash("error", "Current password is incorrect");
        return res.redirect("/admin/profile");
      }

      // hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // update password
      admin.password = hashedPassword;
      await admin.save();

      req.flash("success", "Password updated successfully");
      return res.redirect("/admin/dashboard");
    } catch (err) {
      req.flash("error", err.message);

      res.redirect("/admin/profile");
    }
  }

  // toggle active/inactive
  async toggleWriterStatus(req, res) {
    try {
      const writer = await WriterModel.findById(req.params.id);

      if (!writer) {
        req.flash("error", "Writer not found");
        return res.redirect("/admin/writers");
      }

      writer.isActive = !writer.isActive;
      await writer.save();

      req.flash("success", "Writer status updated");
      return res.redirect("/admin/writers");
    } catch (error) {
      req.flash("error", "Something went wrong");
      return res.redirect("/admin/writers");
    }
  }

  // blog approve and reject by admin
  async approveAndPublishBlog(req, res) {
    try {
      const { blogId } = req.params;

      if (!req.admin || !req.admin.userId) {
        return res.status(401).json({ msg: "Unauthorized" });
      }

      if (!blogId) {
        return res.status(400).json({ msg: "Blog ID is required" });
      }

      const blog = await BlogModel.findById(blogId);

      if (!blog) {
        return res.status(404).json({ msg: "Blog not found" });
      }

      // only writer blogs need approval
      if (blog.authorModel !== "Writer") {
        return res.status(400).json({
          msg: "Only writer blogs need approval",
        });
      }

      // prevent re-approval
      if (blog.status === "published") {
        return res.status(400).json({
          msg: "Blog is already published",
        });
      }

      // handle rejected
      if (blog.status === "rejected") {
        return res.status(400).json({
          msg: "Rejected blogs cannot be published directly",
        });
      }

      blog.status = "published";
      blog.approvedBy = req.admin.userId;
      blog.publishedAt = new Date();

      await blog.save();

      return res.status(200).json({
        success: true,
        message: "Blog approved and published successfully",
        data: blog,
      });
    } catch (err) {
      console.error("APPROVAL ERROR:", err);
      return res.status(500).json({
        msg: "Failed to approve blog",
        error: err.message,
      });
    }
  }

  async rejectBlog(req, res) {
    try {
      const { blogId } = req.params;

      if (!req.admin || !req.admin.userId) {
        return res.status(401).json({ msg: "Unauthorized" });
      }

      const blog = await BlogModel.findById(blogId);

      if (!blog) {
        return res.status(404).json({ msg: "Blog not found" });
      }

      if (blog.authorModel !== "Writer") {
        return res.status(400).json({
          msg: "Only writer blogs can be rejected",
        });
      }

      if (blog.status === "published") {
        return res.status(400).json({
          msg: "Published blogs cannot be rejected",
        });
      }

      blog.status = "rejected";
      blog.approvedBy = req.admin.userId; // who rejected it

      await blog.save();

      req.flash("success", "Blog approved");

      return res.redirect("/admin/dashboard/blogs");
    } catch (err) {
      req.flash("error", err.message);
      return res.status(500).json({
        msg: "Failed to reject blog",
        error: err.message,
      });
    }
  }

  async updateProfileImage(req, res) {
    try {
      if (!req.file) {
        req.flash("error", "Please upload an image");

        return res.redirect("/admin/profile");
      }

      const admin = await AdminModel.findById(req.admin.userId);

      // delete old image
      if (admin.publicId) {
        await cloudinary.uploader.destroy(admin.publicId);
      }

      admin.profileImage = req.file.path;
      admin.publicId = req.file.filename;

      await admin.save();

      req.flash("success", "Profile image updated");

      return res.redirect("/admin/profile");
    } catch (err) {
      console.log(err);

      req.flash("error", err.message);

      return res.redirect("/admin/profile");
    }
  }

  //logout
  async adminLogout(req, res) {
    try {
      const refreshToken = req.cookies.adminRefreshToken;

      console.log("TOKEN FROM COOKIE:", refreshToken);

      if (refreshToken) {
        const admin = await AdminModel.findOne({ refreshToken });

        console.log("ADMIN FOUND:", admin);

        if (admin) {
          admin.refreshToken = null;
          admin.apiKey = null;
          await admin.save();
          console.log("TOKENS CLEARED IN DB");
        }
      }

      res.clearCookie("adminAccessToken");
      res.clearCookie("adminRefreshToken");
      res.clearCookie("apiKey");

      req.flash("success", "Logged out Successfully");
      res.redirect("/admin/login-view");
    } catch (error) {
      console.log("LOGOUT ERROR:", error);
      req.flash("error", error.message);
      res.redirect("/admin/login-view");
    }
  }
}

module.exports = new adminController();
