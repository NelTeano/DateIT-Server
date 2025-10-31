import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String },
  age: { type: Number },
  photoUrl: { type: String },
  gender: { 
    type: String, 
    required: true,
    enum: ["male", "female", "non-binary", "other"]
  },
  findGender: { 
    type: String, 
    required: true,
    enum: ["male", "female", "non-binary", "other", "everyone"]
  },
  likedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  passedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  matches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Match" }],
}, { timestamps: true });

userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;