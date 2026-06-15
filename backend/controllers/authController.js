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

    const payload = {
      user: {
        id: user.id,
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

        // Build the response user object explicitly so 'id' is always the uuid string.
        // Never rely on toObject() alone — legacy documents may lack the 'id' field.
        const userObj = {
          id: user.id,       // uuid string from schema field
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };

        console.log('[auth] login response user:', userObj);
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
