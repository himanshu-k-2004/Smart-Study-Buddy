const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const multer = require('multer');

// Set up Multer storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads'); // Folder where files will be stored
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Ensure unique filenames
  }
});

// Initialize the multer middleware
const upload = multer({ storage: storage });

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).send('Token is required.');

  jwt.verify(token, 'secretKey', (err, decoded) => {
    if (err) return res.status(401).send('Invalid token.');
    req.userId = decoded.id; // Save user ID for the next middleware
    next();
  });
};

// User Registration
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });

    await newUser.save();
    res.json({ message: 'User registered' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error });
  }
});

// User Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Account does not exist' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, 'secretKey', { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error });
  }
});

// Save User Progress
router.post('/saveProgress', verifyToken, async (req, res) => {
  const { topic, score } = req.body;
  console.log('Received topic:', topic, 'Score:', score);

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize user.progress if it doesn't exist
    if (!user.progress) {
      user.progress = new Map();
    }

    user.progress.set(topic, score); 
    user.markModified('progress'); // Ensure Mongoose tracks the change in Map

    await user.save();
    console.log('Progress saved for topic:', topic, 'Score:', score);
    res.json({ message: 'Progress saved successfully!' });
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({ message: 'Error saving progress', error });
  }
});

// Get User Progress
router.get('/getProgress', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('progress assignments');
    res.json({
      quizzes: user.progress || {},  // Ensure quizzes are returned
      assignments: user.assignments || {} // Ensure assignments are returned
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching progress', error });
  }
});

// Save User Assignment Progress
router.post('/saveAssignmentProgress', verifyToken, async (req, res) => {
  const { topic } = req.body; // Only topic needed for marking as complete

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize assignments if it doesn't exist
    if (!user.assignments) {
      user.assignments = new Map();
    }

    user.assignments.set(topic, true);
    user.markModified('assignments');

    await user.save();
    res.json({ message: 'Assignment progress saved successfully!' });
  } catch (error) {
    console.error('Error saving assignment progress:', error);
    res.status(500).json({ message: 'Error saving assignment progress', error });
  }
});

// Get User Assignment Progress
router.get('/getAssignmentProgress', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('assignments');
    res.json(user.assignments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assignment progress', error });
  }
});

// Get User Profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('name email profilePicture'); // Include profilePicture
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error });
  }
});

// Route to handle profile picture upload
router.post('/uploadProfilePicture', verifyToken, upload.single('profilePicture'), async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Save the file path to the user's profile in the database
    user.profilePicture = req.file.path; // Save file path in the user's profile
    await user.save();

    res.json({ message: 'Profile picture uploaded successfully!' });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ message: 'Error uploading profile picture', error });
  }
});

// Update User Profile
// Update User Profile
router.put('/profile', verifyToken, upload.single('profilePicture'), async (req, res) => {
  const { firstName, lastName, gender, phone } = req.body;

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user fields
    user.firstName = firstName || user.firstName; // Use existing value if not provided
    user.lastName = lastName || user.lastName;     // Use existing value if not provided
    user.gender = gender || user.gender;           // Use existing value if not provided
    user.phone = phone || user.phone;               // Use existing value if not provided

    if (req.file) {
      user.profilePicture = req.file.path; // Save the uploaded profile picture path
    }

    await user.save();
    res.json({ message: 'Profile updated successfully!' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile', error });
  }
});



module.exports = router;
