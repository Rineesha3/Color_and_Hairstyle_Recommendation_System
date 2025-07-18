from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import tensorflow as tf
import numpy as np
import os
import io
import random
from PIL import Image
from keras._tf_keras.keras.models import load_model
from keras._tf_keras.keras.preprocessing import image as keras_image
from keras._tf_keras.keras.preprocessing.image import load_img, img_to_array


def apply_csp(response):
    response.headers['Content-Security-Policy'] = "default-src 'self'; connect-src 'self' http://localhost:5000"
    return response

app = Flask(__name__)
CORS(app)  # Enable CORS to allow requests from port 3000

# === Load Models ===
color_model_path = 'model/model1.h5'
color_model = load_model(color_model_path)

hairstyle_model_path = 'model/sequential_3.h5'
hairstyle_model = load_model(hairstyle_model_path)

# === Face shapes list ===
face_shapes = ['round', 'square', 'oval', 'heart', 'oblong']

# === Color Prediction Helper ===
def preprocess_color_image(img_path):
    img = keras_image.load_img(img_path, target_size=(224, 224))
    img_array = keras_image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)
    return img_array

@app.route('/predict_color', methods=['POST'])
def predict_color():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400
        
        file = request.files['image']
        file_path = os.path.join('uploads', file.filename)
        file.save(file_path)

        img_array = preprocess_color_image(file_path)
        skin_tone_feature = np.array([[1]])  # Modify if you want dynamic tone
        prediction = color_model.predict([img_array, skin_tone_feature])
        color = prediction[0] * 255
        color = np.clip(color, 0, 255).astype(int).tolist()

        return jsonify({'predicted_color': color})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# === Hairstyle Prediction Helper ===
def preprocess_hairstyle_image(img_path):
    img = load_img(img_path, target_size=(150, 150))
    img_array = img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

@app.route('/predict_hairstyle', methods=['POST'])
def predict_hairstyle():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400
        
        file = request.files['image']
        file_path = os.path.join('uploads', file.filename)
        file.save(file_path)

        img_array = preprocess_hairstyle_image(file_path)
        predictions = hairstyle_model.predict(img_array)
        predicted_label = np.argmax(predictions)
        face_shape = face_shapes[predicted_label]

        folder_path = os.path.join('static', 'hair_dataset', face_shape.lower())
        if not os.path.exists(folder_path):
            return jsonify({'error': f"No hairstyle images for {face_shape}"}), 404

        hairstyle_images = [img for img in os.listdir(folder_path)
                            if os.path.isfile(os.path.join(folder_path, img))]
        if not hairstyle_images:
            return jsonify({'error': 'No images found in hairstyle folder'}), 404

        selected_image = random.choice(hairstyle_images)
        image_path = os.path.join(folder_path, selected_image)

        # Return image as binary (PNG)
        return send_file(image_path, mimetype='image/png')
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# === Run Server ===
if __name__ == '__main__':
    os.makedirs('uploads', exist_ok=True)
    app.run(port=5000, debug=True)
