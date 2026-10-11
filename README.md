# Color and Hairstyle Recommendation System

Recommends a clothing color for your skin tone and a hairstyle for your face shape from a single photo.

## Project Overview

Users upload a photo of their face. A deep learning model suggests a clothing color that suits their skin tone, and a face-shape classifier recommends a matching hairstyle. The models run on a Python/Flask service, while a Node.js/Express server handles the web pages, user accounts and prediction history.

## Key Features

- Clothing color recommendation based on skin tone
- Face shape detection (heart, oblong, oval, round, square) with a matching hairstyle
- User sign-up and login
- Prediction history saved for each user
- Uploaded photos stored on Cloudinary

## Technology Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express, MongoDB
- **Machine Learning:** Python, Flask, TensorFlow, Keras, MobileNetV2
- **Storage:** Cloudinary

## Installation and Setup

### Prerequisites
- Python 3
- Node.js and npm
- MongoDB database
- Cloudinary account
- Trained model files `model1.h5` and `hairstyle_model_v2.h5` in the `model/` folder (not included in the repo)

### Flask Model Service

```bash
git clone https://github.com/Rineesha3/Color_and_Hairstyle_Recommendation_System.git
cd Color_and_Hairstyle_Recommendation_System
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python app.py
```

The service runs on `http://localhost:5001`.

### Node Server

Create a `.env` file in the project root:
```
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

```bash
npm install
npm start
```

The app runs on `http://localhost:3001`. Keep the Flask service running alongside it.