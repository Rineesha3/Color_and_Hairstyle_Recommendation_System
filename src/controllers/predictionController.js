const predictionService = require('../Services/predictionServices');

// Example route handler for processing the prediction
app.post('/predict-color', async (req, res) => {
  const { userId, imagePath, predictedColor, predictedHairstyle } = req.body;

  try {
    // Call the savePrediction function to store the prediction in the database
    await predictionService.savePrediction(userId, imagePath, predictedColor, predictedHairstyle);
    res.status(200).send('Prediction saved successfully');
  } catch (error) {
    res.status(500).send('Error saving prediction');
  }
});
