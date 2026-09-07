import logging
import uuid
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import tensorflow as tf
import numpy as np
import os
import io
import random
from PIL import Image
from werkzeug.utils import secure_filename
from keras._tf_keras.keras.models import load_model
from keras._tf_keras.keras.preprocessing import image as keras_image
from keras._tf_keras.keras.preprocessing.image import load_img, img_to_array

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def save_upload(file):
    ext = secure_filename(file.filename).rsplit('.', 1)[-1].lower()
    safe_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join('uploads', safe_name)
    file.save(file_path)
    return file_path


def apply_csp(response):
    response.headers['Content-Security-Policy'] = "default-src 'self'; connect-src 'self' http://localhost:5001"
    return response

app = Flask(__name__)
# Only the Node backend (port 3001) should be able to call this API directly.
CORS(app, origins=['http://localhost:3001'])
app.config['MAX_CONTENT_LENGTH'] = 8 * 1024 * 1024  # 8 MB upload cap


@app.errorhandler(413)
def handle_file_too_large(e):
    return jsonify({'error': 'File too large. Max upload size is 8MB.'}), 413

# === Load Models ===
color_model_path = 'model/model1.h5'
color_model = load_model(color_model_path)

hairstyle_model_path = 'model/hairstyle_model_v2.h5'
hairstyle_model = load_model(hairstyle_model_path)

# === Face shapes list ===
# Matches class_names from keras.utils.image_dataset_from_directory on
# dataset/FaceShape Dataset (alphabetical folder order) — see train_hairstyle.py.
face_shapes = ['heart', 'oblong', 'oval', 'round', 'square']

# === Color Prediction Helper ===
def preprocess_color_image(img_path):
    img = keras_image.load_img(img_path, target_size=(224, 224))
    img_array = keras_image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)
    return img_array

@app.route('/predict_color', methods=['POST'])
def predict_color():
    file_path = None
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400

        file = request.files['image']
        if not file.filename or not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Allowed: png, jpg, jpeg'}), 400

        file_path = save_upload(file)

        img_array = preprocess_color_image(file_path)
        skin_tone = request.form.get('skin_tone', 1, type=int)
        skin_tone_feature = np.array([[skin_tone]])
        prediction = color_model.predict([img_array, skin_tone_feature])
        color = prediction[0] * 255
        color = np.clip(color, 0, 255).astype(int).tolist()

        return jsonify({'predicted_color': color})

    except Exception as e:
        logger.exception('predict_color failed')
        return jsonify({'error': 'Failed to predict color'}), 500
    finally:
        # This is Flask's own scratch copy for model input, never referenced
        # afterward (Node keeps its own copy for user history) — always safe to remove.
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

# === Hairstyle Prediction Helper ===
def preprocess_hairstyle_image(img_path):
    img = load_img(img_path, target_size=(224, 224))
    img_array = img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)
    return img_array

@app.route('/predict_hairstyle', methods=['POST'])
def predict_hairstyle():
    file_path = None
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400

        file = request.files['image']
        if not file.filename or not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Allowed: png, jpg, jpeg'}), 400

        file_path = save_upload(file)

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
        logger.exception('predict_hairstyle failed')
        return jsonify({'error': 'Failed to predict hairstyle'}), 500
    finally:
        # Flask's own scratch copy for model input only — the returned
        # image lives in static/hair_dataset and must not be touched here.
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

# === Run Server ===
if __name__ == '__main__':
    os.makedirs('uploads', exist_ok=True)
    debug_mode = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(port=5001, debug=debug_mode)
