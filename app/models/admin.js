const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema(
  {
    adminName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    profileImage:{ type: String, default: "" },
    publicId:{ type: String, default: null },
    role: { type: String, enum: ["admin"], default: "admin" },
    apiKey: { type: String, default: null },
    isActive: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    refreshToken: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);

const Adminmodel = mongoose.model("admin", AdminSchema);

module.exports = Adminmodel;
