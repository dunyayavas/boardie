/**
 * Auth Manager module for Boardie application
 * Handles authentication UI and interactions
 */
class AuthManager {
  constructor() {
    this.authBtn = document.getElementById('authBtn');
    this.userDropdown = document.getElementById('userDropdown');
    this.userAvatar = document.getElementById('userAvatar');
    this.userName = document.getElementById('userName');
    
    this.setupEventListeners();
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Auth button
    if (this.authBtn) {
      this.authBtn.addEventListener('click', () => this.showAuthModal());
    }
    
    // Auth state changes
    auth.onAuthStateChange((user) => {
      this.updateAuthUI(user);
    });
  }

  /**
   * Update authentication UI
   * @param {Object} user - Current user
   */
  updateAuthUI(user) {
    if (user) {
      // User is logged in
      if (this.authBtn) this.authBtn.classList.add('hidden');
      if (this.userDropdown) this.userDropdown.classList.remove('hidden');
      
      // Set user info
      if (this.userAvatar) {
        this.userAvatar.src = user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.email.charAt(0));
      }
      
      if (this.userName) {
        this.userName.textContent = user.email;
      }
      
      // Set up logout button
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.onclick = () => {
          auth.signOut();
        };
      }
    } else {
      // User is logged out
      if (this.authBtn) this.authBtn.classList.remove('hidden');
      if (this.userDropdown) this.userDropdown.classList.add('hidden');
      
      // Set up login button
      const loginBtn = document.getElementById('loginBtn');
      if (loginBtn) {
        loginBtn.onclick = () => {
          this.showAuthModal('login');
        };
      }
    }
  }

  /**
   * Show authentication modal
   * @param {string} mode - 'login' or 'signup'
   */
  showAuthModal(mode = 'login') {
    const authModal = document.getElementById('authModal');
    const authModalTitle = document.getElementById('authModalTitle');
    const authForm = document.getElementById('authForm');
    const loginTabBtn = document.getElementById('loginTabBtn');
    const signupTabBtn = document.getElementById('signupTabBtn');
    const submitAuthBtn = document.getElementById('submitAuthBtn');
    
    if (!authModal || !authForm) {
      console.error('Auth modal elements not found');
      return;
    }
    
    // Set modal title and button text
    if (authModalTitle) {
      authModalTitle.textContent = mode === 'login' ? 'Login' : 'Sign Up';
    }
    
    if (submitAuthBtn) {
      submitAuthBtn.textContent = mode === 'login' ? 'Login' : 'Sign Up';
    }
    
    // Set active tab
    if (loginTabBtn && signupTabBtn) {
      // Reset tab styles
      loginTabBtn.classList.remove('border-primary', 'text-primary');
      signupTabBtn.classList.remove('border-primary', 'text-primary');
      
      // Set active tab
      if (mode === 'login') {
        loginTabBtn.classList.add('border-b-2', 'border-primary', 'text-primary');
      } else {
        signupTabBtn.classList.add('border-b-2', 'border-primary', 'text-primary');
      }
      
      // Tab click handlers
      loginTabBtn.onclick = () => {
        authModalTitle.textContent = 'Login';
        submitAuthBtn.textContent = 'Login';
        loginTabBtn.classList.add('border-b-2', 'border-primary', 'text-primary');
        signupTabBtn.classList.remove('border-b-2', 'border-primary', 'text-primary');
      };
      
      signupTabBtn.onclick = () => {
        authModalTitle.textContent = 'Sign Up';
        submitAuthBtn.textContent = 'Sign Up';
        signupTabBtn.classList.add('border-b-2', 'border-primary', 'text-primary');
        loginTabBtn.classList.remove('border-b-2', 'border-primary', 'text-primary');
      };
    }
    
    // Set up form submission
    if (authForm) {
      authForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        
        if (!email || !password) {
          toast.error('Please enter email and password');
          return;
        }
        
        try {
          if (authModalTitle.textContent === 'Login') {
            // Login
            await auth.signIn(email, password);
            toast.success('Logged in successfully');
          } else {
            // Sign up
            await auth.signUp(email, password);
            toast.success('Account created successfully');
          }
          
          // Close modal
          modal.closeTopModal();
        } catch (error) {
          console.error('Authentication error:', error);
          toast.error(error.message || 'Authentication failed');
        }
      };
    }
    
    // Set up social login buttons
    const googleAuthBtn = document.getElementById('googleAuthBtn');
    const githubAuthBtn = document.getElementById('githubAuthBtn');
    
    if (googleAuthBtn) {
      googleAuthBtn.onclick = () => auth.signInWithProvider('google');
    }
    
    if (githubAuthBtn) {
      githubAuthBtn.onclick = () => auth.signInWithProvider('github');
    }
    
    // Show modal
    modal.open('authModal');
  }
}

// Create and export a singleton instance
const authManager = new AuthManager();
