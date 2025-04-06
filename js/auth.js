/**
 * Authentication module for Boardie application
 * Handles user authentication with Supabase
 */
class BoardieAuth {
  constructor() {
    this.supabaseClient = null;
    this.currentUser = null;
    this.authStateChangeCallbacks = [];
    this.isInitialized = false;
  }

  /**
   * Initialize the authentication module
   * @returns {Promise} Resolves when the auth is ready
   */
  async init() {
    if (this.isInitialized) return Promise.resolve();
    
    try {
      // Initialize Supabase client if config is available
      if (CONFIG.supabase.url && CONFIG.supabase.anonKey) {
        this.supabaseClient = supabase.createClient(
          CONFIG.supabase.url,
          CONFIG.supabase.anonKey
        );
        
        // Check if user is already authenticated
        const { data: { user } } = await this.supabaseClient.auth.getUser();
        this.currentUser = user;
        
        // Set up auth state change listener
        this.supabaseClient.auth.onAuthStateChange((event, session) => {
          const previousUser = this.currentUser;
          this.currentUser = session?.user || null;
          
          // Notify callbacks
          this.authStateChangeCallbacks.forEach(callback => {
            callback(this.currentUser, previousUser, event);
          });
        });
        
        this.isInitialized = true;
        return Promise.resolve();
      } else {
        console.warn('Supabase configuration is missing. Authentication will not be available.');
        this.isInitialized = true;
        return Promise.resolve();
      }
    } catch (error) {
      console.error('Error initializing authentication:', error);
      this.isInitialized = true;
      return Promise.resolve();
    }
  }

  /**
   * Register a new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User data or error
   */
  async signUp(email, password) {
    if (!this.isInitialized) {
      await this.init();
    }
    
    if (!this.supabaseClient) {
      throw new Error('Authentication is not available');
    }
    
    try {
      const { data, error } = await this.supabaseClient.auth.signUp({
        email,
        password
      });
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  }

  /**
   * Sign in a user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User data or error
   */
  async signIn(email, password) {
    if (!this.isInitialized) {
      await this.init();
    }
    
    if (!this.supabaseClient) {
      throw new Error('Authentication is not available');
    }
    
    try {
      const { data, error } = await this.supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  /**
   * Sign in with a third-party provider
   * @param {string} provider - Provider name (google, github, etc.)
   * @returns {Promise<void>} Redirects to provider auth page
   */
  async signInWithProvider(provider) {
    if (!this.isInitialized) {
      await this.init();
    }
    
    if (!this.supabaseClient) {
      throw new Error('Authentication is not available');
    }
    
    try {
      const { error } = await this.supabaseClient.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      
      if (error) throw error;
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Sign out the current user
   * @returns {Promise<void>} Resolves when sign out is complete
   */
  async signOut() {
    if (!this.isInitialized) {
      await this.init();
    }
    
    if (!this.supabaseClient) {
      throw new Error('Authentication is not available');
    }
    
    try {
      const { error } = await this.supabaseClient.auth.signOut();
      
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  /**
   * Reset password for a user
   * @param {string} email - User email
   * @returns {Promise<void>} Resolves when password reset email is sent
   */
  async resetPassword(email) {
    if (!this.isInitialized) {
      await this.init();
    }
    
    if (!this.supabaseClient) {
      throw new Error('Authentication is not available');
    }
    
    try {
      const { error } = await this.supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  /**
   * Update user password
   * @param {string} newPassword - New password
   * @returns {Promise<void>} Resolves when password is updated
   */
  async updatePassword(newPassword) {
    if (!this.isInitialized) {
      await this.init();
    }
    
    if (!this.supabaseClient) {
      throw new Error('Authentication is not available');
    }
    
    try {
      const { error } = await this.supabaseClient.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {Object} profile - Profile data to update
   * @returns {Promise<Object>} Updated user data
   */
  async updateProfile(profile) {
    if (!this.isInitialized) {
      await this.init();
    }
    
    if (!this.supabaseClient) {
      throw new Error('Authentication is not available');
    }
    
    if (!this.currentUser) {
      throw new Error('No user is currently signed in');
    }
    
    try {
      const { data, error } = await this.supabaseClient.auth.updateUser({
        data: profile
      });
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Get the current user
   * @returns {Object|null} Current user or null if not authenticated
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if a user is authenticated
   * @returns {boolean} True if authenticated
   */
  isAuthenticated() {
    return !!this.currentUser;
  }

  /**
   * Register a callback for auth state changes
   * @param {Function} callback - Function to call on auth state change
   * @returns {Function} Function to unregister the callback
   */
  onAuthStateChange(callback) {
    this.authStateChangeCallbacks.push(callback);
    
    // Return function to unregister
    return () => {
      this.authStateChangeCallbacks = this.authStateChangeCallbacks.filter(cb => cb !== callback);
    };
  }
}

// Create and export a singleton instance
const auth = new BoardieAuth();
