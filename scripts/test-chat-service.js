// Chat service for communicating with the backend chatbot API
class ChatService {
  constructor() {
    // Use a fixed base URL for testing
    this.baseUrl = 'http://localhost:3001/api';
  }

  /**
   * Get conversation history for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} - Array of conversation messages
   */
  async getConversationHistory(userId) {
    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/history/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      throw new Error('Failed to fetch conversation history');
    }
  }

  /**
   * Send a message to the chatbot
   * @param {string} userId - The user ID
   * @param {string} message - The user's message
   * @returns {Promise<Object>} - The AI response
   */
  async sendMessage(userId, message) {
    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data.aiMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  /**
   * Clear conversation history for a user
   * @param {string} userId - The user ID
   * @returns {Promise<void>}
   */
  async clearHistory(userId) {
    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/history/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error clearing conversation history:', error);
      throw new Error('Failed to clear conversation history');
    }
  }
}

// Export a singleton instance
module.exports = new ChatService();
