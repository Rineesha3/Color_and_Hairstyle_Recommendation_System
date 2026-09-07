require('dotenv').config({ quiet: true });
require('dns').setServers(['8.8.8.8']); // local ISP DNS fails mongodb+srv SRV lookups
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const User = require('./src/components/User');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');
const FormData = require('form-data');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function uploadBufferToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}

const app = express();

// Set security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", "http://localhost:5001"],
        imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
// Preserve the original extension on disk so stored uploads have a correct
// content-type when served back (e.g. for history thumbnails).
const uploadStorage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});
const upload = multer({ storage: uploadStorage, limits: { fileSize: 8 * 1024 * 1024 } }); // 8 MB cap

// Session setup
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is not set in .env');
}
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 3600000,
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

// MongoDB connection. Errors are logged rather than left to crash the process —
// this network has intermittent TLS/DNS issues reaching Atlas (see dns.setServers
// above), and a transient blip shouldn't take the whole server down.
mongoose.connect(process.env.MONGO_URI).catch((err) => {
  console.error('MongoDB initial connection error:', err.message);
});
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
});

// Serve static files
app.use(express.static('public'));
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/src', express.static(path.join(__dirname, 'src')));

// Routes
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/signup.html'));
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      req.session.user = { id: user._id, email: user.email, username: user.username };
      res.json({ redirect: '/home' });
    } else {
      res.status(401).json({ errors: { general: 'Invalid email or password.' } });
    }
  } catch (error) {
    res.status(500).json({ errors: { general: 'An error occurred during login.' } });
  }
});

const PASSWORD_MIN_LENGTH = 8;

function isPasswordStrongEnough(password) {
  return (
    typeof password === 'string' &&
    password.length >= PASSWORD_MIN_LENGTH &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

app.post('/signup', async (req, res) => {
  const { email, username, password } = req.body;
  console.log("Signup Request:", { email, username }); // ✅ Log input (password omitted)

  try {
    if (!isPasswordStrongEnough(password)) {
      return res.status(400).json({
        errors: {
          password: `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include at least one letter and one number.`,
        },
      });
    }

    // Check email and username for conflicts separately so each error can be
    // pinned to the field it actually belongs to, instead of one generic message.
    const [emailUser, usernameUser] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ username }),
    ]);
    if (emailUser || usernameUser) {
      console.log("Signup failed: Duplicate email or username"); // ✅ Log
      const errors = {};
      if (emailUser) errors.email = 'An account with this email already exists.';
      if (usernameUser) errors.username = 'This username is already taken.';
      return res.status(409).json({ errors });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, username, password: hashedPassword });

    await newUser.save();
    console.log("New user created:", newUser); // ✅ Log
    res.json({ redirect: '/login?signup=success' });

  } catch (error) {
    console.error("Signup error:", error); // ✅ Log full error

    if (error.name === 'ValidationError') {
      const errors = {};
      for (const [field, err] of Object.entries(error.errors)) {
        errors[field] = err.message;
      }
      return res.status(400).json({ errors });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'general';
      return res.status(400).json({ errors: { [field]: `This ${field} is already taken.` } });
    }

    res.status(500).json({ errors: { general: 'Signup failed. Please try again.' } });
  }
});


app.get('/api/session', (req, res) => {
  res.json({
    loggedIn: !!req.session.user,
    username: req.session.user ? req.session.user.username : null,
  });
});

function isAuthenticated(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}

app.get('/home', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/home.html'));
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Logout failed.');
    }
    res.redirect('/');
  });
});

// Forwards the Flask model service's actual status/error message when it rejects
// a request, instead of masking every failure as a generic 500.
function forwardModelServiceError(error, res) {
  if (error.response) {
    let data = error.response.data;
    if (Buffer.isBuffer(data)) {
      try {
        data = JSON.parse(data.toString('utf8'));
      } catch {
        data = { error: 'Model service request failed' };
      }
    }
    return res.status(error.response.status).json(data);
  }
  return res.status(502).json({ error: 'Model service is unavailable' });
}

app.post('/predict_color', upload.single('image'), async (req, res) => {
  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(req.file.path), req.file.originalname);

    const response = await axios.post('http://localhost:5001/predict_color', formData, {
      headers: { ...formData.getHeaders() },
    });

    const { predicted_color } = response.data;

    if (req.session.user) {
      // Uploaded to Cloudinary for history viewing; local temp copy is no longer needed either way.
      const uploaded = await cloudinary.uploader.upload(req.file.path, { folder: 'stylesync/history' });
      const user = await User.findById(req.session.user.id);
      user.history.push({ image: uploaded.secure_url, color: `rgb(${predicted_color.join(',')})` });
      await user.save();
    }
    fs.unlink(req.file.path, () => {});

    res.json(response.data);
  } catch (error) {
    fs.unlink(req.file.path, () => {});
    forwardModelServiceError(error, res);
  }
});

app.post('/predict_hairstyle', upload.single('image'), async (req, res) => {
  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(req.file.path), req.file.originalname);

    const response = await axios.post('http://localhost:5001/predict_hairstyle', formData, {
      headers: { ...formData.getHeaders() },
      responseType: 'arraybuffer',
    });

    const buffer = Buffer.from(response.data, 'binary');

    if (req.session.user) {
      // Both the upload and the result are stored on Cloudinary for history viewing.
      const [uploadedImage, uploadedResult] = await Promise.all([
        cloudinary.uploader.upload(req.file.path, { folder: 'stylesync/history' }),
        uploadBufferToCloudinary(buffer, 'stylesync/history'),
      ]);
      const user = await User.findById(req.session.user.id);
      user.history.push({ image: uploadedImage.secure_url, hairstyle: uploadedResult.secure_url });
      await user.save();
    }
    fs.unlink(req.file.path, () => {});

    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (error) {
    fs.unlink(req.file.path, () => {});
    forwardModelServiceError(error, res);
  }
});

app.get('/history', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/history.html'));
});

// Older entries (pre-Cloudinary) store a bare local filename; newer ones store a
// full Cloudinary URL directly. Route each through the right serving path.
function resolveHistoryFileUrl(value) {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `/history-file/${encodeURIComponent(value)}`;
}

app.get('/api/history', isAuthenticated, async (req, res) => {
  const user = await User.findById(req.session.user.id);
  const entries = user.history
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((h) => ({
      createdAt: h.createdAt,
      type: h.hairstyle ? 'hairstyle' : 'color',
      color: h.color || null,
      imageUrl: resolveHistoryFileUrl(h.image),
      hairstyleUrl: resolveHistoryFileUrl(h.hairstyle),
    }));
  res.json({ history: entries });
});

// Serves a stored upload/result file, but only to the user whose history references it —
// prevents one user viewing another's photos by guessing a filename.
app.get('/history-file/:filename', isAuthenticated, async (req, res) => {
  const { filename } = req.params;
  if (!/^[A-Za-z0-9._-]+$/.test(filename)) {
    return res.status(400).send('Invalid filename');
  }

  const user = await User.findById(req.session.user.id);
  const owned = user.history.some((h) => h.image === filename || h.hairstyle === filename);
  if (!owned) {
    return res.status(403).send('Forbidden');
  }

  res.sendFile(path.join(__dirname, 'uploads', filename));
});

// Multer errors (e.g. file too large) land here instead of crashing with a stack trace
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Max upload size is 8MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});
