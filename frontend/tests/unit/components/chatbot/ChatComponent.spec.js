import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatComponent from '../../../../components/chatbot/ChatComponent.vue'

// Mock the chat service module
vi.mock('../../../../services/chatService', () => {
  return {
    default: {
      getConversationHistory: vi.fn(),
      sendMessage: vi.fn(),
      clearHistory: vi.fn()
    }
  }
})

// Import the mocked module after defining the mock
import chatService from '../../../../services/chatService'

describe('ChatComponent', () => {
  const mockUserId = 'user-123'

  it('renders correctly with initial message', async () => {
    // Mock chat service getConversationHistory to return initial messages
    chatService.getConversationHistory.mockResolvedValue([
      {
        id: 1,
        role: 'assistant',
        content: 'Hello! I\'m your AI Career Coach. How can I help you with your job search today?',
        createdAt: new Date(Date.now() - 3600000) // 1 hour ago
      }
    ])

    const wrapper = mount(ChatComponent, {
      props: {
        userId: mockUserId
      }
    })

    // Wait for async operations
    await wrapper.vm.$nextTick()

    // Check that the component renders
    expect(wrapper.exists()).toBe(true)

    // Check that the initial message is displayed
    expect(wrapper.text()).toContain('AI Career Coach')

    // Check that the input field exists
    const input = wrapper.find('.chat-input')
    expect(input.exists()).toBe(true)

    // Check that the send button exists
    const sendButton = wrapper.find('.send-button')
    expect(sendButton.exists()).toBe(true)
  })

  it('allows sending messages', async () => {
    // Mock chat service getConversationHistory to return initial messages
    chatService.getConversationHistory.mockResolvedValue([
      {
        id: 1,
        role: 'assistant',
        content: 'Hello! I\'m your AI Career Coach. How can I help you with your job search today?',
        createdAt: new Date(Date.now() - 3600000) // 1 hour ago
      }
    ])

    // Mock chat service sendMessage to return a response
    chatService.sendMessage.mockResolvedValue({
      id: 2,
      role: 'assistant',
      content: 'I can help you with your job search! What specific questions do you have?',
      createdAt: new Date()
    })

    const wrapper = mount(ChatComponent, {
      props: {
        userId: mockUserId
      }
    })

    // Wait for initial messages to load
    await wrapper.vm.$nextTick()

    // Find the input and enter a message
    const input = wrapper.find('.chat-input')
    await input.setValue('Hello, career coach!')

    // Find and click the send button
    const sendButton = wrapper.find('.send-button')
    await sendButton.trigger('click')

    // Wait for the message to be processed
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100)) // Wait for processing

    // Check that chat service sendMessage was called with correct params
    expect(chatService.sendMessage).toHaveBeenCalledWith(mockUserId, 'Hello, career coach!')

    // Check that the user message and AI response appear
    const text = wrapper.text()
    expect(text).toContain('Hello, career coach!')
    expect(text).toContain('I can help you with your job search!')
  })

  it('shows typing indicator when loading', async () => {
    // Mock chat service getConversationHistory to return initial messages
    chatService.getConversationHistory.mockResolvedValue([
      {
        id: 1,
        role: 'assistant',
        content: 'Hello! I\'m your AI Career Coach. How can I help you with your job search today?',
        createdAt: new Date(Date.now() - 3600000) // 1 hour ago
      }
    ])

    const wrapper = mount(ChatComponent, {
      props: {
        userId: mockUserId
      }
    })

    // Set loading state
    wrapper.vm.isLoading = true
    await wrapper.vm.$nextTick()

    // Check that typing indicator is visible
    const typingIndicator = wrapper.find('.typing-indicator')
    expect(typingIndicator.exists()).toBe(true)
  })

  it('clears history when clear button is clicked', async () => {
    // Mock chat service getConversationHistory to return initial messages
    chatService.getConversationHistory.mockResolvedValue([
      {
        id: 1,
        role: 'assistant',
        content: 'Hello! I\'m your AI Career Coach. How can I help you with your job search today?',
        createdAt: new Date(Date.now() - 3600000) // 1 hour ago
      }
    ])

    // Mock chat service clearHistory to resolve successfully
    chatService.clearHistory.mockResolvedValue({})

    const wrapper = mount(ChatComponent, {
      props: {
        userId: mockUserId
      }
    })

    // Wait for initial messages to load
    await wrapper.vm.$nextTick()

    // Mock confirm dialog to return true
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true)

    // Find and click the clear button
    const clearButton = wrapper.find('.clear-button')
    await clearButton.trigger('click')

    // Wait for async operations
    await wrapper.vm.$nextTick()

    // Check that chat service clearHistory was called
    expect(chatService.clearHistory).toHaveBeenCalledWith(mockUserId)

    // Check that confirm was called
    expect(confirmSpy).toHaveBeenCalled()

    // Restore the original confirm function
    confirmSpy.mockRestore()
  })

  it('handles message sending errors gracefully', async () => {
    // Mock chat service getConversationHistory to return initial messages
    chatService.getConversationHistory.mockResolvedValue([
      {
        id: 1,
        role: 'assistant',
        content: 'Hello! I\'m your AI Career Coach. How can I help you with your job search today?',
        createdAt: new Date(Date.now() - 3600000) // 1 hour ago
      }
    ])

    // Mock chat service sendMessage to reject with an error
    chatService.sendMessage.mockRejectedValue(new Error('Network error'))

    const wrapper = mount(ChatComponent, {
      props: {
        userId: mockUserId
      }
    })

    // Wait for initial messages to load
    await wrapper.vm.$nextTick()

    // Find the input and enter a message
    const input = wrapper.find('.chat-input')
    await input.setValue('Test message')

    // Mock console.error to avoid cluttering test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Find and click the send button
    const sendButton = wrapper.find('.send-button')
    await sendButton.trigger('click')

    // Wait for the message to be processed
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100)) // Wait for processing

    // Check that error message is displayed
    expect(wrapper.text()).toContain('Sorry, I encountered an error processing your request')

    // Restore console.error
    consoleSpy.mockRestore()
  })
})