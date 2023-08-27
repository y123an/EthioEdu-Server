const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  userid: String,
  name: String,
  username: {
    type: String,
    unique: true,
  },
  email: {
    type: String,
    unique: true,
  },
  password: String,
  role: {
    type: String,
    default: "user",
  },
});

const UserModel = mongoose.model("users", UserSchema);

module.exports = UserModel;
