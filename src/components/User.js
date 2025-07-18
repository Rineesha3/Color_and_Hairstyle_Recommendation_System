const mongoose = require('mongoose');

// Define the user schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // Ensure usernames are unique
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, // Ensure email addresses are unique
    validate: {
      validator: function (email) {
        // Regex to validate email format
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: (props) => `${props.value} is not a valid email address!`,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set to the current date
  },
  history: [
    {
      image: String, // Path to uploaded image (or URL if saved on a server)
      color: String, // RGB value (or any other format you choose)
      hairstyle: String, // URL to hairstyle image (or other identifier)
      createdAt: { type: Date, default: Date.now } // Timestamp when the record was created
    }
  ],
});

// Create the user model
const User = mongoose.model('User', userSchema);

// Export the model for use in other parts of the app
module.exports = User;
