/**
 * Link Manager module for Boardie application
 * Handles adding and editing links
 */
class LinkManager {
  constructor() {
    this.addLinkBtn = document.getElementById('addLinkBtn');
    this.emptyStateAddBtn = document.getElementById('emptyStateAddBtn');
    
    this.setupEventListeners();
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Add link button
    if (this.addLinkBtn) {
      this.addLinkBtn.addEventListener('click', () => this.showAddLinkModal());
    }
    
    // Empty state add button
    if (this.emptyStateAddBtn) {
      this.emptyStateAddBtn.addEventListener('click', () => this.showAddLinkModal());
    }
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
    const saveModalBtn = document.getElementById('saveModalBtn');
    
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
      linkTags.value = isEdit ? tagManager.formatTags(post.tags) : '';
    }
    
    // Set button text
    if (saveModalBtn) {
      saveModalBtn.textContent = isEdit ? 'Update' : 'Save';
    }
    
    // Show modal
    modal.open('linkModal', {
      onClose: (result) => {
        // Clear form on close
        if (linkForm) {
          linkForm.reset();
        }
      }
    });
    
    // Set up form submission
    if (linkForm) {
      linkForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const id = linkId.value;
        const url = linkUrl.value.trim();
        const tags = tagManager.parseTags(linkTags.value);
        
        if (!url) {
          toast.error('Please enter a valid URL');
          return;
        }
        
        try {
          if (isEdit) {
            // Update existing post
            const updatedPost = { ...post, tags };
            await db.updatePost(updatedPost);
            toast.success('Link updated successfully');
          } else {
            // Add new post
            const platform = this.detectPlatform(url);
            const newPost = {
              url,
              tags,
              platform,
              dateAdded: new Date().toISOString()
            };
            
            await db.addPost(newPost);
            toast.success('Link added successfully');
          }
          
          // Close modal
          modal.closeTopModal();
          
          // Reload posts
          if (window.postManager) {
            console.log('Reloading posts via postManager');
            window.postManager.resetAndReload();
          } else if (window.uiManager && window.uiManager.components && window.uiManager.components.posts) {
            console.log('Reloading posts via uiManager.components.posts');
            window.uiManager.components.posts.resetAndReload();
          } else {
            console.error('Cannot reload posts: postManager not available');
          }
        } catch (error) {
          console.error('Error saving link:', error);
          toast.error(isEdit ? 'Failed to update link' : 'Failed to add link');
        }
      };
    }
  }

  /**
   * Detect platform from URL
   * @param {string} url - URL to detect platform from
   * @returns {string} Platform name
   */
  detectPlatform(url) {
    if (url.includes('twitter.com') || url.includes('x.com')) {
      return 'twitter';
    } else if (url.includes('instagram.com')) {
      return 'instagram';
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    } else if (url.includes('linkedin.com')) {
      return 'linkedin';
    } else {
      return 'website';
    }
  }
}

// Make LinkManager available globally
window.LinkManager = LinkManager;
