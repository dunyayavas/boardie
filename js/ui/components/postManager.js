/**
 * Post Manager module for Boardie application
 * Handles post rendering, loading, and management
 */
class PostManager {
  constructor() {
    // UI elements
    this.postsContainer = document.getElementById('postsContainer');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.emptyState = document.getElementById('emptyState');
    this.infiniteScrollSentinel = document.getElementById('infiniteScrollSentinel');
    this.searchInput = document.getElementById('searchInput');
    this.sortSelect = document.getElementById('sortSelect');
    
    // State
    this.isLoading = false;
    this.hasMorePosts = true;
    this.currentPage = 0;
    this.postsPerPage = CONFIG.ui.postsPerPage || 20;
    this.currentSearchTerm = '';
    this.currentSort = { by: 'dateAdded', order: 'desc' };
    
    // Initialize
    this.setupEventListeners();
    this.setupInfiniteScroll();
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
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
   * Reset and reload posts
   */
  resetAndReload() {
    // Reset state
    this.currentPage = 0;
    this.hasMorePosts = true;
    
    // Clear posts container
    if (this.postsContainer) {
      this.postsContainer.innerHTML = '';
    }
    
    // Load posts
    this.loadPosts();
  }

  /**
   * Load posts
   */
  async loadPosts() {
    if (this.isLoading || !this.hasMorePosts) return;
    
    this.showLoading();
    
    try {
      // Get active tag filters
      const tagFilters = window.tagManager ? window.tagManager.getActiveFilters() : [];
      
      // Get posts from database
      const posts = await db.getAllPosts({
        page: this.currentPage,
        limit: this.postsPerPage,
        search: this.currentSearchTerm,
        tags: tagFilters,
        sort: this.currentSort
      });
      
      // Check if there are more posts
      this.hasMorePosts = posts.length === this.postsPerPage;
      
      // Render posts
      this.renderPosts(posts);
      
      // Toggle empty state
      this.toggleEmptyState(this.currentPage === 0 && posts.length === 0);
      
      // Increment page
      this.currentPage++;
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error('Failed to load posts');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Load more posts
   */
  async loadMorePosts() {
    await this.loadPosts();
  }

  /**
   * Render posts
   * @param {Array} posts - Array of posts to render
   */
  renderPosts(posts) {
    if (!this.postsContainer || !posts || !posts.length) return;
    
    // Create document fragment
    const fragment = document.createDocumentFragment();
    
    // Create post elements
    posts.forEach(post => {
      const postElement = this.createPostElement(post);
      fragment.appendChild(postElement);
    });
    
    // Append to container
    this.postsContainer.appendChild(fragment);
    
    // Load embeds
    setTimeout(() => {
      this.loadEmbeds();
      this.updateMasonryLayout();
    }, 100);
  }

  /**
   * Create a post element
   * @param {Object} post - Post object
   * @returns {HTMLElement} Post element
   */
  createPostElement(post) {
    // Create post element
    const postElement = document.createElement('div');
    postElement.className = 'post-item bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col';
    postElement.dataset.id = post.id;
    postElement.dataset.platform = post.platform;
    
    // Create post header
    const postHeader = document.createElement('div');
    postHeader.className = 'p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center';
    
    // Platform icon and date
    const platformInfo = document.createElement('div');
    platformInfo.className = 'flex items-center';
    
    // Platform icon
    const platformIcon = document.createElement('span');
    platformIcon.className = 'mr-2';
    
    switch (post.platform) {
      case 'twitter':
        platformIcon.innerHTML = '<svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>';
        break;
      case 'instagram':
        platformIcon.innerHTML = '<svg class="w-5 h-5 text-pink-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>';
        break;
      case 'youtube':
        platformIcon.innerHTML = '<svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>';
        break;
      case 'linkedin':
        platformIcon.innerHTML = '<svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>';
        break;
      default:
        platformIcon.innerHTML = '<svg class="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14.8 3a2 2 0 0 1 1.4.6l4.2 4.2a2 2 0 0 1 .6 1.4V21a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9.8zm-1 2H5v16h14V9.8l-4.2-4.2a1 1 0 0 0-.7-.3h-1.3v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-3h1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-3z"/></svg>';
    }
    
    platformInfo.appendChild(platformIcon);
    
    // Date
    const dateAdded = document.createElement('span');
    dateAdded.className = 'text-sm text-gray-500 dark:text-gray-400';
    dateAdded.textContent = this.formatDate(post.dateAdded);
    platformInfo.appendChild(dateAdded);
    
    postHeader.appendChild(platformInfo);
    
    // Actions
    const actions = document.createElement('div');
    actions.className = 'flex space-x-2';
    
    // Edit button
    const editButton = document.createElement('button');
    editButton.className = 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300';
    editButton.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>';
    editButton.addEventListener('click', () => window.uiManager.showAddLinkModal(post));
    actions.appendChild(editButton);
    
    // Delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'text-gray-500 hover:text-red-500';
    deleteButton.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>';
    deleteButton.addEventListener('click', () => this.confirmDeletePost(post));
    actions.appendChild(deleteButton);
    
    postHeader.appendChild(actions);
    postElement.appendChild(postHeader);
    
    // Create embed container
    const embedContainer = document.createElement('div');
    embedContainer.className = 'embed-container flex-grow p-4';
    embedContainer.dataset.url = post.url;
    embedContainer.dataset.platform = post.platform;
    
    // Add loading placeholder
    const loadingPlaceholder = document.createElement('div');
    loadingPlaceholder.className = 'embed-placeholder bg-gray-100 dark:bg-gray-700 rounded-md p-4 flex items-center justify-center min-h-[200px]';
    loadingPlaceholder.innerHTML = '<svg class="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
    embedContainer.appendChild(loadingPlaceholder);
    
    postElement.appendChild(embedContainer);
    
    // Create post footer
    const postFooter = document.createElement('div');
    postFooter.className = 'p-3 border-t border-gray-200 dark:border-gray-700';
    
    // Tags
    if (post.tags && post.tags.length) {
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'flex flex-wrap gap-2';
      
      post.tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        tagElement.textContent = tag;
        tagsContainer.appendChild(tagElement);
      });
      
      postFooter.appendChild(tagsContainer);
    }
    
    postElement.appendChild(postFooter);
    
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
      // Delete post from database
      await db.deletePost(post.id);
      
      // Remove post element
      const postElement = document.querySelector(`.post-item[data-id="${post.id}"]`);
      
      if (postElement) {
        // Fade out animation
        postElement.style.transition = 'opacity 0.3s, transform 0.3s';
        postElement.style.opacity = '0';
        postElement.style.transform = 'scale(0.95)';
        
        // Remove after animation
        setTimeout(() => {
          postElement.remove();
          
          // Update masonry layout
          this.updateMasonryLayout();
          
          // Check if there are no posts left
          if (!this.postsContainer.children.length) {
            this.toggleEmptyState(true);
          }
        }, 300);
      }
      
      toast.success('Post deleted successfully');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  }

  /**
   * Load embeds for visible posts
   */
  loadEmbeds() {
    // Get all embed containers
    const embedContainers = document.querySelectorAll('.embed-container');
    
    if (!embedContainers.length) return;
    
    // Create intersection observer
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const container = entry.target;
          const url = container.dataset.url;
          const platform = container.dataset.platform;
          
          if (url && platform) {
            // Remove placeholder
            const placeholder = container.querySelector('.embed-placeholder');
            if (placeholder) {
              placeholder.remove();
            }
            
            // Load embed
            embedHandler.loadEmbed(url, platform, container)
              .catch(error => {
                console.error('Error loading embed:', error);
                
                // Show error message
                container.innerHTML = `
                  <div class="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-md">
                    <p class="font-medium">Failed to load embed</p>
                    <p class="text-sm mt-1">${error.message || 'An error occurred while loading the embed.'}</p>
                    <a href="${url}" target="_blank" rel="noopener noreferrer" class="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">Open original link</a>
                  </div>
                `;
              });
            
            // Unobserve after loading
            observer.unobserve(container);
          }
        }
      });
    }, {
      rootMargin: '200px 0px',
      threshold: 0.1
    });
    
    // Observe embed containers
    embedContainers.forEach(container => {
      observer.observe(container);
    });
  }

  /**
   * Update masonry layout
   */
  updateMasonryLayout() {
    if (!this.postsContainer) return;
    
    // Get all post items
    const postItems = this.postsContainer.querySelectorAll('.post-item');
    
    if (!postItems.length) return;
    
    // Reset heights
    postItems.forEach(item => {
      item.style.gridRowEnd = '';
    });
    
    // Apply masonry layout
    setTimeout(() => {
      postItems.forEach(item => {
        const height = item.getBoundingClientRect().height;
        const rowSpan = Math.ceil(height / 10); // 10px grid
        item.style.gridRowEnd = `span ${rowSpan}`;
      });
    }, 100);
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
   * Toggle empty state
   * @param {boolean} show - Whether to show empty state
   */
  toggleEmptyState(show) {
    if (this.emptyState) {
      if (show) {
        this.emptyState.classList.remove('hidden');
      } else {
        this.emptyState.classList.add('hidden');
      }
    }
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

// Make PostManager available globally
window.PostManager = PostManager;
