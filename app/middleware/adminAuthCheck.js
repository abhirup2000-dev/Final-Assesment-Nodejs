const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const AdminModel = require("../models/admin");

const adminAuthCheck = async (req, res, next) => {
  const accessToken = req.cookies?.adminAccessToken;
  const refreshToken = req.cookies?.adminRefreshToken;

  //  No tokens at all
  if (!accessToken && !refreshToken) {
    return res.redirect("/admin/login-view");
  }

  //  Try ACCESS TOKEN
  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET_KEY);

      req.admin = decoded;
      return next();
    } catch (err) {
      // expired → move to refresh
    }
  }

  //  Try REFRESH TOKEN
  if (!refreshToken) {
    return res.redirect("/admin/login-view");
  }

  try {
    const decodedRefresh = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET_KEY,
    );

    const user = await AdminModel.findById(decodedRefresh.userId);

    // check refreshtoken and user
    if (!user || !bcrypt.compare(refreshToken, user.refreshToken)) {
      res.clearCookie("adminAccessToken");
      res.clearCookie("adminRefreshToken");
      return res.redirect("/admin/login-view");
    }

    // Generate NEW access token
    const newAccessToken = jwt.sign(
      {
        adminName: user.adminName,
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1m" },
    );

    //  Set new access token
    res.cookie("adminAccessToken", newAccessToken, {
      httpOnly: true,
      maxAge: 1 * 60 * 1000,
    });

    req.admin = {
      adminName: user.adminName,
      userId: user._id,
      email: user.email,
      role: user.role,
    }; //pass user data to admin

    return next();
  } catch (error) {
    res.clearCookie("adminAccessToken");
    res.clearCookie("adminRefreshToken");
    return res.redirect("/admin/login-view");
  }
};

module.exports = adminAuthCheck