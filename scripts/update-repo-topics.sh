#!/bin/bash

# Script to update repository topics for better SEO discoverability
# This script should be run by a user with repository admin permissions

echo "Updating repository topics for JobNaut..."

# Topics focused on fast-growing, low-competition keywords:
# AI career coach, skill gap analysis, personalized job recommendations
TOPICS=(
  "ai-career-coach"
  "job-search-platform"
  "skill-gap-analysis"
  "personalized-recommendations"
  "career-development"
  "remote-work-opportunities"
  "job-market-insights"
  "resume-optimization"
  "career-transition"
  "professional-skills"
  "job-matching"
  "career-advice"
  "employment-opportunities"
  "job-discovery"
  "ai-job-search"
  "career-guidance"
  "skill-assessment"
  "job-recommendations"
  "career-path"
  "employment-platform"
)

echo "Recommended topics to add:"
for topic in "${TOPICS[@]}"; do
  echo "  - $topic"
done

echo ""
echo "To add these topics, run the following command (requires admin permissions):"
echo "gh api -X PUT repos/mrkingsleyobi/jobnaut/topics --field names[]='${TOPICS[0]}' names[]='${TOPICS[1]}' names[]='${TOPICS[2]}' names[]='${TOPICS[3]}' names[]='${TOPICS[4]}' names[]='${TOPICS[5]}' names[]='${TOPICS[6]}' names[]='${TOPICS[7]}' names[]='${TOPICS[8]}' names[]='${TOPICS[9]}' names[]='${TOPICS[10]}' names[]='${TOPICS[11]}' names[]='${TOPICS[12]}' names[]='${TOPICS[13]}' names[]='${TOPICS[14]}' names[]='${TOPICS[15]}' names[]='${TOPICS[16]}' names[]='${TOPICS[17]}' names[]='${TOPICS[18]}' names[]='${TOPICS[19]}'"