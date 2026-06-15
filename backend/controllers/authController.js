const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();

    const newUser = await User.create({
      id,
      name,
      email,
      password: hashedPassword
    });

    const userObj = newUser.toObject();
    delete userObj.password;

    res.status(201).json({ message: 'Registration successful', user: userObj });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: 'Invalid login credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid login credentials' });
    }

    const resolvedId = user.id || user._id.toString();

    const payload = {
      user: {
        id: resolvedId,
        name: user.name,
        email: user.email
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;

        const userObj = {
          id: resolvedId,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };

        res.json({ token, user: userObj });
      }
    );

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  register,
  login
};
