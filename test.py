import tensorflow as tf
import numpy as np
from keras._tf_keras.keras.models import load_model
from keras._tf_keras.keras.preprocessing import image

# Load the model from the local file path
model_path = r'model/model1.h5'
model = load_model(model_path)

# Preprocessing function (same as used during training)
def preprocess_image(img_path):
    img = image.load_img(img_path, target_size=(224, 224))  # Resize the image
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)
    return img_array

# Prediction function
def predict_suitable_color(img_path):
    img_array = preprocess_image(img_path)
    skin_tone_feature = np.array([[1]])  # Assume tanned for this example; use [[0]] for fair
    prediction = model.predict([img_array, skin_tone_feature])
    color = prediction[0] * 255  # Convert back to 0-255 range
    color = np.clip(color, 0, 255).astype(int)
    return color

# Example usage
image_path = r'D:\Downloads\send\Backend\static\images\round.png'  # Replace with your test image path
predicted_color = predict_suitable_color(image_path)
print("Predicted Color:", predicted_color)
