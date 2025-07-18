const User = require('./components/User');

// Example function to save a prediction result
async function savePrediction(userId, imagePath, predictedColor, predictedHairstyle) {
  try {
    // Create a new prediction record
    const newPrediction = {
      image: imagePath,
      color: predictedColor,  // RGB or any color format
      hairstyle: predictedHairstyle,  // URL or identifier of the hairstyle image
    };

    // Find the user and update the history
    await User.findByIdAndUpdate(userId, {
      $push: { history: newPrediction },
    });

    console.log('Prediction saved successfully');
  } catch (error) {
    console.error('Error saving prediction:', error);
  }
}

module.exports = {
  savePrediction,
};
