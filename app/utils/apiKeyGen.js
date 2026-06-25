const crypto = require("crypto");

// Generate random password
function generatePassword() {
  // 8-character password
  return crypto.randomBytes(6).toString("hex");
}

module.exports = generatePassword();