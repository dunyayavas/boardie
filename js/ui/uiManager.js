/**
 * UI Manager module for Boardie application
 * Coordinates UI components and handles user interactions
 */
class UIManager {
  constructor() {
    // UI elements
    this.postsContainer = document.getElementById('postsContainer');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.emptyState = document.getElementById('emptyState');
    this.infiniteScrollSentinel = document.getElementById('infiniteScrollSentinel');
    this.searchInput = document.getElementById('searchInput');
    this.sortSelect = document.getElementById('sortSelect');
    this.themeToggle = document.getElementById('themeToggle');
    this.addLinkBtn = document.getElementById('addLinkBtn');
    this.emptyStateAddBtn = document.getElementById('emptyStateAddBtn');
    
    // State
    this.isLoading = false;
    this.hasMorePosts = true;
    this.currentPage = 0;
    this.postsPerPage = CONFIG.ui.postsPerPage || 20;
    this.currentSearchTerm = '';
    this.currentSort = { by: 'dateAdded', order: 'desc' };
    this.isDarkMode = false;
    
    // Initialize
    this.init();
  }

  /**
   * Initialize the UI manager
   */
  async init() {
    // Check for dark mode preference
    this.checkDarkMode();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Set up infinite scroll
    this.setupInfiniteScroll();
    
    // Initial UI state
    this.showLoading();
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
    
    // Add link button
    if (this.addLinkBtn) {
      this.addLinkBtn.addEventListener('click', () => this.showAddLinkModal());
    }
    
    // Empty state add button
    if (this.emptyStateAddBtn) {
      this.emptyStateAddBtn.addEventListener('click', () => this.showAddLinkModal());
    }
    
    // Search input
    if (this.searchInput) {
      this.searchInput.addEventListener('input', this.debounce(() => {
        this.currentSearchTerm = this.searchInput.value.trim();
        this.resetAndReload();
      }, CONFIG.ui.debounceDelay || 300));
    }
    
    // Sort select
    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', () => {
        const value = this.sortSelect.value;
        
        switch (value) {
          case 'dateDesc':
            this.currentSort = { by: 'dateAdded', order: 'desc' };
            break;
          case 'dateAsc':
            this.currentSort = { by: 'dateAdded', order: 'asc' };
            break;
          case 'platform':
            this.currentSort = { by: 'platform', order: 'asc' };
            break;
          default:
            this.currentSort = { by: 'dateAdded', order: 'desc' };
        }
        
        this.resetAndReload();
      });
    }
    
    // Tag filter changes
    document.addEventListener('tagfilter:change', () => {
      this.resetAndReload();
    });
    
    // Auth state changes
    auth.onAuthStateChange((user) => {
      this.updateAuthUI(user);
      
      // Reload posts if user changed
      this.resetAndReload();
    });
  }

  /**
   * Set up infinite scroll
   */
  setupInfiniteScroll() {
    if (!this.infiniteScrollSentinel) return;
    
    // Create intersection observer
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.isLoading && this.hasMorePosts) {
          this.loadMorePosts();
        }
      });
    }, {
      rootMargin: `0px 0px ${CONFIG.ui.infiniteScrollThreshold || 300}px 0px`
    });
    
    // Observe sentinel
    observer.observe(this.infiniteScrollSentinel);
  }

  /**
   * Show the add link modal
   * @param {Object} post - Existing post for editing (optional)
   */
  showAddLinkModal(post = null) {
    const isEdit = !!post;
    const modalTitle = document.getElementById('modalTitle');
    const linkForm = document.getElementById('linkForm');
    const linkId = document.getElementById('linkId');
    const linkUrl = document.getElementById('linkUrl');
    const linkTags = document.getElementById('linkTags');
    let saveModalBtn = document.getElementById('saveModalBtn');
    let cancelModalBtn = document.getElementById('cancelModalBtn');
    let closeModalBtn = document.getElementById('closeModalBtn');
    
    console.log('Opening add link modal', { isEdit, post });
    
    // Set modal title
    if (modalTitle) {
      modalTitle.textContent = isEdit ? 'Edit Link' : 'Add New Link';
    }
    
    // Set form values
    if (linkId) {
      linkId.value = isEdit ? post.id : '';
    }
    
    if (linkUrl) {
      linkUrl.value = isEdit ? post.url : '';
      linkUrl.disabled = isEdit; // Disable URL field when editing
    }
    
    if (linkTags) {
      linkTags.value = isEdit ? window.tagManager.formatTags(post.tags) : '';
    }
    
    // Set button text
    if (saveModalBtn) {
      saveModalBtn.textContent = isEdit ? 'Update' : 'Save';
    }
    
    // Clear existing event listeners
    let newSaveBtn, newCancelBtn, newCloseBtn;
    
    if (saveModalBtn) {
      newSaveBtn = saveModalBtn.cloneNode(true);
      saveModalBtn.parentNode.replaceChild(newSaveBtn, saveModalBtn);
    }
    
    if (cancelModalBtn) {
      newCancelBtn = cancelModalBtn.cloneNode(true);
      cancelModalBtn.parentNode.replaceChild(newCancelBtn, cancelModalBtn);
    }
    
    if (closeModalBtn) {
      newCloseBtn = closeModalBtn.cloneNode(true);
      closeModalBtn.parentNode.replaceChild(newCloseBtn, closeModalBtn);
    }
    
    // Update references to the new buttons
    saveModalBtn = newSaveBtn || saveModalBtn;
    cancelModalBtn = newCancelBtn || cancelModalBtn;
    closeModalBtn = newCloseBtn || closeModalBtn;
    
    // Show modal
    window.modal.open('linkModal');
    
    // Handle close button click
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => {
        window.modal.closeTopModal();
      });
    }
    
    // Handle cancel button click
    if (cancelModalBtn) {
      cancelModalBtn.addEventListener('click', () => {
        window.modal.closeTopModal();
      });
    }
    
    // Handle save button click
    if (saveModalBtn) {
      saveModalBtn.addEventListener('click', async () => {
        const id = linkId.value;
        const url = linkUrl.value.trim();
        const tags = window.tagManager.parseTags(linkTags.value);
        
        console.log('Save button clicked', { id, url, tags });
        
        if (!url) {
          window.toast.error('Please enter a valid URL');
          return;
        }
        
        try {
          if (isEdit) {
            // Update existing post
            const updatedPost = { ...post, tags };
            await window.db.updatePost(updatedPost);
            window.toast.success('Link updated successfully');
          } else {
            // Add new post
            const platform = this.detectPlatform(url);
            const newPost = {
              url,
              tags,
              platform,
              dateAdded: new Date().toISOString()
            };
            
            console.log('Adding new post', newPost);
            await window.db.addPost(newPost);
            window.toast.success('Link added successfully');
          }
          
          // Close modal
          window.modal.closeTopModal();
          
          // Reload posts
          this.resetAndReload();
        } catch (error) {
          console.error('Error saving link:', error);
          window.toast.error(isEdit ? 'Failed to update link' : 'Failed to add link');
        }
      });
    }
  }

  /**
   * Detect platform from URL
   * @param {string} url - URL to detect platform from
   * @returns {string} Platform name
   */
  detectPlatform(url) {
    for (const [platform, config] of Object.entries(CONFIG.platforms)) {
      if (config.pattern.test(url)) {
        return platform;
      }
    }
    
    return 'website';
  }

  /**
   * Reset and reload posts
   */
  resetAndReload() {
    console.log('Resetting and reloading posts');
    
    // Reset pagination
    this.currentPage = 0;
    this.hasMorePosts = true;
    
    // Clear existing posts
    if (this.postsContainer) {
      this.postsContainer.innerHTML = '';
      console.log('Cleared posts container');
    }
    
    // Show loading indicator
    this.showLoading();
    
    // Add a small delay to ensure UI updates
    setTimeout(() => {
      // Load posts
      this.loadPosts();
    }, 100);
  }

  /**
   * Load posts
   */
  async loadPosts() {
    if (this.isLoading || !this.hasMorePosts) return;
    
    this.showLoading();
    this.isLoading = true;
    
    try {
      console.log('Loading posts, page:', this.currentPage);
      
      // Get active tag filters
      const tagFilters = window.tagManager.getActiveFilters();
      console.log('Tag filters:', tagFilters);
      
      // Load posts
      const posts = await window.db.getAllPosts({
        limit: this.postsPerPage,
        offset: this.currentPage * this.postsPerPage,
        sortBy: this.currentSort.by,
        sortOrder: this.currentSort.order,
        filterTags: tagFilters.length > 0 ? tagFilters : null,
        searchTerm: this.currentSearchTerm || null
      });
      
      console.log('Loaded posts:', posts.length);
      
      // Check if there are more posts
      this.hasMorePosts = posts.length === this.postsPerPage;
      
      // Increment page
      this.currentPage++;
      
      // Render posts
      this.renderPosts(posts);
      
      // Show empty state if no posts
      const isEmpty = this.currentPage === 1 && posts.length === 0;
      console.log('Is empty state:', isEmpty);
      this.toggleEmptyState(isEmpty);
      
      return posts;
    } catch (error) {
      console.error('Error loading posts:', error);
      window.toast.error('Failed to load posts');
      return [];
    } finally {
      this.hideLoading();
      this.isLoading = false;
    }
  }

  /**
   * Load more posts
   */
  loadMorePosts() {
    this.loadPosts();
  }

  /**
   * Render posts
   * @param {Array} posts - Array of posts to render
   */
  renderPosts(posts) {
    if (!this.postsContainer || !posts || posts.length === 0) return;
    
    // Create document fragment
    const fragment = document.createDocumentFragment();
    
    // Create post elements
    posts.forEach(post => {
      const postElement = this.createPostElement(post);
      fragment.appendChild(postElement);
    });
    
    // Append to container
    this.postsContainer.appendChild(fragment);
    
    // Initialize masonry layout
    this.updateMasonryLayout();
    
    // Load embeds
    this.loadEmbeds();
  }

  /**
   * Create a post element
   * @param {Object} post - Post object
   * @returns {HTMLElement} Post element
   */
  createPostElement(post) {
    const postElement = document.createElement('div');
    postElement.className = 'post-item bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden';
    postElement.dataset.id = post.id;
    postElement.dataset.platform = post.platform;
    
    // Add platform-specific class
    postElement.classList.add(`platform-${post.platform}`);
    
    // Create post header
    const headerElement = document.createElement('div');
    headerElement.className = 'p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center';
    
    // Platform icon and name
    const platformConfig = CONFIG.platforms[post.platform] || CONFIG.platforms.website;
    headerElement.innerHTML = `
      <div class="flex items-center">
        <span class="text-${platformConfig.color} mr-2">${platformConfig.icon}</span>
        <span class="font-medium">${platformConfig.name}</span>
      </div>
      <div class="flex items-center">
        <button class="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 edit-post-btn" aria-label="Edit post">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button class="p-1 text-gray-500 hover:text-red-500 delete-post-btn" aria-label="Delete post">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    `;
    
    // Create embed container
    const embedElement = document.createElement('div');
    embedElement.className = 'embed-container';
    embedElement.dataset.url = post.url;
    embedElement.dataset.platform = post.platform;
    embedElement.innerHTML = `
      <div class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
        <div class="loading-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
    `;
    
    // Create post footer
    const footerElement = document.createElement('div');
    footerElement.className = 'p-4';
    
    // Add tags
    const tagsElement = document.createElement('div');
    tagsElement.className = 'tags-container flex flex-wrap';
    tagsElement.appendChild(tagManager.createTagElements(post.tags, true, 
      // Tag click handler
      (tag) => tagManager.toggleFilter(tag),
      // Tag remove handler
      async (tag) => {
        try {
          await tagManager.removeTagFromPost(post, tag);
          
          // Update UI
          tagsElement.innerHTML = '';
          tagsElement.appendChild(tagManager.createTagElements(post.tags, true, 
            (tag) => tagManager.toggleFilter(tag),
            (tag) => tagManager.removeTagFromPost(post, tag)
          ));
        } catch (error) {
          console.error('Error removing tag:', error);
        }
      }
    ));
    
    // Add date
    const dateElement = document.createElement('div');
    dateElement.className = 'text-xs text-gray-500 dark:text-gray-400 mt-2';
    dateElement.textContent = `Added ${this.formatDate(post.dateAdded)}`;
    
    // Assemble footer
    footerElement.appendChild(tagsElement);
    footerElement.appendChild(dateElement);
    
    // Assemble post element
    postElement.appendChild(headerElement);
    postElement.appendChild(embedElement);
    postElement.appendChild(footerElement);
    
    // Add event listeners
    
    // Edit button
    const editButton = postElement.querySelector('.edit-post-btn');
    if (editButton) {
      editButton.addEventListener('click', () => this.showAddLinkModal(post));
    }
    
    // Delete button
    const deleteButton = postElement.querySelector('.delete-post-btn');
    if (deleteButton) {
      deleteButton.addEventListener('click', () => this.confirmDeletePost(post));
    }
    
    return postElement;
  }

  /**
   * Confirm post deletion
   * @param {Object} post - Post to delete
   */
  confirmDeletePost(post) {
    if (confirm(`Are you sure you want to delete this ${post.platform} post?`)) {
      this.deletePost(post);
    }
  }

  /**
   * Delete a post
   * @param {Object} post - Post to delete
   */
  async deletePost(post) {
    try {
      await db.deletePost(post.id);
      
      // Remove from UI
      const postElement = this.postsContainer.querySelector(`[data-id="${post.id}"]`);
      if (postElement) {
        postElement.remove();
        
        // Update masonry layout
        this.updateMasonryLayout();
      }
      
      toast.success('Post deleted successfully');
      
      // Check if container is empty
      if (this.postsContainer.children.length === 0) {
        this.toggleEmptyState(true);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  }

  /**
   * Load embeds for visible posts
   */
  loadEmbeds() {
    // Get all embed containers that haven't been loaded
    const embedContainers = document.querySelectorAll('.embed-container:not([data-loaded="true"])');
    
    // Load each embed
    embedContainers.forEach(container => {
      const url = container.dataset.url;
      const platform = container.dataset.platform;
      
      if (!url || !platform) return;
      
      // Mark as loading
      container.dataset.loading = 'true';
      
      // Load embed based on platform
      embedHandler.loadEmbed(url, platform, container)
        .then(() => {
          // Mark as loaded
          container.dataset.loaded = 'true';
          container.dataset.loading = 'false';
          
          // Update masonry layout
          this.updateMasonryLayout();
        })
        .catch(error => {
          console.error('Error loading embed:', error);
          
          // Show error
          container.innerHTML = `
            <div class="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 p-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p class="text-sm text-center text-gray-700 dark:text-gray-300">Failed to load embed</p>
              <a href="${url}" target="_blank" rel="noopener noreferrer" class="text-xs text-primary hover:underline mt-1">Open original link</a>
            </div>
          `;
          
          // Mark as loaded (with error)
          container.dataset.loaded = 'error';
          container.dataset.loading = 'false';
          
          // Update masonry layout
          this.updateMasonryLayout();
        });
    });
  }

  /**
   * Update masonry layout
   */
  updateMasonryLayout() {
    if (!this.postsContainer) return;
    
    // Get all post items
    const items = this.postsContainer.querySelectorAll('.post-item');
    
    // Reset positions
    items.forEach(item => {
      item.style.gridRowEnd = 'unset';
    });
    
    // Recalculate positions
    items.forEach(item => {
      const height = item.getBoundingClientRect().height;
      const rowSpan = Math.ceil(height / 10) + 1; // 10px grid rows + 1 for spacing
      item.style.gridRowEnd = `span ${rowSpan}`;
    });
  }

  /**
   * Show loading indicator
   */
  showLoading() {
    this.isLoading = true;
    
    if (this.loadingIndicator) {
      this.loadingIndicator.classList.remove('hidden');
    }
  }

  /**
   * Hide loading indicator
   */
  hideLoading() {
    this.isLoading = false;
    
    if (this.loadingIndicator) {
      this.loadingIndicator.classList.add('hidden');
    }
  }
  
  /**
   * Toggle empty state visibility
   * @param {boolean} isEmpty - Whether to show the empty state
   */
  toggleEmptyState(isEmpty) {
    console.log('Toggling empty state:', isEmpty);
    
    if (!this.emptyState) return;
    
    if (isEmpty) {
      this.emptyState.classList.remove('hidden');
      this.postsContainer.classList.add('hidden');
      console.log('Showing empty state');
    } else {
      this.emptyState.classList.add('hidden');
      this.postsContainer.classList.remove('hidden');
      console.log('Hiding empty state');
    }
  }

  /**
   * Toggle empty state
   * @param {boolean} show - Whether to show empty state
   */
  toggleEmptyState(show) {
    if (this.emptyState) {
      this.emptyState.classList.toggle('hidden', !show);
    }
    
    if (this.postsContainer) {
      this.postsContainer.classList.toggle('hidden', show);
    }
  }

  /**
   * Update authentication UI
   * @param {Object} user - Current user
   */
  updateAuthUI(user) {
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');
    
    if (user) {
      // User is logged in
      if (loginBtn) {
        loginBtn.textContent = user.email || 'Account';
        loginBtn.onclick = () => {
          if (userMenu) {
            userMenu.classList.toggle('hidden');
          }
        };
      }
    } else {
      // User is logged out
      if (loginBtn) {
        loginBtn.textContent = 'Login';
        loginBtn.onclick = () => this.showAuthModal();
      }
      
      if (userMenu) {
        userMenu.classList.add('hidden');
      }
    }
  }

  /**
   * Show authentication modal
   * @param {string} mode - 'login' or 'signup'
   */
  showAuthModal(mode = 'login') {
    const authModalTitle = document.getElementById('authModalTitle');
    const loginTabBtn = document.getElementById('loginTabBtn');
    const signupTabBtn = document.getElementById('signupTabBtn');
    const submitAuthBtn = document.getElementById('submitAuthBtn');
    const authForm = document.getElementById('authForm');
    
    // Set initial mode
    if (authModalTitle) {
      authModalTitle.textContent = mode === 'login' ? 'Login' : 'Sign Up';
    }
    
    if (submitAuthBtn) {
      submitAuthBtn.textContent = mode === 'login' ? 'Login' : 'Sign Up';
    }
    
    // Set up tabs
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

  /**
   * Format date
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return '';
    
    // Format relative time
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
      return 'just now';
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    } else if (diffHour < 24) {
      return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
    } else if (diffDay < 7) {
      return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
    } else {
      // Format date
      return date.toLocaleDateString();
    }
  }

  /**
   * Debounce function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in ms
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Create and export a singleton instance
const uiManager = new UIManager();
