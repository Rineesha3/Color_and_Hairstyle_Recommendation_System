import tensorflow as tf
import numpy as np
from keras._tf_keras.keras.models import load_model
from keras._tf_keras.keras.preprocessing.image import load_img, img_to_array
import os
import matplotlib.pyplot as plt
import random

# Load the saved model
model_path = 'model/sequential_3.h5'  # Ensure this is the correct full model path
model = load_model(model_path)

face_shapes = ['round', 'square', 'oval', 'heart', 'oblong']

# Define image size
image_size = (150, 150)

# Preprocess image function
def preprocess_image(img_path, target_size=(150, 150)):
    img = load_img(img_path, target_size=target_size)
    img_array = img_to_array(img) / 255.0  # Normalize
    img_array = np.expand_dims(img_array, axis=0)  # Add batch dimension
    return img_array

# Predict face shape
def predict_face_shape(img_path):
    img_array = preprocess_image(img_path, target_size=image_size)
    predictions = model.predict(img_array)
    predicted_label = np.argmax(predictions)
    predicted_face_shape = face_shapes[predicted_label]
    return predicted_face_shape

# Display the hairstyle
def display_hairstyle(predicted_face_shape):
    # Construct path dynamically based on predicted face shape
    base_dir = 'static/hair_dataset'
    folder_name = predicted_face_shape.lower()  # 'Round' -> 'round'
    hairstyle_image_path = os.path.join(base_dir, folder_name)

    if os.path.exists(hairstyle_image_path):
        hairstyle_images = [f for f in os.listdir(hairstyle_image_path)
                            if os.path.isfile(os.path.join(hairstyle_image_path, f))]
        if hairstyle_images:
            random_hairstyle_image = os.path.join(hairstyle_image_path, random.choice(hairstyle_images))
            img = plt.imread(random_hairstyle_image)
            plt.imshow(img)
            plt.axis('off')  # Hide axis
            plt.title(f"Recommended Hairstyle for {predicted_face_shape} Face")
            plt.show()
        else:
            print(f"No hairstyle images found in folder: {hairstyle_image_path}")
    else:
        print(f"Folder not found for face shape: {predicted_face_shape}")

# Main function to predict face shape and display hairstyle
def predict_and_display(img_path):
    predicted_face_shape = predict_face_shape(img_path)
    print(f"Predicted Face Shape: {predicted_face_shape}")
    display_hairstyle(predicted_face_shape)

# Example usage
img_path = r'D:/Downloads/send/Backend/static/images/square.png'
predict_and_display(img_path)
