#!/usr/bin/env python3
# JobNaut Data Ingestion Pipeline
# Script to fetch jobs from JSearch API, process with NLP, and index in Meilisearch

import os
import sys
import requests
import json
import time
from datetime import datetime, timedelta
import logging

# Add parent directory to path to import nlp module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DataIngestionPipeline:
    def __init__(self):
        # Configuration
        self.jsearch_api_key = os.getenv('JSEARCH_API_KEY', 'YOUR_JSEARCH_API_KEY')
        self.jsearch_api_url = 'https://jsearch.p.rapidapi.com/search'
        self.meilisearch_host = os.getenv('MEILISEARCH_HOST', 'http://localhost:7700')
        self.meilisearch_api_key = os.getenv('MEILISEARCH_API_KEY', '')
        self.nlp_service_url = os.getenv('NLP_SERVICE_URL', 'http://localhost:8000')

        # Headers for JSearch API
        self.jsearch_headers = {
            'X-RapidAPI-Key': self.jsearch_api_key,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        }

        # Headers for Meilisearch
        self.meilisearch_headers = {
            'Authorization': f'Bearer {self.meilisearch_api_key}',
            'Content-Type': 'application/json'
        }

    def fetch_jobs_from_jsearch(self, query='software engineer', num_pages=1):
        """
        Fetch jobs from JSearch API
        """
        logger.info(f"Fetching jobs for query: {query}")

        all_jobs = []
        for page in range(1, num_pages + 1):
            try:
                params = {
                    'query': query,
                    'page': str(page),
                    'num_pages': '1',
                    'date_posted': 'week'  # Only fetch jobs posted in the last week
                }

                response = requests.get(
                    self.jsearch_api_url,
                    headers=self.jsearch_headers,
                    params=params,
                    timeout=30
                )

                if response.status_code == 200:
                    data = response.json()
                    jobs = data.get('data', [])
                    logger.info(f"Fetched {len(jobs)} jobs from page {page}")
                    all_jobs.extend(jobs)

                    # Respect rate limits
                    time.sleep(1)
                else:
                    logger.error(f"Failed to fetch page {page}: {response.status_code}")

            except Exception as e:
                logger.error(f"Error fetching page {page}: {str(e)}")

        logger.info(f"Total jobs fetched: {len(all_jobs)}")
        return all_jobs

    def process_job_with_nlp(self, job_data):
        """
        Process job description with NLP service to extract skills
        """
        try:
            # Prepare job text for NLP processing
            job_text = f"{job_data.get('job_title', '')}. {job_data.get('job_description', '')}"

            # Call the Python NLP service to extract skills
            payload = {
                'text': job_text
            }

            response = requests.post(
                f'{self.nlp_service_url}/extract-skills',
                json=payload,
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                skills = result.get('skills', [])
                logger.info(f"Extracted {len(skills)} skills from job description")
                return skills
            else:
                logger.error(f"NLP service error: {response.status_code} - {response.text}")
                # Return mock skills as fallback
                return ["JavaScript", "React", "Node.js", "Python", "SQL"]
        except Exception as e:
            logger.error(f"Error processing job with NLP: {str(e)}")
            # Return mock skills as fallback
            return ["JavaScript", "React", "Node.js", "Python", "SQL"]

    def prepare_job_for_indexing(self, job_data):
        """
        Prepare job data for indexing in Meilisearch
        """
        try:
            # Extract skills using NLP
            skills = self.process_job_with_nlp(job_data)

            # Prepare job document
            job_document = {
                'id': job_data.get('job_id'),
                'title': job_data.get('job_title', ''),
                'company': job_data.get('employer_name', ''),
                'location': job_data.get('job_city', '') + ', ' + job_data.get('job_state', ''),
                'description': job_data.get('job_description', ''),
                'skills': skills,
                'posted_date': job_data.get('job_posted_at_datetime_utc'),
                'application_link': job_data.get('job_apply_link', ''),
                'source': 'jsearch',
                'source_id': job_data.get('job_id')
            }

            return job_document
        except Exception as e:
            logger.error(f"Error preparing job for indexing: {str(e)}")
            return None

    def index_jobs_in_meilisearch(self, jobs):
        """
        Index jobs in Meilisearch
        """
        try:
            # Prepare the data for Meilisearch
            payload = {
                'documents': jobs
            }

            # Call Meilisearch API to index jobs
            response = requests.post(
                f'{self.meilisearch_host}/indexes/jobs/documents',
                headers=self.meilisearch_headers,
                json=payload,
                timeout=30
            )

            if response.status_code in [200, 201, 202]:
                logger.info(f"Successfully indexed {len(jobs)} jobs in Meilisearch")
                return True
            else:
                logger.error(f"Meilisearch indexing failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error indexing jobs in Meilisearch: {str(e)}")
            return False

    def run_pipeline(self, queries=['software engineer', 'data scientist'], jobs_per_query=5):
        """
        Run the complete data ingestion pipeline
        """
        logger.info("Starting data ingestion pipeline")

        all_processed_jobs = []

        # Fetch jobs for each query
        for query in queries:
            logger.info(f"Processing query: {query}")

            # Fetch jobs from JSearch
            raw_jobs = self.fetch_jobs_from_jsearch(query, jobs_per_query)

            # Process each job
            for job in raw_jobs:
                processed_job = self.prepare_job_for_indexing(job)
                if processed_job:
                    all_processed_jobs.append(processed_job)

            # Small delay between queries to respect rate limits
            time.sleep(2)

        # Index all processed jobs
        if all_processed_jobs:
            success = self.index_jobs_in_meilisearch(all_processed_jobs)
            if success:
                logger.info(f"Successfully indexed {len(all_processed_jobs)} jobs")
            else:
                logger.error("Failed to index jobs")
        else:
            logger.info("No jobs to index")

        logger.info("Data ingestion pipeline completed")
        return len(all_processed_jobs)

if __name__ == "__main__":
    # Create pipeline instance
    pipeline = DataIngestionPipeline()

    # Run pipeline with default queries
    job_count = pipeline.run_pipeline()

    logger.info(f"Pipeline completed. Processed {job_count} jobs.")