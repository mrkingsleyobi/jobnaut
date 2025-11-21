// Chat service for communicating with the backend chatbot API
class ChatService {
  constructor() {
    // Use the runtime config for the API base URL
    // In test environment, use default values
    if (typeof useRuntimeConfig !== 'undefined') {
      const config = useRuntimeConfig();
      this.baseUrl = config.public.apiBase || 'http://localhost:3001/api';
    } else {
      this.baseUrl = 'http://localhost:3001/api';
    }
  }

  /**
   * Get conversation history for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} - Array of conversation messages
   */
  async getConversationHistory(userId) {
    try {
      // In a real implementation, this would use the actual authentication token
      // For now, we're using a placeholder to test the API
      const authToken =
        typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;

      const headers = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.baseUrl}/v1/chat/history/${userId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.warn(
        'Warning: Could not fetch conversation history - chat service may be unavailable:',
        error.message
      );
      // Return empty array as fallback
      return [];
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
      // In a real implementation, this would use the actual authentication token
      // For now, we're using a placeholder to test the API
      const authToken =
        typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;

      const headers = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.baseUrl}/v1/chat/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data.aiMessage;
    } catch (error) {
      console.warn(
        'Warning: Could not send message - chat service may be unavailable:',
        error.message
      );
      // Return fallback response
      return {
        id: Date.now(),
        role: 'assistant',
        content: "Sorry, I'm currently unavailable. Please try again later.",
        createdAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Clear conversation history for a user
   * @param {string} userId - The user ID
   * @returns {Promise<void>}
   */
  async clearHistory(userId) {
    try {
      // In a real implementation, this would use the actual authentication token
      // For now, we're using a placeholder to test the API
      const authToken =
        typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;

      const headers = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.baseUrl}/v1/chat/history/${userId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.warn(
        'Warning: Could not clear conversation history - chat service may be unavailable:',
        error.message
      );
      // Don't throw error to prevent breaking the UI
      return { success: true };
    }
  }
}

// Export a singleton instance
export default new ChatService();
