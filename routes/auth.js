
const express = require('express');
const router = express.Router();
const { client } = require('../database/connection');

// Simple user authentication (you can enhance with bcrypt for production)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password required' 
      });
    }

    // Check user credentials (in production, use hashed passwords)
    const result = await client.execute({
      sql: 'SELECT * FROM users WHERE username = ? AND password = ?',
      args: [username, password]
    });

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    const user = result.rows[0];
    
    // Create session (simple token for demo)
    const sessionToken = 'session_' + Date.now() + '_' + Math.random().toString(36);
    
    // Store session
    await client.execute({
      sql: 'INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, datetime("now", "+24 hours"))',
      args: [user.id, sessionToken]
    });

    res.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at
      },
      redirect: '/dashboard.html'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed' 
    });
  }
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username, password, and email required' 
      });
    }

    // Check if user exists
    const existingUser = await client.execute({
      sql: 'SELECT id FROM users WHERE username = ? OR email = ?',
      args: [username, email]
    });

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        error: 'Username or email already exists' 
      });
    }

    // Create new user
    const result = await client.execute({
      sql: 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      args: [username, password, email]
    });

    res.json({
      success: true,
      message: 'User registered successfully',
      user_id: result.lastInsertRowid
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Registration failed' 
    });
  }
});

// Verify session
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      });
    }

    const result = await client.execute({
      sql: `SELECT u.*, s.expires_at 
            FROM users u 
            JOIN user_sessions s ON u.id = s.user_id 
            WHERE s.token = ? AND s.expires_at > datetime('now')`,
      args: [token]
    });

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Token verification failed' 
    });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      await client.execute({
        sql: 'DELETE FROM user_sessions WHERE token = ?',
        args: [token]
      });
    }

    res.json({ success: true, message: 'Logged out successfully' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Logout failed' 
    });
  }
});

module.exports = router;
