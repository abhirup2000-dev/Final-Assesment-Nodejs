const mongoose = require("mongoose");
const AdminModel = require("../models/admin");
const BlogModel = require("../models/blog");
const UserModel = require("../models/user");

class viewController {
  //ADMIN Pages
  async adminLoginView(req, res) {
    try {
      return res.render("admin/login");
    } catch (error) {
      req.flash("error", error);
      res.redirect("/admin/login-view");
    }
  }

  async adminRegisterView(req, res) {
    try {
      return res.render("admin/register", {
        title: "Admin Registration Page",
      });
    } catch (error) {
      req.flash("error", error);
      return res.redirect("/admin/register-view", {});
    }
  }

  async adminRegister(req, res) {
    return res.render("admin/register");
  }

  async adminDashboardPage(req, res) {
    try {
      const blogs = await BlogModel.find();
      const users = await UserModel.find();

      console.log(req.admin);

      return res.render("admin/dashboard", {
        title: "Admin Dashboard",
        blogs,
        users,
        admin: req.admin,
      });
    } catch (error) {
      return res.render("404");
    }
  }

  async adminBlogsPage(req, res) {
    const blogs = await BlogModel.aggregate([
      //join comments by users on blogs
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
                  email: "$user.email",
                },
              },
            },
          ],
          as: "comments",
        },
      },

      // join author(admin or writer)
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
                role: { $arrayElemAt: ["$writerAuthor.role", 0] },
                apiKey: { $arrayElemAt: ["$writerAuthor.apiKey", 0] },
              },
              else: {
                _id: { $arrayElemAt: ["$adminAuthor._id", 0] },
                name: { $arrayElemAt: ["$adminAuthor.adminName", 0] },
                role: { $arrayElemAt: ["$adminAuthor.role", 0] },
              },
            },
          },

          totalComments: { $size: "$comments" },
          totalLikes: { $size: { $ifNull: ["$likes", []] } },
        },
      },
      {
        $project: {
          adminAuthor: 0,
          writerAuthor: 0,
        },
      },

      {
        $project: {
          authorInfo: 0,
        },
      },

      // sort
      { $sort: { createdAt: -1 } },
    ]);
    return res.render("admin/blogs", {
      title: "Admin Dashboard",
      blogs,
      admin: req.admin,
    });
  }

  async adminprofile(req, res) {
    try {
      const admin = await AdminModel.findById(req.admin.userId);
      return res.render("admin/profile", {
        title: "Admin Profile",
        admin,
      });
    } catch (error) {
      return res.redirect("/admin/error404");
    }
  }

  async adminWritersPage(req, res) {
    try {
      const writers = await WriterModel.aggregate([
        {
          $lookup: {
            from: "Blogs",
            localField: "_id",
            foreignField: "author",
            as: "authorblogs",
          },
        },
      ]);

      return res.render("admin/writers", {
        title: "Manage Writers",
        writers,
        user: req.admin, // or req.user if needed
      });
    } catch (error) {
      req.flash("error", "Failed to load writers page");
      return res.redirect("/admin/dashboard");
    }
  }

  async fullBlogView(req, res) {
    try {
      const { id } = req.params;

      const blogData = await BlogModel.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(id),
          },
        },

        // COMMENTS + USER
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

        // ADMIN AUTHOR
        {
          $lookup: {
            from: "admins",
            localField: "author",
            foreignField: "_id",
            as: "adminAuthor",
          },
        },

        // WRITER AUTHOR
        {
          $lookup: {
            from: "writers",
            localField: "author",
            foreignField: "_id",
            as: "writerAuthor",
          },
        },

        // MERGE AUTHOR
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
            totalLikes: { $size: { $ifNull: ["$likes", []] } },
          },
        },

        {
          $project: {
            adminAuthor: 0,
            writerAuthor: 0,
          },
        },
      ]);

      if (!blogData.length) {
        return res.redirect("/admin/dashboard/blogs");
      }

      const blog = blogData[0];

      return res.render("admin/viewBlog", {
        title: blog.title,
        blog,
      });
    } catch (err) {
      console.error("VIEW BLOG ERROR:", err);
      return res.redirect("/admin/dashboard/blogs");
    }
  }

  //USER Pages
  async userLoginPage(req, res) {
    return res.render("user/login", {
      title: "User Login Page",
    });
  }

  async userRegisterPage(req, res) {
    try {
      return res.render("user/register", {
        title: "User Registration Page",
      });
    } catch (error) {
      req.flash("error", "Something went wrong");
      return res.redirect("/user/login-view");
    }
  }

  async userHomePage(req, res) {
    try {
      const { search = "" } = req.query;

      const matchStage = {
        status: "published",
      };

      if (search) {
        matchStage.title = { $regex: search, $options: "i" };
      }

      const blogs = await BlogModel.aggregate([
        // MATCH PUBLISHED & NOT DELETED
        {
          $match: {
            isDeleted: { $eq: false }
          }
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

        // ONLY COUNT COMMENTS (NO FULL DATA)
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
                $count: "count",
              },
            ],
            as: "commentData",
          },
        },

        // ADD COUNTS
        {
          $addFields: {
            totalComments: {
              $ifNull: [{ $arrayElemAt: ["$commentData.count", 0] }, 0],
            },
            totalLikes: {
              $size: { $ifNull: ["$likes", []] },
            },
          },
        },

        {
          $project: {
            commentData: 0,
          },
        },

        {
          $sort: { createdAt: -1 },
        },
      ]);

      // GLOBAL STATS (optional keep same)
      const totalBlogs = await BlogModel.countDocuments({
        status: "published",
      });

      const totalLikesAgg = await BlogModel.aggregate([
        { $match: { status: "published" } },
        {
          $project: {
            likesCount: { $size: { $ifNull: ["$likes", []] } },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$likesCount" },
          },
        },
      ]);

      const totalLikes = totalLikesAgg[0]?.total || 0;

      return res.render("user/home", {
        title: "Home",
        user: req.user,
        blogs,
        search,
        stats: {
          totalBlogs,
          totalLikes,
        },
      });
    } catch (error) {
      console.log(error);
      return res.redirect("/user/login-view");
    }
  }

  async userprofile(req, res) {
    try {
      const user = await UserModel.findById(req.user.userId);
      console.log("user", user);
      return res.render("user/profile", {
        title: "User Profile",
        user,
      });
    } catch (error) {
      console.log(err.message);
      return res.redirect("/user/home");
    }
  }

  async userBlogsPage(req, res) {
    const blogs = await BlogModel.aggregate([
      // ONLY USER'S OWN BLOGS & NOT DELETED
      {
        $match: {
          author: new mongoose.Types.ObjectId(req.user.userId),
          isDeleted: { $ne: true }
        }
      },
      // JOIN COMMENTS
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
                  email: "$user.email",
                },
              },
            },
          ],
          as: "comments",
        },
      },

      // ADMIN AUTHOR
      {
        $lookup: {
          from: "admins",
          localField: "author",
          foreignField: "_id",
          as: "adminAuthor",
        },
      },

      // USER AUTHOR
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "userAuthor",
        },
      },

      // AUTHOR + STATS
      {
        $addFields: {
          author: {
            $cond: {
              if: { $in: ["$authorModel", ["User", "user"]] },

              then: {
                _id: { $arrayElemAt: ["$userAuthor._id", 0] },

                // FIXED HERE
                name: { $arrayElemAt: ["$userAuthor.userName", 0] },

                role: { $arrayElemAt: ["$userAuthor.role", 0] },
              },

              else: {
                _id: { $arrayElemAt: ["$adminAuthor._id", 0] },

                // FIXED HERE
                name: { $arrayElemAt: ["$adminAuthor.adminName", 0] },

                role: { $arrayElemAt: ["$adminAuthor.role", 0] },
              },
            },
          },

          totalComments: { $size: "$comments" },

          totalLikes: {
            $size: {
              $ifNull: ["$likes", []],
            },
          },
        },
      },

      {
        $project: {
          adminAuthor: 0,
          userAuthor: 0,
        },
      },

      // SORT
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    console.log(JSON.stringify(blogs[0], null, 2));
    console.log(req.user);

    return res.render("user/blogs", {
      title: "User Dashboard",
      blogs,
      user: req.user,
    });
  }

  async userFullBlogView(req, res) {
    try {
      const userId = req.user?.userId;
      const blogId = req.params.id;

      if (!userId) {
        req.flash("error", "Login required");
        return res.redirect("/user/login-view");
      }

      if (!blogId) {
        req.flash("error", "Blog not found");
        return res.redirect("/user/home");
      }

      // user info
      const user = await UserModel.findById(userId).select("userName email");

      // blog aggregation
      const blogData = await BlogModel.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(blogId),
          },
        },

        // author
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

        // join comments
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

              // join each user for comment
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

              // project comments properly
              {
                $project: {
                  _id: 1,
                  content: 1,
                  createdAt: 1,
                  user: {
                    _id: "$user._id",
                    userName: "$user.userName",
                  },
                },
              },

              // newest first
              {
                $sort: { createdAt: -1 },
              },
            ],
            as: "comments",
          },
        },

        // count likes and comments
        {
          $addFields: {
            totalComments: { $size: "$comments" },
            totalLikes: { $size: { $ifNull: ["$likes", []] } },
          },
        },

        // output
        {
          $project: {
            title: 1,
            content: 1,
            coverImage: 1,
            category: 1,
            createdAt: 1,
            likes: 1,
            comments: 1,
            author: 1,
            totalComments: 1,
            totalLikes: 1,
          },
        },
      ]);

      const blog = blogData[0];

      if (!blog) {
        req.flash("error", "Blog not found");
        return res.redirect("/user/home");
      }

      return res.render("user/viewBlog", {
        title: blog.title,
        user,
        blog,
      });
    } catch (err) {
      console.log("USER BLOG VIEW ERROR:", err);
      req.flash("error", "Server error");
      return res.redirect("/user/home");
    }
  }
}

module.exports = new viewController();
