import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import JobCard from '../../../components/JobCard.vue';

describe('JobCard', () => {
  const mockJob = {
    id: 1,
    title: 'Software Engineer',
    company: 'Tech Corp',
    location: 'San Francisco, CA',
    description: 'Exciting opportunity for a software engineer to join our team...',
    skills: ['JavaScript', 'React', 'Node.js'],
    postedDate: new Date().toISOString(),
  };

  it('renders job information correctly', () => {
    const wrapper = mount(JobCard, {
      props: {
        job: mockJob,
      },
    });

    expect(wrapper.text()).toContain(mockJob.title);
    expect(wrapper.text()).toContain(mockJob.company);
    expect(wrapper.text()).toContain(mockJob.location);
    expect(wrapper.text()).toContain('Posted:');
  });

  it('truncates long descriptions', () => {
    const longDescription = 'A'.repeat(150);
    const jobWithLongDescription = {
      ...mockJob,
      description: longDescription,
    };

    const wrapper = mount(JobCard, {
      props: {
        job: jobWithLongDescription,
      },
    });

    expect(wrapper.text()).toContain('...');
  });

  it('displays skills correctly', () => {
    const wrapper = mount(JobCard, {
      props: {
        job: mockJob,
      },
    });

    mockJob.skills.forEach((skill) => {
      expect(wrapper.text()).toContain(skill);
    });
  });

  it('emits view-details event when clicked', async () => {
    const wrapper = mount(JobCard, {
      props: {
        job: mockJob,
      },
    });

    await wrapper.trigger('click');
    expect(wrapper.emitted('view-details')).toBeTruthy();
    expect(wrapper.emitted('view-details')[0]).toEqual([mockJob.id]);
  });

  it('emits save event when save button is clicked', async () => {
    const wrapper = mount(JobCard, {
      props: {
        job: mockJob,
      },
    });

    const saveButton = wrapper.find('.save-button');
    await saveButton.trigger('click');
    expect(wrapper.emitted('save')).toBeTruthy();
    expect(wrapper.emitted('save')[0]).toEqual([mockJob.id]);
  });

  it('shows saved state when isSaved prop is true', () => {
    const wrapper = mount(JobCard, {
      props: {
        job: mockJob,
        isSaved: true,
      },
    });

    const saveButton = wrapper.find('.save-button');
    expect(saveButton.text()).toBe('Saved');
    expect(saveButton.classes()).toContain('saved');
  });

  it('shows save state when isSaved prop is false', () => {
    const wrapper = mount(JobCard, {
      props: {
        job: mockJob,
        isSaved: false,
      },
    });

    const saveButton = wrapper.find('.save-button');
    expect(saveButton.text()).toBe('Save');
    expect(saveButton.classes()).not.toContain('saved');
  });
});
