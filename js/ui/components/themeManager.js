/**
 * Theme Manager module for Boardie application
 * Handles dark mode and theme preferences
 */
class ThemeManager {
  constructor() {
    this.themeToggle = document.getElementById('themeToggle');
    this.isDarkMode = false;
    
    this.init();
  }

  /**
   * Initialize the theme manager
   */
  async init() {
    // Check for dark mode preference
    await this.checkDarkMode();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Check and apply dark mode preference
   */
  async checkDarkMode() {
    try {
      // Check saved preference
      const savedTheme = await db.getSetting('theme', 'system');
      
      if (savedTheme === 'dark') {
        this.enableDarkMode();
      } else if (savedTheme === 'light') {
        this.disableDarkMode();
      } else {
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          this.enableDarkMode();
        } else {
          this.disableDarkMode();
        }
        
        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
          if (savedTheme === 'system') {
            if (e.matches) {
              this.enableDarkMode();
            } else {
              this.disableDarkMode();
            }
          }
        });
      }
    } catch (error) {
      console.error('Error checking dark mode preference:', error);
      
      // Fallback to system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.enableDarkMode();
      }
    }
  }

  /**
   * Enable dark mode
   */
  enableDarkMode() {
    document.documentElement.classList.add('dark');
    this.isDarkMode = true;
  }

  /**
   * Disable dark mode
   */
  disableDarkMode() {
    document.documentElement.classList.remove('dark');
    this.isDarkMode = false;
  }

  /**
   * Toggle dark mode
   */
  async toggleDarkMode() {
    if (this.isDarkMode) {
      this.disableDarkMode();
      await db.setSetting('theme', 'light');
    } else {
      this.enableDarkMode();
      await db.setSetting('theme', 'dark');
    }
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Theme toggle
    if (this.themeToggle) {
      this.themeToggle.addEventListener('click', () => this.toggleDarkMode());
    }
  }
  
  /**
   * Get current theme state
   * @returns {boolean} Whether dark mode is enabled
   */
  isDark() {
    return this.isDarkMode;
  }
}

// Create and export a singleton instance
const themeManager = new ThemeManager();
