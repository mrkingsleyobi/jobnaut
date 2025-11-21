/**
 * Authentication Middleware
 *
 * Protects routes that require authentication.
 * Redirects unauthenticated users to the login page.
 *
 * Usage:
 * Add to page meta:
 * definePageMeta({
 *   middleware: 'auth'
 * })
 */

export default defineNuxtRouteMiddleware((to, from) => {
  // Skip middleware on server-side rendering
  if (process.server) return;

  // Check if user is authenticated
  const token = localStorage.getItem('auth_token');
  const isAuthenticated = !!token;

  // List of routes that require authentication
  const protectedRoutes = [
    '/profile',
    '/saved-jobs',
    '/applications',
  ];

  // Check if current route requires authentication
  const requiresAuth = protectedRoutes.some(route =>
    to.path.startsWith(route)
  );

  // Redirect to login if accessing protected route while not authenticated
  if (requiresAuth && !isAuthenticated) {
    return navigateTo({
      path: '/auth/login',
      query: {
        redirect: to.fullPath // Save intended destination for post-login redirect
      }
    });
  }

  // Redirect to profile if accessing auth pages while authenticated
  const authRoutes = ['/auth/login', '/auth/signup'];
  if (authRoutes.includes(to.path) && isAuthenticated) {
    return navigateTo('/profile');
  }
});
