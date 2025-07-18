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
const FormData = require('form-data');

const app = express();

// Set security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", "http://localhost:5000"],
        imgSrc: ["'self'", "data:","blob:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
const upload = multer({ dest: 'uploads/' });

// Session setup
app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 },
  })
);

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/your_database', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
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
      req.session.user = { id: user._id, email: user.email };
      res.redirect('/home');
    } else {
      res.send('Invalid email or password. <a href="/login">Try again</a>');
    }
  } catch (error) {
    res.status(500).send('An error occurred during login.');
  }
});

app.post('/signup', async (req, res) => {
  const { email, username, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.send('Account already exists with this email. <a href="/signup">Go back</a>');
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ email, username, password: hashedPassword });
      await newUser.save();
      res.send('Signup successful! <a href="/login">Sign In</a>');
    }
  } catch (error) {
    res.status(500).send('An error occurred during signup.');
  }
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

app.post('/predict_color', upload.single('image'), async (req, res) => {
  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(req.file.path));

    const response = await axios.post('http://localhost:5000/predict_color', formData, {
      headers: { ...formData.getHeaders() },
    });

    const { predicted_color } = response.data;

    if (req.session.user) {
      const user = await User.findById(req.session.user.id);
      user.history.push({ image: req.file.path, color: `rgb(${predicted_color.join(',')})` });
      await user.save();
    }

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/predict_hairstyle', upload.single('image'), async (req, res) => {
  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(req.file.path));

    const response = await axios.post('http://localhost:5000/predict_hairstyle', formData, {
      headers: { ...formData.getHeaders() },
      responseType: 'arraybuffer',
    });

    const buffer = Buffer.from(response.data, 'binary');

    if (req.session.user) {
      const user = await User.findById(req.session.user.id);
      const filePath = path.join(__dirname, 'static/hair_dataset', req.file.filename);
      fs.writeFileSync(filePath, buffer);
      user.history.push({ image: req.file.path, hairstyle: filePath });
      await user.save();
    }

    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
