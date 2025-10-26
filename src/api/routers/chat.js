// tRPC Chat Router for JobNaut
// Handles chat-related tRPC procedures

const { z } = require('zod');
const { router, publicProcedure, protectedProcedure } = require('../trpc');
const chatService = require('../../services/chatService');

/**
 * Chat router with tRPC procedures
 */
const chatRouter = router({
  // Get conversation history for a user (protected)
  getConversationHistory: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        // Use the authenticated user ID
        const userId = ctx.user.id;

        const history = await chatService.getConversationHistory(userId);

        return {
          success: true,
          data: history
        };
      } catch (error) {
        console.error('Error getting conversation history:', error);
        throw new Error('Failed to get conversation history');
      }
    }),

  // Send a message to the chatbot (protected)
  sendMessage: protectedProcedure
    .input(z.object({
      message: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long')
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Use the authenticated user ID
        const userId = ctx.user.id;

        const aiResponse = await chatService.sendMessage(userId, input.message);

        return {
          success: true,
          data: {
            userMessage: {
              role: 'user',
              content: input.message,
              timestamp: new Date().toISOString()
            },
            aiMessage: aiResponse
          }
        };
      } catch (error) {
        console.error('Error sending message:', error);
        throw new Error('Failed to send message');
      }
    }),

  // Clear conversation history for a user (protected)
  clearHistory: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        // Use the authenticated user ID
        const userId = ctx.user.id;

        const result = await chatService.clearHistory(userId);

        return {
          success: true,
          message: result.message
        };
      } catch (error) {
        console.error('Error clearing history:', error);
        throw new Error('Failed to clear conversation history');
      }
    })
});

module.exports = chatRouter;