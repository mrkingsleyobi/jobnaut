/**
 * Frontend Performance Optimization Plugin
 * Implements lazy loading, resource prefetching, and service worker caching
 */

// Image lazy loading observer
let imageObserver = null;

/**
 * Initialize image lazy loading
 */
function initLazyLoading() {
  if ('IntersectionObserver' in window) {
    imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;

            // Load the image
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }

            if (img.dataset.srcset) {
              img.srcset = img.dataset.srcset;
              img.removeAttribute('data-srcset');
            }

            // Stop observing this image
            imageObserver.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px 0px', // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );

    // Observe all lazy images
    document.querySelectorAll('img[data-src]').forEach((img) => {
      imageObserver.observe(img);
    });
  }
}

/**
 * Component lazy loading helper
 */
function lazyLoadComponent(importFn) {
  return {
    component: importFn,
    loading: {
      template: '<div class="loading-spinner">Loading...</div>',
    },
    error: {
      template: '<div class="error-message">Failed to load component</div>',
    },
    delay: 200, // Delay before showing loading component
    timeout: 10000, // Timeout for loading
  };
}

/**
 * Prefetch critical resources
 */
function prefetchCriticalResources() {
  const criticalRoutes = [
    '/api/v1/jobs',
    '/api/v1/user/profile',
  ];

  // Prefetch API endpoints
  if ('fetch' in window) {
    criticalRoutes.forEach((route) => {
      fetch(route, {
        method: 'GET',
        priority: 'low', // Don't interfere with critical requests
      }).catch(() => {
        // Silently fail - this is just optimization
      });
    });
  }

  // DNS prefetch for external resources
  const externalDomains = [
    'https://fonts.googleapis.com',
    'https://cdnjs.cloudflare.com',
  ];

  externalDomains.forEach((domain) => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    document.head.appendChild(link);
  });
}

/**
 * Preload critical assets
 */
function preloadCriticalAssets() {
  const criticalAssets = [
    { href: '/fonts/main.woff2', as: 'font', type: 'font/woff2' },
    { href: '/css/critical.css', as: 'style' },
  ];

  criticalAssets.forEach((asset) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = asset.href;
    link.as = asset.as;
    if (asset.type) {
      link.type = asset.type;
    }
    if (asset.as === 'font') {
      link.crossOrigin = 'anonymous';
    }
    document.head.appendChild(link);
  });
}

/**
 * Register service worker for caching
 */
async function registerServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('Service Worker registered:', registration.scope);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            console.log('New service worker available');

            // Optionally notify user
            if (window.confirm('New version available. Reload to update?')) {
              window.location.reload();
            }
          }
        });
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

/**
 * Optimize scroll performance
 */
function optimizeScrollPerformance() {
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        // Handle scroll events here
        handleScroll();
        ticking = false;
      });

      ticking = true;
    }
  }, { passive: true });
}

function handleScroll() {
  // Check if we need to load more lazy images
  if (imageObserver) {
    document.querySelectorAll('img[data-src]').forEach((img) => {
      imageObserver.observe(img);
    });
  }
}

/**
 * Resource hints for next navigation
 */
function addNavigationHints(routes) {
  routes.forEach((route) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = route;
    document.head.appendChild(link);
  });
}

/**
 * Monitor performance metrics
 */
function monitorPerformance() {
  if ('PerformanceObserver' in window) {
    // Monitor Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
    });

    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      // Not supported
    }

    // Monitor First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        console.log('FID:', entry.processingStart - entry.startTime);
      });
    });

    try {
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      // Not supported
    }

    // Monitor Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          console.log('CLS:', clsValue);
        }
      }
    });

    try {
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // Not supported
    }
  }
}

/**
 * Nuxt plugin export
 */
export default ({ app }) => {
  // Initialize on client side only
  if (process.client) {
    // Initialize lazy loading
    initLazyLoading();

    // Prefetch resources
    prefetchCriticalResources();

    // Preload critical assets
    preloadCriticalAssets();

    // Register service worker
    registerServiceWorker();

    // Optimize scroll
    optimizeScrollPerformance();

    // Monitor performance
    if (process.env.NODE_ENV === 'development') {
      monitorPerformance();
    }

    // Add to Vue prototype for easy access
    app.$lazyLoadComponent = lazyLoadComponent;
    app.$addNavigationHints = addNavigationHints;
  }
};

// Export utilities for direct import
export {
  initLazyLoading,
  lazyLoadComponent,
  prefetchCriticalResources,
  preloadCriticalAssets,
  registerServiceWorker,
  optimizeScrollPerformance,
  addNavigationHints,
  monitorPerformance,
};
