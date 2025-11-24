#!/usr/bin/env node

/**
 * Simple chatbot test server for JobNaut frontend
 * Provides mock endpoints for chat functionality during development
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mock conversation history
const conversationHistory = {};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Chatbot test server is running' });
});

// Get conversation history
app.get('/api/v1/chat/history/:userId', (req, res) => {
  const { userId } = req.params;
  const history = conversationHistory[userId] || [];

  res.json({
    success: true,
    data: history,
  });
});

// Send message to chatbot
app.post('/api/v1/chat/message', (req, res) => {
  const { userId, message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({
      success: false,
      error: 'userId and message are required',
    });
  }

  // Create or get user's conversation history
  if (!conversationHistory[userId]) {
    conversationHistory[userId] = [
      {
        id: 1,
        role: 'assistant',
        content: "Hello! I'm your AI Career Coach. How can I help you with your job search today?",
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      },
    ];
  }

  // Add user message
  const userMessage = {
    id: Date.now(),
    role: 'user',
    content: message,
    createdAt: new Date(),
  };

  conversationHistory[userId].push(userMessage);

  // Generate mock AI response
  const aiResponse = generateMockResponse(message);

  const aiMessage = {
    id: Date.now() + 1,
    role: 'assistant',
    content: aiResponse,
    createdAt: new Date(),
  };

  // Add AI message to history
  conversationHistory[userId].push(aiMessage);

  res.json({
    success: true,
    data: {
      aiMessage,
    },
  });
});

// Clear conversation history
app.delete('/api/v1/chat/history/:userId', (req, res) => {
  const { userId } = req.params;

  if (conversationHistory[userId]) {
    delete conversationHistory[userId];
  }

  res.json({
    success: true,
    message: 'Conversation history cleared',
  });
});

// Generate a mock response based on the user's message
function generateMockResponse(userMessage) {
  const lowerMessage = userMessage.toLowerCase();

  if (
    lowerMessage.includes('hello') ||
    lowerMessage.includes('hi') ||
    lowerMessage.includes('hey')
  ) {
    return "Hello there! I'm your AI Career Coach. How can I assist you with your job search today?";
  }

  if (
    lowerMessage.includes('job') &&
    (lowerMessage.includes('search') || lowerMessage.includes('find'))
  ) {
    return "I'd be happy to help with your job search! Could you tell me more about what type of position you're looking for, your experience level, and preferred location?";
  }

  if (lowerMessage.includes('resume') || lowerMessage.includes('cv')) {
    return 'A strong resume is key to landing interviews! Make sure yours highlights your achievements with specific metrics, uses action verbs, and is tailored to each job you apply for. Would you like me to review a specific section of your resume?';
  }

  if (lowerMessage.includes('interview')) {
    return 'Interview preparation is crucial! Practice answering common questions like "Tell me about yourself" and "What are your strengths/weaknesses?" Also prepare thoughtful questions to ask your interviewer. Would you like some specific interview tips?';
  }

  if (lowerMessage.includes('salary') || lowerMessage.includes('negotiat')) {
    return "Salary negotiation can be challenging but important! Research industry standards for your role using sites like Glassdoor and PayScale. Consider the full compensation package, not just base salary. Remember, it's okay to ask for what you're worth!";
  }

  if (lowerMessage.includes('network') || lowerMessage.includes('connect')) {
    return 'Networking is one of the most effective ways to find opportunities! Try reaching out to people in your target companies on LinkedIn, attending industry events, and joining relevant professional groups. Would you like tips on how to start networking conversations?';
  }

  if (lowerMessage.includes('thank')) {
    return "You're welcome! I'm here to help with your career journey. Is there anything else I can assist you with today?";
  }

  // Default response
  const responses = [
    "That's an interesting point! As your AI Career Coach, I'm here to help you navigate your job search. Could you tell me more about your specific situation?",
    "I understand. Career development is a journey, and I'm here to support you along the way. What are your main goals right now?",
    'Great question! Career advancement often requires a combination of skills development, networking, and strategic planning. What area would you like to focus on first?',
    "I'd be happy to help with that! Career transitions can be challenging but rewarding. What specific aspect would you like guidance on?",
    'Thanks for sharing that with me. As your AI Career Coach, I recommend focusing on your strengths while addressing areas for improvement. What skills would you like to develop further?',
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

// Serve static files from frontend dist directory if it exists
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

// Catch-all handler for frontend routing
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) {
      res.status(200).json({
        message: 'JobNaut Chatbot Test Server is running',
        endpoints: {
          'GET /api/health': 'Health check',
          'GET /api/v1/chat/history/:userId': 'Get conversation history',
          'POST /api/v1/chat/message': 'Send message to chatbot',
          'DELETE /api/v1/chat/history/:userId': 'Clear conversation history',
        },
      });
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Chatbot test server running on port ${PORT}`);
  console.log(`📋 Endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/chat/history/:userId`);
  console.log(`   POST http://localhost:${PORT}/api/v1/chat/message`);
  console.log(`   DELETE http://localhost:${PORT}/api/v1/chat/history/:userId`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down chatbot test server...');
  process.exit(0);
});
