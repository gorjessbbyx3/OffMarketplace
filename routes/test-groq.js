
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

// Test Kakaako apartment search
router.get('/kakaako-search', async (req, res) => {
  try {
    const groq = new Groq({ 
      apiKey: process.env.GROQ_API_KEY 
    });
    
    const response = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content: "You are a Hawaii real estate expert specializing in Kakaako properties and foreclosure listings."
        },
        { 
          role: "user", 
          content: "Find the address of a 4-unit apartment in Kakaako that is in pre-foreclosure for about $2 million. Provide specific addresses, building names, or areas where such properties might be found."
        }
      ],
      temperature: 0.1,
      max_tokens: 1024
    });
    
    res.status(200).json({ 
      search_results: response.choices[0].message.content,
      model: "llama3-8b-8192",
      search_criteria: {
        location: "Kakaako, Honolulu",
        property_type: "4-unit apartment",
        status: "pre-foreclosure",
        price_target: "$2,000,000"
      }
    });
  } catch (error) {
    console.error('GROQ API error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
