<template>
  <div class="skill-gap-analysis">
    <!-- Header -->
    <div class="analysis-header">
      <h2 class="analysis-title">Skill Gap Analysis</h2>
      <p class="analysis-subtitle">Identify and bridge the gap between your current skills and job requirements</p>
    </div>

    <!-- Overall Match Score - Radial Progress Chart -->
    <div class="overall-score-section">
      <h3 class="section-title">Overall Match Score</h3>
      <div class="radial-chart-container">
        <div class="radial-chart">
          <svg class="radial-svg" viewBox="0 0 120 120">
            <circle class="radial-bg" cx="60" cy="60" r="54" />
            <circle
              class="radial-progress"
              cx="60"
              cy="60"
              r="54"
              :stroke-dasharray="`${progressCircumference} ${progressCircumference}`"
              :stroke-dashoffset="progressOffset"
            />
            <text x="60" y="60" class="radial-text">{{ matchScore }}%</text>
          </svg>
        </div>
        <div class="score-details">
          <p class="score-description">Your profile matches {{ matchScore }}% of the required skills for this position.</p>
          <p class="score-recommendation" :class="recommendationClass">
            {{ recommendationText }}
          </p>
        </div>
      </div>
    </div>

    <!-- Skill Proficiency Comparison - Bar Chart -->
    <div class="proficiency-section">
      <h3 class="section-title">Skill Proficiency Comparison</h3>
      <div class="bar-chart-container">
        <div
          v-for="skill in skillsData"
          :key="skill.name"
          class="skill-bar"
        >
          <div class="skill-info">
            <span class="skill-name">{{ skill.name }}</span>
            <div class="proficiency-labels">
              <span class="current-label">Current: {{ skill.current }}%</span>
              <span class="required-label">Required: {{ skill.required }}%</span>
            </div>
          </div>
          <div class="bar-container">
            <div class="bar-bg"></div>
            <div
              class="bar-current"
              :style="{ width: skill.current + '%' }"
            ></div>
            <div
              class="bar-required"
              :style="{ width: skill.required + '%' }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Missing Skills and Recommendations -->
    <div class="missing-skills-section">
      <h3 class="section-title">Missing Skills & Recommendations</h3>
      <div class="missing-skills-grid">
        <div
          v-for="skill in missingSkills"
          :key="skill.name"
          class="skill-card"
        >
          <div class="skill-card-header">
            <h4 class="skill-card-title">{{ skill.name }}</h4>
            <span class="priority-badge" :class="`priority-${skill.priority}`">
              {{ skill.priority }}
            </span>
          </div>
          <p class="skill-description">{{ skill.description }}</p>
          <div class="skill-actions">
            <button class="action-button learn-button">Learn</button>
            <button class="action-button practice-button">Practice</button>
            <button class="action-button certify-button">Get Certified</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Detailed Skills Comparison Table -->
    <div class="comparison-table-section">
      <h3 class="section-title">Detailed Skills Comparison</h3>
      <div class="table-container">
        <table class="skills-table">
          <thead>
            <tr>
              <th>Skill</th>
              <th>Current Level</th>
              <th>Required Level</th>
              <th>Gap</th>
              <th>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="skill in skillsData"
              :key="skill.name"
              :class="getRowClass(skill)"
            >
              <td>{{ skill.name }}</td>
              <td>
                <div class="level-display">
                  <span class="level-badge current-level">{{ skill.current }}%</span>
                </div>
              </td>
              <td>
                <div class="level-display">
                  <span class="level-badge required-level">{{ skill.required }}%</span>
                </div>
              </td>
              <td>
                <div class="gap-display">
                  <span class="gap-badge" :class="getGapClass(skill.gap)">
                    {{ skill.gap > 0 ? `+${skill.gap}%` : `${skill.gap}%` }}
                  </span>
                </div>
              </td>
              <td>
                <span class="recommendation-text">{{ skill.recommendation }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Props
const props = defineProps({
  matchScore: {
    type: Number,
    default: 75
  },
  skillsData: {
    type: Array,
    default: () => [
      { name: 'JavaScript', current: 80, required: 90, gap: 10, recommendation: 'Advanced JS concepts' },
      { name: 'Vue.js', current: 70, required: 85, gap: 15, recommendation: 'Composition API' },
      { name: 'Node.js', current: 60, required: 75, gap: 15, recommendation: 'Express framework' },
      { name: 'CSS/Tailwind', current: 85, required: 80, gap: -5, recommendation: 'Advanced styling' },
      { name: 'Database Design', current: 50, required: 70, gap: 20, recommendation: 'SQL optimization' },
      { name: 'API Development', current: 75, required: 80, gap: 5, recommendation: 'RESTful principles' }
    ]
  },
  missingSkills: {
    type: Array,
    default: () => [
      {
        name: 'TypeScript',
        priority: 'high',
        description: 'Strongly typed programming language that builds on JavaScript.'
      },
      {
        name: 'Docker',
        priority: 'medium',
        description: 'Containerization platform for consistent application deployment.'
      },
      {
        name: 'AWS Cloud',
        priority: 'high',
        description: 'Amazon Web Services cloud computing platform.'
      },
      {
        name: 'CI/CD Pipelines',
        priority: 'medium',
        description: 'Automated deployment and integration processes.'
      }
    ]
  }
})

// Computed properties for radial chart
const progressCircumference = computed(() => 2 * Math.PI * 54)
const progressOffset = computed(() => {
  const progress = props.matchScore / 100
  return progressCircumference.value * (1 - progress)
})

// Recommendation text based on match score
const recommendationText = computed(() => {
  if (props.matchScore >= 80) return 'Excellent match! You\'re well-prepared for this role.'
  if (props.matchScore >= 60) return 'Good match with some areas to improve.'
  if (props.matchScore >= 40) return 'Moderate match. Focus on key skill gaps.'
  return 'Significant gaps identified. Consider targeted learning.'
})

const recommendationClass = computed(() => {
  if (props.matchScore >= 80) return 'recommendation-excellent'
  if (props.matchScore >= 60) return 'recommendation-good'
  if (props.matchScore >= 40) return 'recommendation-moderate'
  return 'recommendation-low'
})

// Methods for table styling
const getRowClass = (skill) => {
  if (skill.gap === 0) return 'row-match'
  if (skill.gap > 0) return 'row-gap'
  return 'row-excess'
}

const getGapClass = (gap) => {
  if (gap === 0) return 'gap-none'
  if (gap > 0) return 'gap-positive'
  return 'gap-negative'
}
</script>

<style scoped>
.skill-gap-analysis {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 2rem;
  margin-bottom: 2rem;
}

.analysis-header {
  text-align: center;
  margin-bottom: 2rem;
}

.analysis-title {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
}

.analysis-subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 1.1rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e5e7eb;
}

/* Radial Chart Styles */
.overall-score-section {
  margin-bottom: 2.5rem;
}

.radial-chart-container {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  align-items: center;
  justify-content: center;
}

.radial-chart {
  position: relative;
  width: 200px;
  height: 200px;
}

.radial-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.radial-bg {
  fill: none;
  stroke: #e5e7eb;
  stroke-width: 8;
}

.radial-progress {
  fill: none;
  stroke: #3b82f6;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s ease;
}

.radial-text {
  fill: #111827;
  font-size: 24px;
  font-weight: 700;
  text-anchor: middle;
  dominant-baseline: middle;
  transform: rotate(90deg);
}

.score-details {
  max-width: 300px;
}

.score-description {
  font-size: 1.1rem;
  color: #374151;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.score-recommendation {
  font-size: 1rem;
  font-weight: 500;
  padding: 0.75rem;
  border-radius: 8px;
}

.recommendation-excellent {
  background-color: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.recommendation-good {
  background-color: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.recommendation-moderate {
  background-color: #ffe4b5;
  color: #b45309;
  border: 1px solid #fcd34d;
}

.recommendation-low {
  background-color: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

/* Bar Chart Styles */
.proficiency-section {
  margin-bottom: 2.5rem;
}

.bar-chart-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.skill-bar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skill-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skill-name {
  font-weight: 500;
  color: #111827;
}

.proficiency-labels {
  display: flex;
  gap: 1rem;
}

.current-label, .required-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.bar-container {
  position: relative;
  height: 20px;
  width: 100%;
  background-color: #f3f4f6;
  border-radius: 10px;
  overflow: hidden;
}

.bar-bg {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background-color: #f3f4f6;
}

.bar-current {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-color: #93c5fd;
  border-radius: 10px;
  transition: width 0.5s ease;
}

.bar-required {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-color: #3b82f6;
  border-radius: 10px;
  opacity: 0.5;
  transition: width 0.5s ease;
}

/* Missing Skills Styles */
.missing-skills-section {
  margin-bottom: 2.5rem;
}

.missing-skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.skill-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.skill-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.skill-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.skill-card-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.priority-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.priority-high {
  background-color: #fee2e2;
  color: #b91c1c;
}

.priority-medium {
  background-color: #fffbeb;
  color: #b45309;
}

.priority-low {
  background-color: #ecfdf5;
  color: #047857;
}

.skill-description {
  color: #6b7280;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.skill-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.action-button {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.learn-button {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.learn-button:hover {
  background-color: #bfdbfe;
}

.practice-button {
  background-color: #dcfce7;
  color: #166534;
}

.practice-button:hover {
  background-color: #bbf7d0;
}

.certify-button {
  background-color: #f3e8ff;
  color: #7c3aed;
}

.certify-button:hover {
  background-color: #e9d5ff;
}

/* Comparison Table Styles */
.comparison-table-section {
  margin-bottom: 1rem;
}

.table-container {
  overflow-x: auto;
}

.skills-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.skills-table th {
  background-color: #f9fafb;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
}

.skills-table td {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  color: #374151;
}

.skills-table tr:last-child td {
  border-bottom: none;
}

.skills-table tr:hover {
  background-color: #f9fafb;
}

.row-match {
  background-color: #f0fdf4;
}

.row-gap {
  background-color: #fffbeb;
}

.row-excess {
  background-color: #f0f9ff;
}

.level-display {
  display: flex;
  align-items: center;
  height: 100%;
}

.level-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.current-level {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.required-level {
  background-color: #bfdbfe;
  color: #1e40af;
}

.gap-display {
  display: flex;
  align-items: center;
  height: 100%;
}

.gap-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.gap-none {
  background-color: #e5e7eb;
  color: #374151;
}

.gap-positive {
  background-color: #fffbeb;
  color: #b45309;
}

.gap-negative {
  background-color: #ecfdf5;
  color: #047857;
}

.recommendation-text {
  font-size: 0.875rem;
  color: #4b5563;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .skill-gap-analysis {
    padding: 1.5rem;
  }

  .analysis-title {
    font-size: 1.75rem;
  }

  .analysis-subtitle {
    font-size: 1rem;
  }

  .section-title {
    font-size: 1.25rem;
  }

  .radial-chart-container {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .score-details {
    max-width: 100%;
  }

  .missing-skills-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}

@media (max-width: 768px) {
  .skill-gap-analysis {
    padding: 1.25rem;
  }

  .analysis-title {
    font-size: 1.5rem;
  }

  .analysis-subtitle {
    font-size: 0.9rem;
  }

  .section-title {
    font-size: 1.125rem;
  }

  .radial-chart {
    width: 150px;
    height: 150px;
  }

  .radial-text {
    font-size: 20px;
  }

  .skill-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .proficiency-labels {
    width: 100%;
    justify-content: space-between;
  }

  .missing-skills-grid {
    grid-template-columns: 1fr;
  }

  .skill-actions {
    flex-direction: column;
  }

  .action-button {
    width: 100%;
  }

  .skills-table th,
  .skills-table td {
    padding: 0.75rem 0.5rem;
    font-size: 0.875rem;
  }
}

@media (max-width: 480px) {
  .skill-gap-analysis {
    padding: 1rem;
  }

  .analysis-title {
    font-size: 1.25rem;
  }

  .analysis-subtitle {
    font-size: 0.8rem;
  }

  .section-title {
    font-size: 1rem;
  }

  .radial-chart {
    width: 120px;
    height: 120px;
  }

  .radial-text {
    font-size: 16px;
  }

  .score-description {
    font-size: 0.9rem;
  }

  .skill-name {
    font-size: 0.9rem;
  }

  .current-label,
  .required-label {
    font-size: 0.75rem;
  }

  .skill-card {
    padding: 1rem;
  }

  .skill-card-title {
    font-size: 1rem;
  }

  .skill-description {
    font-size: 0.875rem;
  }
}
</style>