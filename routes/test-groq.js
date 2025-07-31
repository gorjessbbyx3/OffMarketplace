
const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

// Test GROQ API endpoint
router.get('/hello', async (req, res) => {
  try {
    const groq = new Groq({ 
      apiKey: process.env.GROQ_API_KEY 
    });
    
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "user", content: "Hello from Replit!" }
      ]
    });
    
    res.status(200).json({ 
      message: response.choices[0].message.content,
      model: "llama-3.3-70b-versatile"
    });
  } catch (error) {
    console.error('GROQ API error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
