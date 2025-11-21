# Caching Implementation in JobNaut

## Overview

This document describes the caching implementation added to JobNaut to improve performance and reduce database load. Caching is implemented using NodeCache, an in-memory caching library that provides a simple key-value store with automatic expiration.

## Implementation Details

### 1. Job Model Caching

The Job model (`src/models/job.js`) implements caching for frequently accessed data:

- **Job by ID**: Cached with key `job_{id}` for 5 minutes
- **Search Results**: Cached with key `search_{query}_{page}_{limit}` for 5 minutes

Cache invalidation occurs when:

- New jobs are created (flushes all cache)
- Jobs are updated (removes specific job and flushes search cache)
- Jobs are deleted (removes specific job and flushes search cache)

### 2. User Model Caching

The User model (`src/models/user.js`) implements caching for user profile data:

- **User by ID**: Cached with key `user_{id}` for 5 minutes
- **User by Clerk ID**: Cached with key `user_clerk_{clerkId}` for 5 minutes
- **User by Email**: Cached with key `user_email_{email}` for 5 minutes

Cache invalidation occurs when:

- User profiles are updated (removes all cached entries for that user)
- Users are deleted (removes all cached entries for that user)

### 3. Saved Job Model Caching

The Saved Job model (`src/models/savedJob.js`) implements caching for saved job data:

- **Saved jobs by user**: Cached with key `saved_jobs_{userId}` for 5 minutes
- **Individual saved job**: Cached with key `saved_job_{userId}_{jobId}` for 5 minutes

Cache invalidation occurs when:

- New jobs are saved (removes user's saved jobs cache)
- Saved jobs are updated (removes specific saved job and user's saved jobs cache)
- Saved jobs are deleted (removes specific saved job and user's saved jobs cache)

## Cache Configuration

All caches use the following configuration:

- **TTL (Time To Live)**: 300 seconds (5 minutes)
- **Type**: In-memory caching using NodeCache
- **Scope**: Per-server instance (not shared across multiple server instances)

## Performance Benefits

The caching implementation provides the following performance benefits:

1. **Reduced Database Queries**: Frequently accessed data is served from cache
2. **Faster Response Times**: Cache hits bypass database queries entirely
3. **Lower Server Load**: Reduced database load improves overall server performance
4. **Better User Experience**: Faster page loads and API responses

## Future Improvements

Consider the following enhancements for production environments:

1. **Distributed Caching**: Use Redis or Memcached for shared cache across multiple server instances
2. **Cache Warming**: Pre-populate cache with frequently accessed data
3. **Cache Monitoring**: Add metrics to track cache hit/miss ratios
4. **Adaptive TTL**: Adjust cache expiration based on data access patterns

## Cache Keys Reference

| Data Type          | Cache Key Pattern               | Example                       |
| ------------------ | ------------------------------- | ----------------------------- |
| Job by ID          | `job_{id}`                      | `job_123`                     |
| Job Search         | `search_{query}_{page}_{limit}` | `search_software_1_10`        |
| User by ID         | `user_{id}`                     | `user_456`                    |
| User by Clerk ID   | `user_clerk_{clerkId}`          | `user_clerk_user_789`         |
| User by Email      | `user_email_{email}`            | `user_email_john@example.com` |
| Saved Jobs by User | `saved_jobs_{userId}`           | `saved_jobs_456`              |
| Saved Job          | `saved_job_{userId}_{jobId}`    | `saved_job_456_123`           |
