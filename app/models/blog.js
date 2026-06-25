const mongoose = require("mongoose");

const BlogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    excerpt: { type: String, trim: true, default: "" },
    category: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ["draft", "pending", "published", "rejected"],
      default: "draft",
    },
    // Author can be Admin or Writer
    author: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "authorModel",
    },
    authorModel: {
      type: String,
      required: true,
      enum: ["admin", "user"],
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    publishedAt: { type: Date, default: null },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    coverImage:{
      type: String,
      default: ""
    },
    publicId:{
      type: String,
      default: null
    },
    isDeleted:{
      type: Boolean,
      default: false
    },
    deletedAt:{
      type: Date,
      default: null
    }
  },
  { timestamps: true, versionKey: false },
);

// Virtual for like count
BlogSchema.virtual("likeCount").get(function () {
  return this.likes.length;
});

const BlogModel = mongoose.model("blog", BlogSchema);

module.exports = BlogModel 
