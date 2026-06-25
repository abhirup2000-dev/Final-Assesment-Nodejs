const User = require("../models/user");
const jwt = require("jsonwebtoken");

const UserAuthCheck = async (req, res, next) => {
  const accessToken = req.cookies?.userAccessToken;
  const refreshToken = req.cookies?.userRefreshToken;

  //  No tokens at all
  if (!accessToken && !refreshToken) {
    return res.redirect("/user/login-view");
  }

  //  Try ACCESS TOKEN
  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET_KEY);

      req.user = decoded;
      return next();
    } catch (err) {
      // expired → move to refresh
    }
  }

  //  Try REFRESH TOKEN
  if (!refreshToken) {
    return res.redirect("/user/login-view");
  }

  try {
    const decodedRefresh = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET_KEY,
    );

    const user = await User.findById(decodedRefresh.userId);

    //  Token mismatch check token available
    if (!user || user.refreshToken !== refreshToken) {
      res.clearCookie("userAccessToken");
      res.clearCookie("userRefreshToken");
      return res.redirect("/user/login-view");
    }

    // Generate NEW access token
    const newAccessToken = jwt.sign(
      {
        userId: user._id,
        userName: user.userName,
        email: user.email,
        isActive: user.isActive,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1m" },
    );

    //  Set new access token
    res.cookie("userAccessToken", newAccessToken, {
      httpOnly: true,
      maxAge: 1 * 60 * 1000,
    });

    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
    };

    return next();
  } catch (error) {
    res.clearCookie("userAccessToken");
    res.clearCookie("userRefreshToken");
    return res.redirect("/user/login-view");
  }
};

module.exports = UserAuthCheck;
