// Chat routes for JobNaut
// Provides REST API endpoints for chat functionality

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authMiddleware } = require('../auth/middleware');
const chatService = require('../services/chatService');
const securityLogger = require('../services/securityLogger');

const router = express.Router();

/**
 * GET /chat/history/:userId
 * Get conversation history for a user
 * @deprecated Use tRPC endpoint: chat.getConversationHistory instead
 */
router.get('/history/:userId', authMiddleware, async (req, res) => {
  // Add deprecation headers
  res.set({
    'X-API-Deprecated': 'true',
    'X-API-Deprecation-Date': '2024-01-01',
    'X-API-Alternative': 'tRPC: chat.getConversationHistory',
    'X-API-Sunset-Date': '2024-06-01',
  });
  try {
    // Ensure the authenticated user can only access their own history
    if (req.user.id !== req.params.userId) {
      securityLogger.logAccessControl('chat_history', 'read', {
        userId: req.user.id,
        targetUserId: req.params.userId,
        allowed: false,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      return res.status(403).json({ error: "Forbidden: Cannot access other users' chat history" });
    }

    securityLogger.logDataAccess('chat_history', {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    const history = await chatService.getConversationHistory(req.user.id);
    res.json({
      data: history,
      _deprecated: {
        message: 'This REST endpoint is deprecated. Please migrate to tRPC: chat.getConversationHistory',
        alternativeEndpoint: 'chat.getConversationHistory',
        sunsetDate: '2024-06-01',
      },
    });
  } catch (error) {
    securityLogger.logSecurityIncident('chat_history_fetch_error', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

/**
 * POST /chat/message
 * Send a message to the chatbot
 * @deprecated Use tRPC endpoint: chat.sendMessage instead
 */
router.post(
  '/message',
  [
    authMiddleware,
    body('userId').isString().notEmpty(),
    body('message').isString().isLength({ min: 1, max: 1000 }).trim(),
  ],
  async (req, res) => {
    // Add deprecation headers (set early to ensure it's included even on validation errors)
    res.set({
      'X-API-Deprecated': 'true',
      'X-API-Deprecation-Date': '2024-01-01',
      'X-API-Alternative': 'tRPC: chat.sendMessage',
      'X-API-Sunset-Date': '2024-06-01',
    });
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      securityLogger.logSuspiciousActivity('chat_message_validation_error', {
        userId: req.user.id,
        errors: errors.array(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      return res.status(400).json({ errors: errors.array() });
    }

    // Ensure the authenticated user can only send messages for themselves
    if (req.user.id !== req.body.userId) {
      securityLogger.logAccessControl('chat_message', 'send', {
        userId: req.user.id,
        targetUserId: req.body.userId,
        allowed: false,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      return res.status(403).json({ error: 'Forbidden: Cannot send messages for other users' });
    }

    try {
      securityLogger.logDataAccess('chat_message_send', {
        userId: req.user.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        messageLength: req.body.message.length,
      });

      const aiMessage = await chatService.sendMessage(req.user.id, req.body.message);

      res.json({
        data: {
          aiMessage,
        },
        _deprecated: {
          message: 'This REST endpoint is deprecated. Please migrate to tRPC: chat.sendMessage',
          alternativeEndpoint: 'chat.sendMessage',
          sunsetDate: '2024-06-01',
        },
      });
    } catch (error) {
      securityLogger.logSecurityIncident('chat_message_send_error', {
        userId: req.user.id,
        error: error.message,
        stack: error.stack,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      console.error('Error sending chat message:', error);
      res.status(500).json({ error: 'Failed to send chat message' });
    }
  }
);

/**
 * DELETE /chat/history/:userId
 * Clear conversation history for a user
 * @deprecated Use tRPC endpoint: chat.clearHistory instead
 */
router.delete('/history/:userId', authMiddleware, async (req, res) => {
  // Add deprecation headers
  res.set({
    'X-API-Deprecated': 'true',
    'X-API-Deprecation-Date': '2024-01-01',
    'X-API-Alternative': 'tRPC: chat.clearHistory',
    'X-API-Sunset-Date': '2024-06-01',
  });
  try {
    // Ensure the authenticated user can only clear their own history
    if (req.user.id !== req.params.userId) {
      securityLogger.logAccessControl('chat_history', 'delete', {
        userId: req.user.id,
        targetUserId: req.params.userId,
        allowed: false,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      return res.status(403).json({ error: "Forbidden: Cannot clear other users' chat history" });
    }

    securityLogger.logDataAccess('chat_history_clear', {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    const result = await chatService.clearHistory(req.user.id);
    res.json({
      ...result,
      _deprecated: {
        message: 'This REST endpoint is deprecated. Please migrate to tRPC: chat.clearHistory',
        alternativeEndpoint: 'chat.clearHistory',
        sunsetDate: '2024-06-01',
      },
    });
  } catch (error) {
    securityLogger.logSecurityIncident('chat_history_clear_error', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    console.error('Error clearing chat history:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

module.exports = router;
