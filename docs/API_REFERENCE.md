# JobNaut API Reference

Complete tRPC API documentation for the JobNaut platform.

## Table of Contents

- [Authentication](#authentication)
- [Base URL](#base-url)
- [Jobs API](#jobs-api)
- [User Profile API](#user-profile-api)
- [Chat API](#chat-api)
- [Skill Gap Analysis API](#skill-gap-analysis-api)
- [Saved Jobs API](#saved-jobs-api)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## Authentication

JobNaut uses **Clerk** for authentication. All protected endpoints require a valid authentication token.

### Authentication Headers

```javascript
{
  "Authorization": "Bearer YOUR_AUTH_TOKEN"
}
```

### User Context

Authenticated requests automatically inject the user context:

```typescript
{
  user: {
    id: string;
    email: string;
    // Additional user properties
  }
}
```

## Base URL

**Development:** `http://localhost:4000/trpc`
**Production:** `https://your-domain.com/trpc`

## Jobs API

### jobs.search

Search for jobs with filters.

**Type:** Query (Public)
**Endpoint:** `jobs.search`

**Input Schema:**

```typescript
{
  query?: string;          // Search query
  location?: string;       // Job location
  remote?: boolean;        // Remote work option
  experienceLevel?: string; // Experience level filter
  limit?: number;          // Results per page (1-100, default: 10)
  offset?: number;         // Pagination offset (default: 0)
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
    postedDate: string;      // ISO 8601 format
    applicationLink: string;
  }>;
  totalCount: number;
}
```

**Example Request:**

```typescript
const result = await trpc.jobs.search.query({
  query: "Software Engineer",
  location: "Remote",
  remote: true,
  experienceLevel: "mid",
  limit: 20,
  offset: 0
});
```

**Example Response:**

```json
{
  "jobs": [
    {
      "id": 1,
      "title": "Senior Software Engineer",
      "company": "TechCorp Inc.",
      "location": "Remote",
      "description": "We are seeking an experienced software engineer...",
      "skills": ["JavaScript", "React", "Node.js", "PostgreSQL"],
      "postedDate": "2025-11-15T00:00:00.000Z",
      "applicationLink": "https://techcorp.com/apply/123"
    }
  ],
  "totalCount": 156
}
```

### jobs.getById

Get detailed information about a specific job.

**Type:** Query (Public)
**Endpoint:** `jobs.getById`

**Input Schema:**

```typescript
{
  id: number; // Job ID (required)
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

**Example Request:**

```typescript
const job = await trpc.jobs.getById.query({ id: 123 });
```

**Error Response:**

```json
{
  "error": "Job not found"
}
```

### jobs.getRecommended

Get personalized job recommendations based on user profile.

**Type:** Query (Protected)
**Endpoint:** `jobs.getRecommended`

**Authentication:** Required

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
  matchScore: number; // 0-100 match score
}>
```

**Example Request:**

```typescript
const recommendations = await trpc.jobs.getRecommended.query();
```

**Example Response:**

```json
[
  {
    "id": 456,
    "title": "Full Stack Developer",
    "company": "StartupXYZ",
    "location": "New York, NY",
    "description": "Join our fast-growing team...",
    "skills": ["React", "Node.js", "MongoDB"],
    "postedDate": "2025-11-20T00:00:00.000Z",
    "applicationLink": "https://startupxyz.com/careers/456",
    "matchScore": 85
  }
]
```

## User Profile API

### user.getProfile

Get the authenticated user's profile.

**Type:** Query (Protected)
**Endpoint:** `user.getProfile`

**Authentication:** Required

**Response:**

```typescript
{
  id: string;
  name: string;
  email: string;
  location?: string;
  experienceLevel?: string;
  skills: string[];
  createdAt: string;
  updatedAt: string;
}
```

**Example Request:**

```typescript
const profile = await trpc.user.getProfile.query();
```

### user.updateProfile

Update the authenticated user's profile.

**Type:** Mutation (Protected)
**Endpoint:** `user.updateProfile`

**Authentication:** Required

**Input Schema:**

```typescript
{
  name?: string;
  location?: string;
  experienceLevel?: string;
  skills?: string[];
}
```

**Response:**

```typescript
{
  success: boolean;
  profile: {
    // Updated profile object
  }
}
```

**Example Request:**

```typescript
const result = await trpc.user.updateProfile.mutate({
  name: "John Doe",
  location: "San Francisco, CA",
  experienceLevel: "senior",
  skills: ["JavaScript", "Python", "AWS"]
});
```

### user.addSkills

Add skills to the user's profile.

**Type:** Mutation (Protected)
**Endpoint:** `user.addSkills`

**Authentication:** Required

**Input Schema:**

```typescript
{
  skills: string[]; // Array of skill names
}
```

**Response:**

```typescript
{
  success: boolean;
  profile: {
    // Updated profile with new skills
  }
}
```

**Example Request:**

```typescript
const result = await trpc.user.addSkills.mutate({
  skills: ["Docker", "Kubernetes", "TypeScript"]
});
```

### user.removeSkills

Remove skills from the user's profile.

**Type:** Mutation (Protected)
**Endpoint:** `user.removeSkills`

**Authentication:** Required

**Input Schema:**

```typescript
{
  skills: string[]; // Array of skill names to remove
}
```

**Response:**

```typescript
{
  success: boolean;
  profile: {
    // Updated profile without removed skills
  }
}
```

## Chat API

### chat.getConversationHistory

Get conversation history for the authenticated user.

**Type:** Query (Protected)
**Endpoint:** `chat.getConversationHistory`

**Authentication:** Required

**Response:**

```typescript
{
  success: boolean;
  data: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>
}
```

**Example Request:**

```typescript
const history = await trpc.chat.getConversationHistory.query();
```

**Example Response:**

```json
{
  "success": true,
  "data": [
    {
      "role": "user",
      "content": "What skills should I learn for a DevOps role?",
      "timestamp": "2025-11-20T10:30:00.000Z"
    },
    {
      "role": "assistant",
      "content": "For a DevOps role, I recommend focusing on...",
      "timestamp": "2025-11-20T10:30:05.000Z"
    }
  ]
}
```

### chat.sendMessage

Send a message to the AI career coach.

**Type:** Mutation (Protected)
**Endpoint:** `chat.sendMessage`

**Authentication:** Required

**Input Schema:**

```typescript
{
  message: string; // 1-1000 characters
}
```

**Response:**

```typescript
{
  success: boolean;
  data: {
    userMessage: {
      role: "user";
      content: string;
      timestamp: string;
    };
    aiMessage: {
      role: "assistant";
      content: string;
      timestamp: string;
    };
  }
}
```

**Example Request:**

```typescript
const response = await trpc.chat.sendMessage.mutate({
  message: "How can I transition from frontend to full-stack development?"
});
```

**Validation Errors:**

- Message must be 1-1000 characters
- Empty messages are not allowed

### chat.clearHistory

Clear conversation history for the authenticated user.

**Type:** Mutation (Protected)
**Endpoint:** `chat.clearHistory`

**Authentication:** Required

**Response:**

```typescript
{
  success: boolean;
  message: string;
}
```

**Example Request:**

```typescript
const result = await trpc.chat.clearHistory.mutate();
```

## Skill Gap Analysis API

### skillGap.getAnalysisForJob

Get skill gap analysis for a specific job.

**Type:** Query (Protected)
**Endpoint:** `skillGap.getAnalysisForJob`

**Authentication:** Required

**Input Schema:**

```typescript
{
  userId: string;  // User ID (required)
  jobId: number;   // Job ID (required, positive number)
}
```

**Response:**

```typescript
{
  userId: string;
  jobId: number;
  matchingSkills: string[];
  missingSkills: string[];
  matchPercentage: number;
  recommendations: Array<{
    skill: string;
    priority: "high" | "medium" | "low";
    resources: string[];
  }>;
}
```

**Example Request:**

```typescript
const analysis = await trpc.skillGap.getAnalysisForJob.query({
  userId: "user_123",
  jobId: 456
});
```

**Example Response:**

```json
{
  "userId": "user_123",
  "jobId": 456,
  "matchingSkills": ["JavaScript", "React", "Node.js"],
  "missingSkills": ["GraphQL", "Docker", "Kubernetes"],
  "matchPercentage": 60,
  "recommendations": [
    {
      "skill": "GraphQL",
      "priority": "high",
      "resources": [
        "https://graphql.org/learn/",
        "Apollo GraphQL Tutorial"
      ]
    }
  ]
}
```

### skillGap.getAnalysisForJobs

Get skill gap analyses for multiple jobs.

**Type:** Query (Protected)
**Endpoint:** `skillGap.getAnalysisForJobs`

**Authentication:** Required

**Input Schema:**

```typescript
{
  userId: string;
  jobIds: number[]; // Array of job IDs (min 1, positive numbers)
}
```

**Response:**

```typescript
Array<{
  userId: string;
  jobId: number;
  matchingSkills: string[];
  missingSkills: string[];
  matchPercentage: number;
  recommendations: Array<{
    skill: string;
    priority: string;
    resources: string[];
  }>;
}>
```

### skillGap.getOverallAnalysis

Get overall skill gap analysis across all saved jobs.

**Type:** Query (Protected)
**Endpoint:** `skillGap.getOverallAnalysis`

**Authentication:** Required

**Input Schema:**

```typescript
{
  userId: string;
}
```

**Response:**

```typescript
{
  userId: string;
  overallMatchPercentage: number;
  totalSkillsNeeded: number;
  totalSkillsMatching: number;
  mostCommonMissingSkills: Array<{
    skill: string;
    frequency: number;
  }>;
  priorityRecommendations: Array<{
    skill: string;
    priority: string;
    resources: string[];
  }>;
}
```

## Saved Jobs API

### savedJobs.getUserSavedJobs

Get all saved jobs for the authenticated user.

**Type:** Query (Protected)
**Endpoint:** `savedJobs.getUserSavedJobs`

**Authentication:** Required

**Response:**

```typescript
{
  savedJobs: Array<{
    id: number;
    userId: string;
    jobId: number;
    notes: string | null;
    applicationStatus: "not_applied" | "applied" | "interviewing" | "offer" | "rejected";
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
  }>;
  totalCount: number;
}
```

**Example Request:**

```typescript
const savedJobs = await trpc.savedJobs.getUserSavedJobs.query();
```

### savedJobs.saveJob

Save a job to the user's saved jobs list.

**Type:** Mutation (Protected)
**Endpoint:** `savedJobs.saveJob`

**Authentication:** Required

**Input Schema:**

```typescript
{
  jobId: number;  // Positive integer (required)
  notes?: string; // Max 1000 characters (optional)
  applicationStatus?: "not_applied" | "applied" | "interviewing" | "offer" | "rejected";
}
```

**Response:**

```typescript
{
  success: boolean;
  message: string;
  savedJob: {
    id: number;
    jobId: number;
    userId: string;
    notes: string | null;
    applicationStatus: string;
    savedAt: string;
  }
}
```

**Example Request:**

```typescript
const result = await trpc.savedJobs.saveJob.mutate({
  jobId: 123,
  notes: "Great fit for my skills",
  applicationStatus: "not_applied"
});
```

**Error Cases:**

- Job already saved: `"Job is already saved"`
- Invalid job ID: Validation error

### savedJobs.unsaveJob

Remove a job from saved jobs.

**Type:** Mutation (Protected)
**Endpoint:** `savedJobs.unsaveJob`

**Authentication:** Required

**Input Schema:**

```typescript
{
  jobId: number; // Positive integer (required)
}
```

**Response:**

```typescript
{
  success: boolean;
  message: string;
}
```

**Example Request:**

```typescript
const result = await trpc.savedJobs.unsaveJob.mutate({
  jobId: 123
});
```

### savedJobs.updateNotes

Update notes on a saved job.

**Type:** Mutation (Protected)
**Endpoint:** `savedJobs.updateNotes`

**Authentication:** Required

**Input Schema:**

```typescript
{
  jobId: number;  // Positive integer (required)
  notes: string;  // Max 1000 characters (required)
}
```

**Response:**

```typescript
{
  success: boolean;
  message: string;
  savedJob: {
    id: number;
    jobId: number;
    userId: string;
    notes: string;
    applicationStatus: string;
  }
}
```

**Example Request:**

```typescript
const result = await trpc.savedJobs.updateNotes.mutate({
  jobId: 123,
  notes: "Updated: Applied on 2025-11-20. Waiting for response."
});
```

### savedJobs.checkIfSaved

Check if a specific job is saved by the user.

**Type:** Query (Protected)
**Endpoint:** `savedJobs.checkIfSaved`

**Authentication:** Required

**Input Schema:**

```typescript
{
  jobId: number; // Positive integer (required)
}
```

**Response:**

```typescript
{
  isSaved: boolean;
  savedJob: {
    id: number;
    notes: string | null;
    applicationStatus: string;
    savedAt: string;
  } | null;
}
```

**Example Request:**

```typescript
const result = await trpc.savedJobs.checkIfSaved.query({
  jobId: 123
});
```

## Error Handling

### Error Response Format

All errors follow a consistent format:

```typescript
{
  error: string;        // Error type
  message: string;      // Human-readable error message
  code?: string;        // Error code (optional)
  statusCode?: number;  // HTTP status code (optional)
}
```

### Common Error Codes

| Status Code | Error Type | Description |
|------------|-----------|-------------|
| 400 | Bad Request | Invalid input or validation error |
| 401 | Unauthorized | Authentication required or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

### Error Examples

**Validation Error:**

```json
{
  "error": "Validation Error",
  "message": "Message cannot be empty",
  "statusCode": 400
}
```

**Authentication Error:**

```json
{
  "error": "Unauthorized",
  "message": "Authentication required",
  "statusCode": 401
}
```

**Rate Limit Error:**

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "statusCode": 429
}
```

## Rate Limiting

JobNaut implements rate limiting to ensure fair usage and protect against abuse.

### Rate Limit Rules

| Endpoint Type | Window | Max Requests | Environment |
|--------------|--------|--------------|-------------|
| API Routes | 15 minutes | 100 | Production |
| API Routes | 15 minutes | 500 | Development |
| Auth Routes | 15 minutes | 5 | All |

### Rate Limit Headers

All responses include rate limit information in headers:

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1700582400
```

### Handling Rate Limits

When rate limited, implement exponential backoff:

```typescript
async function makeRequestWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.statusCode === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

## Best Practices

### 1. Error Handling

Always wrap tRPC calls in try-catch blocks:

```typescript
try {
  const result = await trpc.jobs.search.query(params);
  // Handle success
} catch (error) {
  // Handle error
  console.error('API Error:', error.message);
}
```

### 2. Pagination

Use pagination for large result sets:

```typescript
const pageSize = 20;
const page = 1;

const results = await trpc.jobs.search.query({
  query: "developer",
  limit: pageSize,
  offset: (page - 1) * pageSize
});
```

### 3. Input Validation

Validate inputs before sending requests:

```typescript
const MAX_MESSAGE_LENGTH = 1000;

if (message.length > MAX_MESSAGE_LENGTH) {
  throw new Error('Message too long');
}

await trpc.chat.sendMessage.mutate({ message });
```

### 4. Authentication Refresh

Implement token refresh logic for long-running sessions:

```typescript
// Refresh auth token before expiration
async function ensureAuthenticated() {
  if (isTokenExpiringSoon()) {
    await refreshAuthToken();
  }
}
```

### 5. Caching

Implement client-side caching for frequently accessed data:

```typescript
// Cache job details for 5 minutes
const jobCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function getJobWithCache(jobId) {
  const cached = jobCache.get(jobId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const job = await trpc.jobs.getById.query({ id: jobId });
  jobCache.set(jobId, { data: job, timestamp: Date.now() });
  return job;
}
```

## Support

For API-related questions or issues:

- GitHub Issues: https://github.com/mrkingsleyobi/jobnaut/issues
- Documentation: https://github.com/mrkingsleyobi/jobnaut/docs

## Version History

- **v1.0.0** (2025-11-21): Initial API release
  - Jobs API with search and recommendations
  - User profile management
  - AI chat functionality
  - Skill gap analysis
  - Saved jobs management
