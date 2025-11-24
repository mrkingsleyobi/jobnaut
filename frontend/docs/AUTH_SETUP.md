# Authentication Setup - JobNaut Frontend

## Overview

This document describes the authentication system implemented for the JobNaut frontend application.

## Files Created

### 1. Authentication Pages

#### `/home/user/jobnaut/frontend/pages/auth/login.vue`
- Email/password login form with validation
- "Remember me" checkbox
- Password visibility toggle
- OAuth login buttons (Google, GitHub)
- Links to signup and forgot password pages
- Redirects to `/profile` after successful login
- Real-time form validation with error messages

#### `/home/user/jobnaut/frontend/pages/auth/signup.vue`
- User registration form with comprehensive validation
- Fields: name, email, password, confirm password, skills (optional)
- Password strength indicator (4 levels: weak, fair, good, strong)
- Terms of service acceptance checkbox
- OAuth signup buttons (Google, GitHub)
- Redirects to `/profile` after successful registration
- Link to login page for existing users

#### `/home/user/jobnaut/frontend/pages/auth/forgot-password.vue`
- Email input for password reset requests
- Success message with email confirmation
- Resend functionality with 60-second countdown
- Link back to login page
- Clean, user-friendly UI with helpful information

#### `/home/user/jobnaut/frontend/pages/auth/callback.vue`
- OAuth callback handler for Google, GitHub, etc.
- Loading state while processing authentication
- Success state with auto-redirect to profile
- Error handling with retry option
- Extracts and validates OAuth parameters (code, state, error)

### 2. Authentication Composable

#### `/home/user/jobnaut/frontend/composables/useAuth.ts`
Centralized authentication state management with TypeScript support:

**Features:**
- Global auth state management
- User authentication status tracking
- Token management (localStorage)
- Login/signup/logout functionality
- OAuth authentication support
- Password reset functionality
- Session persistence

**Methods:**
```typescript
const {
  isAuthenticated,    // Computed: boolean
  currentUser,        // Computed: User | null
  loading,            // Computed: boolean
  login,              // (credentials) => Promise<AuthResponse>
  signup,             // (data) => Promise<AuthResponse>
  loginWithOAuth,     // (provider) => Promise<void>
  handleOAuthCallback,// ({ code, state }) => Promise<AuthResponse>
  resetPassword,      // (email) => Promise<AuthResponse>
  logout,             // () => Promise<{ success: boolean }>
  checkAuth,          // () => boolean
  getToken,           // () => string | null
  initAuth,           // () => void
} = useAuth();
```

### 3. Authentication Middleware

#### `/home/user/jobnaut/frontend/middleware/auth.js`
Route protection middleware that:
- Checks authentication status before accessing protected routes
- Redirects unauthenticated users to `/auth/login`
- Saves intended destination for post-login redirect
- Redirects authenticated users away from auth pages
- Protected routes: `/profile`, `/saved-jobs`, `/applications`

**Usage in pages:**
```vue
<script setup>
definePageMeta({
  middleware: 'auth'
})
</script>
```

### 4. Layout Updates

#### `/home/user/jobnaut/frontend/layouts/default.vue`
Enhanced with authentication features:

**For Unauthenticated Users:**
- Login button (links to `/auth/login`)
- Sign Up button (links to `/auth/signup`)

**For Authenticated Users:**
- Profile link
- User avatar with initials
- Dropdown menu with:
  - User name and email display
  - Your Profile link
  - Saved Jobs link
  - Logout button

**Features:**
- Reactive UI based on auth state
- User avatar with initials (e.g., "JD" for John Doe)
- Dropdown menu that closes on outside click
- Smooth animations and transitions
- Mobile-responsive design

## Styling

All pages use **Tailwind CSS** with:
- Consistent color scheme (blue/indigo gradients)
- Modern, clean design
- Responsive layouts for mobile, tablet, desktop
- Smooth transitions and hover effects
- Accessible form controls
- Loading states with spinners
- Error/success message displays

## Clerk Integration

### Current Status
The authentication system is **ready for Clerk integration** but currently uses a mock backend API. The composable includes TODO comments marking where Clerk SDK calls should be implemented.

### To Integrate Clerk:

1. **Install Clerk SDK:**
```bash
npm install @clerk/clerk-js
```

2. **Update `useAuth.ts` composable:**
Replace mock API calls with Clerk methods:

```typescript
import { Clerk } from '@clerk/clerk-js';

const clerk = new Clerk(process.env.NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// Replace mock login with Clerk
const login = async (credentials) => {
  const result = await clerk.client.signIn.create({
    identifier: credentials.email,
    password: credentials.password,
  });
  // Handle result...
};

// Similar updates for signup, OAuth, etc.
```

3. **Update environment variables:**
Add to `.env`:
```
NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
NUXT_PUBLIC_CLERK_SECRET_KEY=your_clerk_secret
```

4. **Add Clerk plugin:**
Create `/home/user/jobnaut/frontend/plugins/clerk.client.ts`

## Form Validation

All forms include comprehensive validation:

### Login Page
- Email: Required, valid email format
- Password: Required, minimum 6 characters

### Signup Page
- Name: Required, minimum 2 characters
- Email: Required, valid email format
- Password: Required, minimum 8 characters, uppercase + lowercase + number
- Confirm Password: Required, must match password
- Terms: Must be accepted

### Password Strength Indicator
Shows real-time password strength:
- **Weak** (red): < 8 chars or missing requirements
- **Fair** (yellow): 8+ chars with some requirements
- **Good** (blue): 8+ chars with most requirements
- **Strong** (green): 12+ chars with all requirements (uppercase, lowercase, numbers, special chars)

### Forgot Password Page
- Email: Required, valid email format

## Error Handling

- Network errors are caught and displayed
- Form validation errors show inline
- API errors display in alert boxes
- OAuth errors are handled gracefully
- Loading states prevent multiple submissions

## Security Features

1. **Password Requirements:**
   - Minimum 8 characters
   - Must contain uppercase and lowercase letters
   - Must contain at least one number
   - Password strength indicator guides users

2. **Token Management:**
   - Tokens stored in localStorage
   - Tokens validated on protected routes
   - Logout clears all auth data

3. **OAuth Security:**
   - State parameter validation
   - Error handling for OAuth failures
   - Secure redirect URIs

4. **Form Security:**
   - Client-side validation
   - Server-side validation (to be implemented)
   - CSRF protection (to be added with Clerk)

## Testing the Authentication Flow

### 1. Test Login Page
```bash
# Navigate to login
http://localhost:3000/auth/login

# Try invalid credentials (should show errors)
# Try valid credentials (should redirect to /profile)
```

### 2. Test Signup Page
```bash
# Navigate to signup
http://localhost:3000/auth/signup

# Test password strength indicator
# Test validation errors
# Complete signup (should redirect to /profile)
```

### 3. Test Protected Routes
```bash
# Try accessing /profile without login
# Should redirect to /auth/login with ?redirect=/profile

# After login, should redirect back to /profile
```

### 4. Test Logout
```bash
# Click user avatar dropdown
# Click logout
# Should redirect to home page
# Profile page should require login again
```

## Next Steps

1. **Backend Integration:**
   - Implement actual authentication endpoints
   - Or integrate Clerk SDK for production-ready auth

2. **Additional Features:**
   - Email verification
   - Two-factor authentication
   - Social profile data sync
   - Remember device functionality

3. **Testing:**
   - Unit tests for auth composable
   - Integration tests for auth flows
   - E2E tests for complete user journeys

4. **Security Enhancements:**
   - Rate limiting on login attempts
   - CSRF token validation
   - Session timeout handling
   - Secure cookie configuration

## File Structure
```
frontend/
├── pages/
│   └── auth/
│       ├── login.vue           # Login page
│       ├── signup.vue          # Registration page
│       ├── forgot-password.vue # Password reset
│       └── callback.vue        # OAuth callback
├── composables/
│   └── useAuth.ts              # Auth state management
├── middleware/
│   └── auth.js                 # Route protection
├── layouts/
│   └── default.vue             # Updated with auth UI
└── docs/
    └── AUTH_SETUP.md           # This file
```

## Support

For questions or issues with the authentication system, please refer to:
- Clerk Documentation: https://clerk.com/docs
- Nuxt 3 Documentation: https://nuxt.com/docs
- Vue 3 Documentation: https://vuejs.org/guide/

---

**Created:** 2025-11-21
**Status:** ✅ Complete and Ready for Integration
