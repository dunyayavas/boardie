/**
 * Main UI module for Boardie application
 * Imports and coordinates all UI components
 */

// Import UI components
// Note: In a real application, these would be proper ES modules
// For this demo, we're using script tags in the HTML
// This file serves as a coordinator for all UI modules

// The UI components will be initialized by app.js
// This file now serves as a coordinator for global UI events

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Setting up UI coordination...');
  
  // Set up global UI event delegation when components are ready
  const checkComponentsInterval = setInterval(() => {
    if (window.toast && window.modal && window.tagManager && window.uiManager) {
      clearInterval(checkComponentsInterval);
      setupGlobalEventDelegation();
      console.log('UI coordination initialized');
    }
  }, 100);
  
  // Safety timeout after 5 seconds
  setTimeout(() => {
    clearInterval(checkComponentsInterval);
  }, 5000);
});

/**
 * Set up global event delegation for UI components
 * This reduces the number of event listeners and improves performance
 */
function setupGlobalEventDelegation() {
  // Click event delegation
  document.addEventListener('click', (e) => {
    // Close user menu when clicking outside
    const userMenu = document.getElementById('userMenu');
    const loginBtn = document.getElementById('loginBtn');
    
    if (userMenu && !userMenu.classList.contains('hidden') && 
        !userMenu.contains(e.target) && 
        loginBtn && !loginBtn.contains(e.target)) {
      userMenu.classList.add('hidden');
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // ESC key already handled by modal manager
    
    // Ctrl+F / Cmd+F to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      const searchInput = document.getElementById('searchInput');
      if (searchInput && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
      }
    }
    
    // Ctrl+N / Cmd+N to add new link
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      if (typeof uiManager !== 'undefined') {
        uiManager.showAddLinkModal();
      }
    }
  });
  
  // Handle theme changes
  const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  darkModeMediaQuery.addEventListener('change', (e) => {
    if (typeof uiManager !== 'undefined') {
      // Only update if theme is set to 'system'
      db.getSetting('theme', 'system').then(theme => {
        if (theme === 'system') {
          if (e.matches) {
            uiManager.enableDarkMode();
          } else {
            uiManager.disableDarkMode();
          }
        }
      });
    }
  });
  
  // Handle window resize for masonry layout
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (typeof uiManager !== 'undefined') {
        uiManager.updateMasonryLayout();
      }
    }, 250);
  });
}

// Export UI namespace for debugging
window.boardieUI = {
  showToast: (message, type, duration) => {
    if (typeof toast !== 'undefined') {
      return toast.show(message, type, duration);
    }
  },
  
  openModal: (modalId, options) => {
    if (typeof modal !== 'undefined') {
      return modal.open(modalId, options);
    }
  },
  
  closeModal: () => {
    if (typeof modal !== 'undefined') {
      return modal.closeTopModal();
    }
  },
  
  toggleTagFilter: (tag) => {
    if (typeof tagManager !== 'undefined') {
      return tagManager.toggleFilter(tag);
    }
  },
  
  refreshLayout: () => {
    if (typeof uiManager !== 'undefined') {
      return uiManager.updateMasonryLayout();
    }
  }
};
