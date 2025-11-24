<template>
  <div class="chat-page">
    <div class="chat-page-header">
      <h1>AI Career Coach</h1>
      <p>Get personalized career advice and job search guidance</p>
    </div>

    <div class="chat-page-content">
      <div class="chat-sidebar">
        <div class="sidebar-section">
          <h3>Quick Tips</h3>
          <ul class="tips-list">
            <li>Tailor your resume for each application</li>
            <li>Research company culture before interviews</li>
            <li>Practice common interview questions</li>
            <li>Network with professionals in your field</li>
            <li>Follow up after interviews</li>
          </ul>
        </div>

        <div class="sidebar-section">
          <h3>Popular Topics</h3>
          <div class="topics-grid">
            <button class="topic-button">Resume Writing</button>
            <button class="topic-button">Interview Prep</button>
            <button class="topic-button">Job Search</button>
            <button class="topic-button">Career Change</button>
            <button class="topic-button">Salary Negotiation</button>
            <button class="topic-button">Skill Development</button>
          </div>
        </div>
      </div>

      <div class="chat-main">
        <ChatComponent :user-id="userId" />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import ChatComponent from '~/components/chatbot/ChatComponent.vue';

export default {
  name: 'ChatPage',
  components: {
    ChatComponent,
  },
  setup() {
    const userId = ref('user-123'); // In a real app, this would come from auth

    // In a real implementation, you would get the user ID from your auth system
    // const getUser = useUser() // If using Clerk
    // userId.value = getUser()?.id || 'anonymous'

    return {
      userId,
    };
  },
};
</script>

<style scoped>
.chat-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.chat-page-header {
  text-align: center;
  margin-bottom: 32px;
}

.chat-page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
}

.chat-page-header p {
  font-size: 1.125rem;
  color: #64748b;
  max-width: 600px;
  margin: 0 auto;
}

.chat-page-content {
  display: flex;
  gap: 32px;
}

.chat-sidebar {
  flex: 0 0 300px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sidebar-section {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
}

.sidebar-section h3 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.tips-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.tips-list li {
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
  color: #334155;
}

.tips-list li:last-child {
  border-bottom: none;
}

.topics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.topic-button {
  padding: 12px;
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
  text-align: center;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.topic-button:hover {
  background-color: #f1f5f9;
  border-color: #94a3b8;
}

.chat-main {
  flex: 1;
  min-width: 0;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .chat-page {
    padding: 16px;
  }

  .chat-page-header h1 {
    font-size: 1.5rem;
  }

  .chat-page-header p {
    font-size: 1rem;
  }

  .chat-page-content {
    flex-direction: column;
    gap: 24px;
  }

  .chat-sidebar {
    flex: 0 0 auto;
  }

  .topics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
