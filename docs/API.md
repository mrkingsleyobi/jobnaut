# JobNaut API Documentation

## Overview

JobNaut provides a type-safe tRPC API for all backend operations. REST endpoints are deprecated and will be removed in the future.

**Base URL (tRPC):** `/api/trpc`

**Base URL (REST - Deprecated):** `/api`

## Authentication

All protected endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## tRPC API Endpoints

### Jobs Router (`jobs.*`)

#### `jobs.search` (Query)
Search for jobs with optional filters.

**Access:** Public

**Input:**
```typescript
{
  query?: string;           // Search query
  location?: string;        // Job location
  remote?: boolean;         // Remote jobs only
  experienceLevel?: string; // Experience level filter
  limit?: number;           // Results per page (1-100, default: 10)
  offset?: number;          // Pagination offset (default: 0)
}
```

**Response:**
```typescript
{
  jobs: Array<{
    id: number;
    title: string;
    company: string;
    location: string;
    description: string;
    skills: string[];
    postedDate: string;
    applicationLink: string;
  }>;
  totalCount: number;
}
```

**Example:**
```typescript
const result = await trpc.jobs.search.query({
  query: 'software engineer',
  location: 'San Francisco',
  remote: true,
  limit: 20,
  offset: 0
});
```

---

#### `jobs.getById` (Query)
Get a specific job by its ID.

**Access:** Public

**Input:**
```typescript
{
  id: number; // Job ID
}
```

**Response:**
```typescript
{
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  skills: string[];
  postedDate: string;
  applicationLink: string;
}
```

**Example:**
```typescript
const job = await trpc.jobs.getById.query({ id: 123 });
```

**Error Codes:**
- `NOT_FOUND`: Job not found

---

#### `jobs.getRecommended` (Query)
Get personalized job recommendations based on user's profile and skills.

**Access:** Protected (requires authentication)

**Input:** None (uses authenticated user's data)

**Response:**
```typescript
Array<{
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  skills: string[];
  postedDate: string;
  applicationLink: string;
  matchScore: number; // 0-100
}>
```

**Example:**
```typescript
const recommendations = await trpc.jobs.getRecommended.query();
```

**Error Codes:**
- `UNAUTHORIZED`: User not authenticated

---

#### `jobs.getAll` (Query)
Get all jobs with pagination and sorting options.

**Access:** Public

**Input:**
```typescript
{
  page?: number;              // Page number (min: 1, default: 1)
  limit?: number;             // Items per page (1-100, default: 20)
  sortBy?: 'postedDate' | 'title' | 'company'; // Sort field (default: 'postedDate')
  sortOrder?: 'asc' | 'desc'; // Sort order (default: 'desc')
}
```

**Response:**
```typescript
{
  jobs: Array<{
    id: number;
    title: string;
    company: string;
    location: string;
    description: string;
    skills: string[];
    postedDate: string;
    applicationLink: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}
```

**Example:**
```typescript
const result = await trpc.jobs.getAll.query({
  page: 1,
  limit: 20,
  sortBy: 'postedDate',
  sortOrder: 'desc'
});
```

---

### User Router (`user.*`)

#### `user.getProfile` (Query)
Get the authenticated user's profile.

**Access:** Protected

**Input:** None

**Response:**
```typescript
{
  id: string;
  email: string;
  name: string;
  location?: string;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'lead';
  skills: string[];
  createdAt: string;
  updatedAt: string;
}
```

**Example:**
```typescript
const profile = await trpc.user.getProfile.query();
```

**Error Codes:**
- `UNAUTHORIZED`: User not authenticated

---

#### `user.updateProfile` (Mutation)
Update the authenticated user's profile.

**Access:** Protected

**Input:**
```typescript
{
  name?: string;
  location?: string;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'lead';
  skills?: string[];
}
```

**Response:**
```typescript
{
  success: true;
  profile: {
    id: string;
    email: string;
    name: string;
    location?: string;
    experienceLevel?: string;
    skills: string[];
    createdAt: string;
    updatedAt: string;
  };
}
```

**Example:**
```typescript
const result = await trpc.user.updateProfile.mutate({
  name: 'John Doe',
  location: 'New York',
  experienceLevel: 'mid',
  skills: ['JavaScript', 'React', 'Node.js']
});
```

**Error Codes:**
- `UNAUTHORIZED`: User not authenticated
- `BAD_REQUEST`: Invalid input data

---

#### `user.addSkills` (Mutation)
Add skills to the authenticated user's profile.

**Access:** Protected

**Input:**
```typescript
{
  skills: string[]; // Array of skill names (1-50 items)
}
```

**Response:**
```typescript
{
  success: true;
  profile: {
    id: string;
    skills: string[];
    // ... other profile fields
  };
}
```

**Example:**
```typescript
const result = await trpc.user.addSkills.mutate({
  skills: ['TypeScript', 'GraphQL']
});
```

**Error Codes:**
- `UNAUTHORIZED`: User not authenticated
- `BAD_REQUEST`: Invalid skills array

---

#### `user.removeSkills` (Mutation)
Remove skills from the authenticated user's profile.

**Access:** Protected

**Input:**
```typescript
{
  skills: string[]; // Array of skill names to remove
}
```

**Response:**
```typescript
{
  success: true;
  profile: {
    id: string;
    skills: string[];
    // ... other profile fields
  };
}
```

**Example:**
```typescript
const result = await trpc.user.removeSkills.mutate({
  skills: ['PHP', 'jQuery']
});
```

---

### Chat Router (`chat.*`)

#### `chat.getConversationHistory` (Query)
Get the authenticated user's conversation history with the AI chatbot.

**Access:** Protected

**Input:** None

**Response:**
```typescript
{
  success: true;
  data: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
}
```

**Example:**
```typescript
const history = await trpc.chat.getConversationHistory.query();
```

---

#### `chat.sendMessage` (Mutation)
Send a message to the AI chatbot.

**Access:** Protected

**Input:**
```typescript
{
  message: string; // Message content (1-1000 characters)
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    userMessage: {
      role: 'user';
      content: string;
      timestamp: string;
    };
    aiMessage: {
      role: 'assistant';
      content: string;
      timestamp: string;
    };
  };
}
```

**Example:**
```typescript
const response = await trpc.chat.sendMessage.mutate({
  message: 'What jobs match my skills?'
});
```

**Error Codes:**
- `UNAUTHORIZED`: User not authenticated
- `BAD_REQUEST`: Message too long or empty

---

#### `chat.clearHistory` (Mutation)
Clear the authenticated user's conversation history.

**Access:** Protected

**Input:** None

**Response:**
```typescript
{
  success: true;
  message: string;
}
```

**Example:**
```typescript
const result = await trpc.chat.clearHistory.mutate();
```

---

### Skill Gap Router (`skillGap.*`)

#### `skillGap.analyze` (Query)
Analyze skill gaps between user's skills and job requirements.

**Access:** Protected

**Input:**
```typescript
{
  jobId: number; // Job ID to analyze
}
```

**Response:**
```typescript
{
  missingSkills: string[];
  matchingSkills: string[];
  matchPercentage: number;
  recommendations: string[];
}
```

---

### Saved Jobs Router (`savedJobs.*`)

#### `savedJobs.getAll` (Query)
Get all jobs saved by the authenticated user.

**Access:** Protected

**Input:** None

**Response:**
```typescript
Array<{
  id: number;
  jobId: number;
  savedAt: string;
  job: {
    id: number;
    title: string;
    company: string;
    location: string;
    description: string;
    skills: string[];
    postedDate: string;
    applicationLink: string;
  };
}>
```

---

#### `savedJobs.add` (Mutation)
Save a job to the user's saved jobs list.

**Access:** Protected

**Input:**
```typescript
{
  jobId: number; // Job ID to save
}
```

**Response:**
```typescript
{
  success: true;
  savedJob: {
    id: number;
    jobId: number;
    savedAt: string;
  };
}
```

---

#### `savedJobs.remove` (Mutation)
Remove a job from the user's saved jobs list.

**Access:** Protected

**Input:**
```typescript
{
  jobId: number; // Job ID to remove
}
```

**Response:**
```typescript
{
  success: true;
  message: string;
}
```

---

## Error Handling

All tRPC endpoints return standardized errors with the following structure:

```typescript
{
  code: string;        // Error code (e.g., 'UNAUTHORIZED', 'NOT_FOUND')
  message: string;     // Human-readable error message
  data?: {            // Optional additional error data
    zodError?: object; // Validation errors from Zod
    stack?: string;    // Stack trace (development only)
  };
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `BAD_REQUEST` | 400 | Invalid request data |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

---

## Deprecated REST Endpoints

The following REST endpoints are deprecated and will be removed on **2024-06-01**. Please migrate to tRPC equivalents.

### User Endpoints (Deprecated)

| REST Endpoint | tRPC Equivalent | Sunset Date |
|---------------|-----------------|-------------|
| `GET /api/user/profile` | `user.getProfile` | 2024-06-01 |
| `PUT /api/user/profile` | `user.updateProfile` | 2024-06-01 |
| `POST /api/user/skills` | `user.addSkills` | 2024-06-01 |
| `DELETE /api/user/skills` | `user.removeSkills` | 2024-06-01 |

### Chat Endpoints (Deprecated)

| REST Endpoint | tRPC Equivalent | Sunset Date |
|---------------|-----------------|-------------|
| `GET /api/chat/history/:userId` | `chat.getConversationHistory` | 2024-06-01 |
| `POST /api/chat/message` | `chat.sendMessage` | 2024-06-01 |
| `DELETE /api/chat/history/:userId` | `chat.clearHistory` | 2024-06-01 |

**Deprecation Headers:**
All deprecated REST endpoints include the following headers:
- `X-API-Deprecated: true`
- `X-API-Deprecation-Date: 2024-01-01`
- `X-API-Alternative: tRPC: <endpoint>`
- `X-API-Sunset-Date: 2024-06-01`

---

## Frontend Integration

### Setup tRPC Client

```typescript
// src/api/trpcClient.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from './types';

export const trpc = createTRPCReact<AppRouter>();
```

### Usage in React Components

```typescript
import { trpc } from './api/trpcClient';

function JobsList() {
  const { data, isLoading, error } = trpc.jobs.search.useQuery({
    query: 'software engineer',
    limit: 20
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data.jobs.map(job => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
```

### Mutations Example

```typescript
function ProfileEditor() {
  const mutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      console.log('Profile updated!');
    }
  });

  const handleSubmit = (data) => {
    mutation.mutate(data);
  };

  return <ProfileForm onSubmit={handleSubmit} />;
}
```

---

## Rate Limiting

All API endpoints are rate-limited to prevent abuse:

- **Authenticated requests:** 1000 requests per hour
- **Public requests:** 100 requests per hour

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

---

## Support

For API support or questions, please contact:
- Email: support@jobnaut.com
- GitHub: https://github.com/jobnaut/jobnaut/issues

---

**Last Updated:** November 21, 2024
**API Version:** 1.0.0
