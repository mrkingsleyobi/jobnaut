import { defineStore } from 'pinia';

export const useChatStore = defineStore('chat', {
  state: () => ({
    conversations: [],
    currentConversation: null,
    messages: [],
    loading: false,
    error: null,
  }),

  getters: {
    messageCount: (state) => state.messages.length,

    conversationCount: (state) => state.conversations.length,

    hasMessages: (state) => state.messages.length > 0,

    latestMessage: (state) => {
      if (state.messages.length === 0) return null;
      return state.messages[state.messages.length - 1];
    },

    userMessages: (state) => {
      return state.messages.filter((msg) => msg.role === 'user');
    },

    assistantMessages: (state) => {
      return state.messages.filter((msg) => msg.role === 'assistant');
    },
  },

  actions: {
    async fetchConversations(userId) {
      this.loading = true;
      try {
        const config = useRuntimeConfig();
        const token = process.client ? localStorage.getItem('auth_token') : null;

        const response = await fetch(`${config.public.apiBase}/chat/conversations/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch conversations');
        }

        const data = await response.json();
        this.conversations = data.conversations || data;

        return this.conversations;
      } catch (error) {
        console.error('Fetch conversations error:', error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async loadMessages(userId) {
      this.loading = true;
      try {
        const config = useRuntimeConfig();
        const response = await fetch(`${config.public.apiBase}/chat/history/${userId}`);

        if (!response.ok) {
          throw new Error('Failed to load messages');
        }

        const data = await response.json();
        this.messages = (data.messages || data).map((msg) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        }));

        return this.messages;
      } catch (error) {
        console.error('Load messages error:', error);
        this.error = error.message;

        // Set fallback welcome message
        this.messages = [
          {
            id: 1,
            role: 'assistant',
            content: "Hello! I'm your AI Career Coach. How can I help you with your job search today?",
            createdAt: new Date(Date.now() - 3600000),
          },
        ];

        throw error;
      } finally {
        this.loading = false;
      }
    },

    async sendMessage(userId, content) {
      // Add user message immediately
      const userMessage = {
        id: Date.now(),
        role: 'user',
        content,
        createdAt: new Date(),
      };
      this.messages.push(userMessage);

      this.loading = true;
      try {
        const config = useRuntimeConfig();
        const response = await fetch(`${config.public.apiBase}/chat/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, message: content }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const aiMessage = await response.json();

        // Add AI response
        this.messages.push({
          ...aiMessage,
          createdAt: new Date(aiMessage.createdAt),
        });

        return aiMessage;
      } catch (error) {
        console.error('Send message error:', error);
        this.error = error.message;

        // Add error message
        const errorMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          createdAt: new Date(),
        };
        this.messages.push(errorMessage);

        throw error;
      } finally {
        this.loading = false;
      }
    },

    async clearHistory(userId) {
      try {
        const config = useRuntimeConfig();
        const response = await fetch(`${config.public.apiBase}/chat/history/${userId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to clear history');
        }

        // Clear messages and reload
        this.messages = [];
        await this.loadMessages(userId);

        return true;
      } catch (error) {
        console.error('Clear history error:', error);
        this.error = error.message;
        throw error;
      }
    },

    setCurrentConversation(conversation) {
      this.currentConversation = conversation;
    },

    clearCurrentConversation() {
      this.currentConversation = null;
    },

    addMessage(message) {
      this.messages.push({
        ...message,
        createdAt: message.createdAt || new Date(),
      });
    },

    clearMessages() {
      this.messages = [];
    },

    clearError() {
      this.error = null;
    },
  },

  persist: {
    storage: process.client ? localStorage : null,
    paths: ['currentConversation'],
  },
});
