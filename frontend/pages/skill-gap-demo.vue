<template>
  <div class="skill-gap-demo">
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Skill Gap Analysis Demo</h1>

      <SkillGapAnalysis
        :match-score="78"
        :skills-data="sampleSkillsData"
        :missing-skills="sampleMissingSkills"
      />
    </div>
  </div>
</template>

<script setup>
import SkillGapAnalysis from '~/components/visualizations/SkillGapAnalysis.vue';

// Sample data for demonstration
const sampleSkillsData = [
  {
    name: 'JavaScript',
    current: 85,
    required: 90,
    gap: 5,
    recommendation: 'Learn ES2023 features',
  },
  { name: 'Vue.js', current: 75, required: 85, gap: 10, recommendation: 'Master Composition API' },
  {
    name: 'Node.js',
    current: 65,
    required: 80,
    gap: 15,
    recommendation: 'Advanced Express patterns',
  },
  {
    name: 'CSS/Tailwind',
    current: 90,
    required: 85,
    gap: -5,
    recommendation: 'Advanced animations',
  },
  {
    name: 'Database Design',
    current: 55,
    required: 75,
    gap: 20,
    recommendation: 'Learn PostgreSQL optimization',
  },
  {
    name: 'API Development',
    current: 80,
    required: 85,
    gap: 5,
    recommendation: 'GraphQL fundamentals',
  },
];

const sampleMissingSkills = [
  {
    name: 'TypeScript',
    priority: 'high',
    description: 'Strongly typed programming language that builds on JavaScript.',
  },
  {
    name: 'Docker',
    priority: 'medium',
    description: 'Containerization platform for consistent application deployment.',
  },
  {
    name: 'AWS Cloud Services',
    priority: 'high',
    description: 'Amazon Web Services cloud computing platforms and APIs.',
  },
  {
    name: 'CI/CD Pipelines',
    priority: 'medium',
    description: 'Automated deployment and integration processes.',
  },
  {
    name: 'Microservices Architecture',
    priority: 'low',
    description: 'Architectural style that structures an application as a collection of services.',
  },
];
</script>

<style scoped>
.skill-gap-demo {
  background-color: #f8fafc;
  min-height: 100vh;
}
</style>
