<template>
  <div class="chat-container">
    <div class="chat-header">
      <h2>AI Career Coach</h2>
      <button @click="clearHistory" class="clear-button">Clear History</button>
    </div>

    <div class="chat-messages" ref="messagesContainer">
      <div v-for="message in messages" :key="message.id" :class="['message', message.role]">
        <div class="message-content">
          <div class="message-text">{{ message.content }}</div>
          <div class="message-timestamp">{{ formatTimestamp(message.createdAt) }}</div>
        </div>
      </div>

      <div v-if="isLoading" class="message assistant">
        <div class="message-content">
          <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-input-container">
      <input
        v-model="newMessage"
        @keyup.enter="sendMessage"
        :disabled="isLoading"
        placeholder="Ask for career advice..."
        class="chat-input"
      />
      <button @click="sendMessage" :disabled="isLoading || !newMessage.trim()" class="send-button">
        Send
      </button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue';
import chatService from '../../services/chatService';

export default {
  name: 'ChatComponent',
  props: {
    userId: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const messages = ref([]);
    const newMessage = ref('');
    const isLoading = ref(false);
    const messagesContainer = ref(null);

    // Load initial messages
    const loadMessages = async () => {
      try {
        const history = await chatService.getConversationHistory(props.userId);
        messages.value = history.map((msg) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        }));
        scrollToBottom();
      } catch (error) {
        console.error('Error loading messages:', error);
        // Fallback to welcome message
        messages.value = [
          {
            id: 1,
            role: 'assistant',
            content:
              "Hello! I'm your AI Career Coach. How can I help you with your job search today?",
            createdAt: new Date(Date.now() - 3600000), // 1 hour ago
          },
        ];
      }
    };

    // Format timestamp for display
    const formatTimestamp = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Scroll to bottom of messages
    const scrollToBottom = () => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
      });
    };

    // Send a message
    const sendMessage = async () => {
      if (!newMessage.value.trim() || isLoading.value) return;

      const userMessage = {
        id: Date.now(),
        role: 'user',
        content: newMessage.value,
        createdAt: new Date(),
      };

      // Add user message to chat
      messages.value.push(userMessage);
      scrollToBottom();

      // Clear input
      const messageToSend = newMessage.value;
      newMessage.value = '';

      // Show loading indicator
      isLoading.value = true;
      scrollToBottom();

      try {
        const aiMessage = await chatService.sendMessage(props.userId, messageToSend);

        // Add AI response to messages
        messages.value.push({
          ...aiMessage,
          createdAt: new Date(aiMessage.createdAt),
        });
      } catch (error) {
        console.error('Error sending message:', error);

        // Show error message
        const errorMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          createdAt: new Date(),
        };

        messages.value.push(errorMessage);
      } finally {
        isLoading.value = false;
        scrollToBottom();
      }
    };

    // Clear chat history
    const clearHistory = async () => {
      if (confirm('Are you sure you want to clear the chat history?')) {
        try {
          await chatService.clearHistory(props.userId);
          // Reload messages to show welcome message
          await loadMessages();
        } catch (error) {
          console.error('Error clearing history:', error);
        }
      }
    };

    // Load messages when component mounts
    onMounted(() => {
      loadMessages();
    });

    return {
      messages,
      newMessage,
      isLoading,
      messagesContainer,
      formatTimestamp,
      sendMessage,
      clearHistory,
    };
  },
};
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 600px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #ffffff;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
  background-color: #f8fafc;
  border-radius: 8px 8px 0 0;
}

.chat-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.clear-button {
  padding: 8px 12px;
  background-color: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.clear-button:hover {
  background-color: #dc2626;
}

.chat-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  max-width: 80%;
}

.message.user {
  align-self: flex-end;
}

.message.assistant {
  align-self: flex-start;
}

.message-content {
  padding: 12px 16px;
  border-radius: 18px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.message.user .message-content {
  background-color: #3b82f6;
  color: white;
}

.message.assistant .message-content {
  background-color: #f1f5f9;
  color: #1e293b;
}

.message-text {
  margin-bottom: 4px;
  line-height: 1.4;
}

.message-timestamp {
  font-size: 0.75rem;
  opacity: 0.7;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #94a3b8;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) {
  animation-delay: 0s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-5px);
  }
}

.chat-input-container {
  display: flex;
  padding: 16px;
  border-top: 1px solid #e2e8f0;
  background-color: #f8fafc;
  border-radius: 0 0 8px 8px;
}

.chat-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 24px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.chat-input:focus {
  border-color: #3b82f6;
}

.chat-input:disabled {
  background-color: #f1f5f9;
  cursor: not-allowed;
}

.send-button {
  margin-left: 12px;
  padding: 12px 24px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 24px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.send-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.send-button:disabled {
  background-color: #94a3b8;
  cursor: not-allowed;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .chat-container {
    max-height: 500px;
  }

  .message {
    max-width: 90%;
  }

  .chat-header h2 {
    font-size: 1.125rem;
  }

  .clear-button {
    padding: 6px 10px;
    font-size: 0.8125rem;
  }
}
</style>
