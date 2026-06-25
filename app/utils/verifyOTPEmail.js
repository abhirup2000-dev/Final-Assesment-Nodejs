const transporter = require("../config/emailConfig");

const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP for Login Verification",
    text: `Your OTP is: ${otp}. It is valid for 5 minutes.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("OTP Email sent successfully");
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw error;
  }
};

module.exports = sendOTPEmail;
