const crypto = require("crypto");

// Generate random password
function generatePassword() {
  // 8 bytes → 16 hex characters
  return crypto.randomBytes(8).toString("hex");
}

module.exports = generatePassword;
