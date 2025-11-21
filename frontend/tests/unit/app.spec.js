import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import App from '../../app.vue';

describe('App', () => {
  it('renders the app component', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createTestingPinia({ stubActions: false })],
        stubs: {
          NuxtLayout: true,
          NuxtPage: true,
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
  });

  it('contains NuxtLayout component', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createTestingPinia({ stubActions: false })],
        stubs: {
          NuxtLayout: true,
          NuxtPage: true,
        },
      },
    });

    // Check if NuxtLayout component is rendered
    // Note: NuxtPage is nested inside NuxtLayout, so when NuxtLayout is stubbed,
    // NuxtPage won't be rendered as a separate component
    expect(wrapper.findComponent({ name: 'NuxtLayout' }).exists()).toBe(true);
  });
});
