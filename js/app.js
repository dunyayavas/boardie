/**
 * Main application file for Boardie
 * Initializes and coordinates all application components
 */

// Global component instances
window.toast = null;
window.modal = null;
window.tagManager = null;
window.uiManager = null;
window.db = null;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log(`Initializing Boardie v${CONFIG.app.version}...`);
    
    // Initialize UI components first
    await initializeUIComponents();
    console.log('UI components initialized');
    
    // Initialize database
    await db.init();
    console.log('Database initialized');
    
    // Initialize authentication
    await auth.init();
    console.log('Authentication initialized');
    
    // Set up event listeners
    setupEventListeners();
    
    // Check for PWA installation
    checkForPWAInstallation();
    
    // Check for shared content (Web Share Target API)
    checkForSharedContent();
    
    // Load initial data
    await loadInitialData();
    
    console.log('Boardie initialization complete');
  } catch (error) {
    console.error('Error initializing application:', error);
    // Use alert instead of toast since toast might not be initialized yet
    alert('Failed to initialize application. Please refresh the page.');
  }
});

/**
 * Initialize UI components
 * @returns {Promise} Resolves when UI components are loaded
 */
async function initializeUIComponents() {
  return new Promise((resolve, reject) => {
    try {
      // Create database instance
      window.db = new BoardieDB();
      console.log('Database instance created');
      
      // Create toast manager first since it's used for notifications
      window.toast = new ToastManager();
      console.log('Toast manager initialized');
      
      // Create modal manager
      window.modal = new ModalManager();
      console.log('Modal manager initialized');
      
      // Create tag manager
      window.tagManager = new TagManager();
      console.log('Tag manager initialized');
      
      // Load tags
      window.tagManager.loadAllTags()
        .then(() => {
          console.log('Tags loaded');
          
          // Create UI manager last
          window.uiManager = new UIManager();
          console.log('UI manager initialized');
          
          resolve();
        })
        .catch(error => {
          console.error('Error loading tags:', error);
          // Continue anyway
          window.uiManager = new UIManager();
          resolve();
        });
    } catch (error) {
      console.error('Error initializing UI components:', error);
      reject(error);
    }
  });
}

/**
 * Set up global event listeners
 */
function setupEventListeners() {
  // Handle online/offline events
  window.addEventListener('online', () => {
    document.body.classList.remove('offline');
    toast.success('You are back online');
  });
  
  window.addEventListener('offline', () => {
    document.body.classList.add('offline');
    toast.warning('You are offline. Changes will be synced when you reconnect.');
  });
  
  // Handle visibility change (for refreshing embeds when tab becomes visible)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Refresh Twitter embeds if they exist
      if (window.twttr && window.twttr.widgets) {
        window.twttr.widgets.load();
      }
    }
  });
  
  // Handle beforeinstallprompt event for PWA installation
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    
    // Store the event for later use
    window.deferredPrompt = e;
    
    // Show install prompt
    showInstallPrompt();
  });
  
  // Handle appinstalled event
  window.addEventListener('appinstalled', () => {
    // Clear the deferredPrompt
    window.deferredPrompt = null;
    
    // Hide install prompt
    hideInstallPrompt();
    
    // Log installation to analytics
    console.log('PWA was installed');
  });
  
  // Handle form submissions
  document.addEventListener('submit', (e) => {
    // Prevent default form submission
    if (e.target.tagName === 'FORM') {
      e.preventDefault();
    }
  });
  
  // Handle logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      try {
        await auth.signOut();
        toast.success('Logged out successfully');
      } catch (error) {
        console.error('Error signing out:', error);
        toast.error('Failed to sign out');
      }
    });
  }
  
  // Handle window resize for masonry layout
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      uiManager.updateMasonryLayout();
    }, 250);
  });
}

/**
 * Load initial data
 * @returns {Promise} Resolves when initial data is loaded
 */
async function loadInitialData() {
  try {
    // Load posts
    uiManager.loadPosts();
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error loading initial data:', error);
    return Promise.reject(error);
  }
}

/**
 * Check for PWA installation
 */
function checkForPWAInstallation() {
  // Check if app is installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('App is running in standalone mode (installed)');
    
    // Set flag for installed state
    window.isAppInstalled = true;
  } else {
    console.log('App is running in browser mode (not installed)');
    
    // Set flag for not installed state
    window.isAppInstalled = false;
  }
}

/**
 * Show PWA install prompt
 */
function showInstallPrompt() {
  // Check if we should show the prompt
  if (window.isAppInstalled || !window.deferredPrompt) {
    return;
  }
  
  // Create install prompt if it doesn't exist
  if (!document.getElementById('installPrompt')) {
    const promptElement = document.createElement('div');
    promptElement.id = 'installPrompt';
    promptElement.className = 'install-prompt';
    promptElement.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-lg font-semibold">Install Boardie</h3>
        <button id="closeInstallPrompt" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">Install Boardie on your device for a better experience and offline access.</p>
      <div class="flex space-x-2">
        <button id="installApp" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 flex-grow">Install</button>
        <button id="laterInstall" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Later</button>
      </div>
    `;
    
    document.body.appendChild(promptElement);
    
    // Add event listeners
    document.getElementById('closeInstallPrompt').addEventListener('click', hideInstallPrompt);
    document.getElementById('laterInstall').addEventListener('click', hideInstallPrompt);
    document.getElementById('installApp').addEventListener('click', installApp);
  }
  
  // Show prompt
  document.getElementById('installPrompt').style.display = 'block';
}

/**
 * Hide PWA install prompt
 */
function hideInstallPrompt() {
  const promptElement = document.getElementById('installPrompt');
  
  if (promptElement) {
    promptElement.style.display = 'none';
  }
}

/**
 * Install the PWA
 */
async function installApp() {
  if (!window.deferredPrompt) {
    console.log('No installation prompt available');
    return;
  }
  
  // Show the installation prompt
  window.deferredPrompt.prompt();
  
  // Wait for the user to respond to the prompt
  const choiceResult = await window.deferredPrompt.userChoice;
  
  // Clear the deferredPrompt
  window.deferredPrompt = null;
  
  // Hide install prompt
  hideInstallPrompt();
  
  // Log the result
  if (choiceResult.outcome === 'accepted') {
    console.log('User accepted the install prompt');
  } else {
    console.log('User dismissed the install prompt');
  }
}

/**
 * Check for shared content (Web Share Target API)
 */
function checkForSharedContent() {
  // Check if the app was launched from a share target
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.has('share-target')) {
    // Get shared content
    const sharedTitle = urlParams.get('title') || '';
    const sharedText = urlParams.get('text') || '';
    const sharedUrl = urlParams.get('url') || '';
    
    // Use the first available URL
    let url = sharedUrl;
    
    if (!url) {
      // Try to extract URL from text
      const urlMatch = sharedText.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        url = urlMatch[0];
      }
    }
    
    if (url) {
      // Pre-fill the add link form
      setTimeout(() => {
        const linkUrl = document.getElementById('linkUrl');
        const linkTags = document.getElementById('linkTags');
        
        if (linkUrl) {
          linkUrl.value = url;
        }
        
        if (linkTags && sharedTitle) {
          // Use title as initial tag
          linkTags.value = sharedTitle.replace(/[^\w\s]/g, '').trim();
        }
        
        // Show the add link modal
        uiManager.showAddLinkModal();
        
        // Clean up the URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 1000);
    }
  }
}

/**
 * Show error message
 * @param {string} message - Error message to show
 */
function showErrorMessage(message) {
  // Check if toast is available and initialized, otherwise use alert
  if (window.toast && typeof window.toast.error === 'function') {
    window.toast.error(message);
  } else {
    alert(message);
  }
  
  console.error(message);
}

// Export global app functions
window.boardieApp = {
  addLink: (url, tags) => {
    const linkUrl = document.getElementById('linkUrl');
    const linkTags = document.getElementById('linkTags');
    
    if (linkUrl) {
      linkUrl.value = url || '';
    }
    
    if (linkTags && tags) {
      linkTags.value = Array.isArray(tags) ? tags.join(', ') : tags;
    }
    
    uiManager.showAddLinkModal();
  },
  
  toggleDarkMode: () => {
    uiManager.toggleDarkMode();
  },
  
  showLogin: () => {
    uiManager.showAuthModal('login');
  },
  
  showSignup: () => {
    uiManager.showAuthModal('signup');
  },
  
  refreshPosts: () => {
    uiManager.resetAndReload();
  }
};
