const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    userName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    phone: { type: Number, required: true },
    profileImage:{ type: String, default: "" },
    publicId:{ type: String, default: null },
    role: { type: String, enum: ["user"], default: "user" },
    isActive: { type: Boolean, default: true },
    isVerified:{ type: Boolean, default: false },
    refreshToken: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);

const UserModel = mongoose.model("user", UserSchema);

module.exports = UserModel;
