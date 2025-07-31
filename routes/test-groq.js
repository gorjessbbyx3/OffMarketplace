
const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const GroqClient = require('../utils/groqClient');
const client = require('../database/connection');

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

// Chat endpoint for dashboard
router.post('/hello', async (req, res) => {
  try {
    const { message } = req.body;
    const groqClient = new GroqClient();
    
    // Get context about available properties
    const propertiesResponse = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM properties',
      args: []
    });
    
    const propertyCount = propertiesResponse.rows[0]?.count || 0;
    
    const contextPrompt = `You are an AI assistant for a Honolulu real estate investment platform. 
    Current database has ${propertyCount} properties. 
    User message: "${message}"
    
    Provide helpful information about Hawaii real estate, investment opportunities, or off-market properties.
    Keep responses conversational and under 200 words.`;

    const completion = await groqClient.groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful Hawaii real estate investment assistant. Be conversational, knowledgeable, and focus on investment opportunities."
        },
        {
          role: "user",
          content: contextPrompt
        }
      ],
      model: "llama3-8b-8192",
      temperature: 0.7,
      max_tokens: 300,
    });

    const response = completion.choices[0]?.message?.content || "I'm here to help with your Hawaii real estate questions!";

    res.json({
      success: true,
      response: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.json({
      success: true,
      response: "I'm here to help with Hawaii real estate! Ask me about properties, market trends, or investment opportunities.",
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { createGroqClient } = require('../utils/groqClient');

// Test Groq API connection
router.get('/groq', async (req, res) => {
  try {
    const groq = createGroqClient();
    
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: "Say hello" }],
      model: "llama3-8b-8192",
      max_tokens: 50
    });

    res.json({
      success: true,
      response: completion.choices[0]?.message?.content,
      model: "llama3-8b-8192"
    });
  } catch (error) {
    console.error('Groq test error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;
