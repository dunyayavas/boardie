/**
 * Tag management module for Boardie application
 * Handles tag creation, editing, filtering, and display
 */
class TagManager {
  constructor() {
    this.activeFilters = [];
    this.allTags = [];
    this.tagFilterContainer = document.getElementById('tagFilterContainer');
    this.clearFiltersButton = document.getElementById('clearFilters');
    
    // Initialize event listeners
    this.initEventListeners();
  }

  /**
   * Initialize event listeners
   */
  initEventListeners() {
    // Clear filters button
    if (this.clearFiltersButton) {
      this.clearFiltersButton.addEventListener('click', () => this.clearAllFilters());
    }
  }

  /**
   * Load all tags from the database
   * @returns {Promise<Array>} Array of tags
   */
  async loadAllTags() {
    try {
      this.allTags = await db.getAllTags();
      return this.allTags;
    } catch (error) {
      console.error('Error loading tags:', error);
      toast.error('Failed to load tags');
      return [];
    }
  }

  /**
   * Parse tags from a comma-separated string
   * @param {string} tagString - Comma-separated tag string
   * @returns {Array} Array of trimmed tags
   */
  parseTags(tagString) {
    if (!tagString) return [];
    
    return tagString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }

  /**
   * Format tags array to a comma-separated string
   * @param {Array} tags - Array of tags
   * @returns {string} Comma-separated tag string
   */
  formatTags(tags) {
    if (!tags || !Array.isArray(tags)) return '';
    
    return tags.join(', ');
  }

  /**
   * Add a tag to a post
   * @param {Object} post - Post object
   * @param {string} tag - Tag to add
   * @returns {Promise<Object>} Updated post
   */
  async addTagToPost(post, tag) {
    if (!post || !tag) return post;
    
    // Trim tag
    const trimmedTag = tag.trim();
    if (trimmedTag.length === 0) return post;
    
    // Check if tag already exists
    if (!post.tags) {
      post.tags = [];
    }
    
    if (post.tags.includes(trimmedTag)) {
      return post;
    }
    
    // Add tag
    post.tags.push(trimmedTag);
    
    // Update post in database
    try {
      const updatedPost = await db.updatePost(post);
      return updatedPost;
    } catch (error) {
      console.error('Error adding tag to post:', error);
      toast.error(`Failed to add tag "${trimmedTag}"`);
      return post;
    }
  }

  /**
   * Remove a tag from a post
   * @param {Object} post - Post object
   * @param {string} tag - Tag to remove
   * @returns {Promise<Object>} Updated post
   */
  async removeTagFromPost(post, tag) {
    if (!post || !tag || !post.tags) return post;
    
    // Check if tag exists
    if (!post.tags.includes(tag)) {
      return post;
    }
    
    // Remove tag
    post.tags = post.tags.filter(t => t !== tag);
    
    // Update post in database
    try {
      const updatedPost = await db.updatePost(post);
      return updatedPost;
    } catch (error) {
      console.error('Error removing tag from post:', error);
      toast.error(`Failed to remove tag "${tag}"`);
      return post;
    }
  }

  /**
   * Update tags for a post
   * @param {Object} post - Post object
   * @param {Array} newTags - New tags array
   * @returns {Promise<Object>} Updated post
   */
  async updatePostTags(post, newTags) {
    if (!post) return post;
    
    // Ensure newTags is an array
    const tags = Array.isArray(newTags) ? newTags : this.parseTags(newTags);
    
    // Update post tags
    post.tags = tags;
    
    // Update post in database
    try {
      const updatedPost = await db.updatePost(post);
      return updatedPost;
    } catch (error) {
      console.error('Error updating post tags:', error);
      toast.error('Failed to update tags');
      return post;
    }
  }

  /**
   * Add a tag filter
   * @param {string} tag - Tag to filter by
   */
  addFilter(tag) {
    if (!tag || this.activeFilters.includes(tag)) return;
    
    // Add to active filters
    this.activeFilters.push(tag);
    
    // Update UI
    this.renderTagFilters();
    
    // Trigger filter change event
    this.triggerFilterChange();
  }

  /**
   * Remove a tag filter
   * @param {string} tag - Tag to remove from filters
   */
  removeFilter(tag) {
    if (!tag || !this.activeFilters.includes(tag)) return;
    
    // Remove from active filters
    this.activeFilters = this.activeFilters.filter(t => t !== tag);
    
    // Update UI
    this.renderTagFilters();
    
    // Trigger filter change event
    this.triggerFilterChange();
  }

  /**
   * Toggle a tag filter
   * @param {string} tag - Tag to toggle
   */
  toggleFilter(tag) {
    if (!tag) return;
    
    if (this.activeFilters.includes(tag)) {
      this.removeFilter(tag);
    } else {
      this.addFilter(tag);
    }
  }

  /**
   * Clear all tag filters
   */
  clearAllFilters() {
    if (this.activeFilters.length === 0) return;
    
    // Clear active filters
    this.activeFilters = [];
    
    // Update UI
    this.renderTagFilters();
    
    // Trigger filter change event
    this.triggerFilterChange();
  }

  /**
   * Render tag filters in the UI
   */
  renderTagFilters() {
    if (!this.tagFilterContainer) return;
    
    // Clear existing filters
    const existingFilters = this.tagFilterContainer.querySelectorAll('.tag-filter');
    existingFilters.forEach(filter => {
      if (!filter.classList.contains('static-element')) {
        filter.remove();
      }
    });
    
    // Add active filters
    this.activeFilters.forEach(tag => {
      const filterElement = document.createElement('span');
      filterElement.className = 'tag-filter active px-2 py-1 rounded-full text-xs font-medium bg-primary text-white flex items-center';
      filterElement.innerHTML = `
        ${tag}
        <button class="ml-1 focus:outline-none" aria-label="Remove filter">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      `;
      
      // Add event listener to remove button
      const removeButton = filterElement.querySelector('button');
      removeButton.addEventListener('click', () => this.removeFilter(tag));
      
      // Add to container before the clear button
      this.tagFilterContainer.insertBefore(filterElement, this.clearFiltersButton);
    });
    
    // Show/hide clear button
    if (this.clearFiltersButton) {
      this.clearFiltersButton.classList.toggle('hidden', this.activeFilters.length === 0);
    }
  }

  /**
   * Create tag elements for a post
   * @param {Array} tags - Array of tags
   * @param {boolean} interactive - Whether tags should be interactive
   * @param {Function} onTagClick - Callback for tag click
   * @param {Function} onTagRemove - Callback for tag remove
   * @returns {DocumentFragment} Fragment containing tag elements
   */
  createTagElements(tags, interactive = true, onTagClick = null, onTagRemove = null) {
    const fragment = document.createDocumentFragment();
    
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return fragment;
    }
    
    // Limit number of tags displayed
    const maxTags = CONFIG.ui.maxTagsDisplayed || 5;
    const displayTags = tags.slice(0, maxTags);
    const hasMoreTags = tags.length > maxTags;
    
    // Create tag elements
    displayTags.forEach(tag => {
      const tagElement = document.createElement('span');
      tagElement.className = 'tag inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 mr-1 mb-1';
      
      if (interactive) {
        tagElement.classList.add('cursor-pointer', 'hover:bg-gray-300', 'dark:hover:bg-gray-600');
      }
      
      if (this.activeFilters.includes(tag)) {
        tagElement.classList.add('bg-primary', 'text-white');
      }
      
      // Create tag content
      if (onTagRemove) {
        tagElement.innerHTML = `
          ${tag}
          <button class="ml-1 focus:outline-none" aria-label="Remove tag">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        `;
        
        // Add event listener to remove button
        const removeButton = tagElement.querySelector('button');
        removeButton.addEventListener('click', (e) => {
          e.stopPropagation();
          onTagRemove(tag);
        });
      } else {
        tagElement.textContent = tag;
      }
      
      // Add event listener for tag click
      if (interactive && onTagClick) {
        tagElement.addEventListener('click', () => onTagClick(tag));
      }
      
      fragment.appendChild(tagElement);
    });
    
    // Add "more" indicator if needed
    if (hasMoreTags) {
      const moreElement = document.createElement('span');
      moreElement.className = 'inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 mr-1 mb-1';
      moreElement.textContent = `+${tags.length - maxTags} more`;
      fragment.appendChild(moreElement);
    }
    
    return fragment;
  }

  /**
   * Trigger a filter change event
   */
  triggerFilterChange() {
    document.dispatchEvent(new CustomEvent('tagfilter:change', {
      detail: {
        filters: this.activeFilters
      }
    }));
  }

  /**
   * Get active filters
   * @returns {Array} Active tag filters
   */
  getActiveFilters() {
    return [...this.activeFilters];
  }
}

// Create and export a singleton instance
const tagManager = new TagManager();
