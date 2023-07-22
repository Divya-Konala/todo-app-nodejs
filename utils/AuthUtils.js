const validator = require("validator");

const cleanUpAndValidate = ({ name, email, password, username }) => {
  return new Promise((resolve, reject) => {
    if (!name || !email || !password || !username) {
      reject("Missing Credentials");
    } else if (typeof email !== "string") {
      reject("Invalid email");
    } else if (typeof password !== "string") {
      reject("Invalid password");
    } else if (typeof username !== "string") {
      reject("Invalid username");
    } else if (password.length <= 2 || password.length > 25) {
      reject("password length should be 3-25");
    } else if (username.length <= 2 || username.length > 50) {
      reject("username length should be 3-50");
    } else if (!validator.isEmail(email)) {
      reject("email format invalid");
    } else {
      resolve();
    }
  });
};

module.exports = { cleanUpAndValidate };
