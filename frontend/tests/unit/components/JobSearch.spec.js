import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import JobSearch from '../../../components/JobSearch.vue';

describe('JobSearch', () => {
  it('renders search input and filters', () => {
    const wrapper = mount(JobSearch);

    // Check if search input exists
    expect(wrapper.find('.search-input').exists()).toBe(true);

    // Check if search button exists
    expect(wrapper.find('.search-button').exists()).toBe(true);

    // Check if filter selects exist
    expect(wrapper.find('#location').exists()).toBe(true);
    expect(wrapper.find('#experience').exists()).toBe(true);
    expect(wrapper.find('#job-type').exists()).toBe(true);

    // Check if clear filters button exists
    expect(wrapper.find('.clear-filters-button').exists()).toBe(true);
  });

  it('emits search event when search button is clicked', async () => {
    const wrapper = mount(JobSearch);

    // Fill in search query
    const searchInput = wrapper.find('.search-input');
    await searchInput.setValue('software engineer');

    // Select location filter
    const locationSelect = wrapper.find('#location');
    await locationSelect.setValue('remote');

    // Select experience filter
    const experienceSelect = wrapper.find('#experience');
    await experienceSelect.setValue('mid');

    // Click search button
    const searchButton = wrapper.find('.search-button');
    await searchButton.trigger('click');

    // Check if search event was emitted
    expect(wrapper.emitted('search')).toBeTruthy();
    expect(wrapper.emitted('search')[0][0]).toEqual({
      query: 'software engineer',
      location: 'remote',
      experience: 'mid',
      jobType: '',
    });
  });

  it('emits search event when Enter key is pressed in search input', async () => {
    const wrapper = mount(JobSearch);

    // Fill in search query
    const searchInput = wrapper.find('.search-input');
    await searchInput.setValue('developer');

    // Trigger Enter key
    await searchInput.trigger('keyup.enter');

    // Check if search event was emitted
    expect(wrapper.emitted('search')).toBeTruthy();
    expect(wrapper.emitted('search')[0][0]).toEqual({
      query: 'developer',
      location: '',
      experience: '',
      jobType: '',
    });
  });

  it('emits clear-filters event when clear filters button is clicked', async () => {
    const wrapper = mount(JobSearch);

    const clearButton = wrapper.find('.clear-filters-button');
    await clearButton.trigger('click');

    expect(wrapper.emitted('clear-filters')).toBeTruthy();
  });

  it('resets all form fields when clearFilters is called', async () => {
    const wrapper = mount(JobSearch);

    // Set some values
    const searchInput = wrapper.find('.search-input');
    await searchInput.setValue('test query');

    const locationSelect = wrapper.find('#location');
    await locationSelect.setValue('remote');

    const experienceSelect = wrapper.find('#experience');
    await experienceSelect.setValue('mid');

    const jobTypeSelect = wrapper.find('#job-type');
    await jobTypeSelect.setValue('full-time');

    // Click clear filters
    const clearButton = wrapper.find('.clear-filters-button');
    await clearButton.trigger('click');

    // Check that values are reset
    expect(wrapper.find('.search-input').element.value).toBe('');
    expect(wrapper.find('#location').element.value).toBe('');
    expect(wrapper.find('#experience').element.value).toBe('');
    expect(wrapper.find('#job-type').element.value).toBe('');
  });
});
