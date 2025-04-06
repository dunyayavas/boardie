/**
 * Embed handlers module for Boardie application
 * Handles loading and displaying embeds from different platforms
 */
class EmbedHandler {
  constructor() {
    // Track loaded script libraries
    this.loadedScripts = {
      twitter: false,
      instagram: false,
      youtube: false,
      linkedin: false
    };
    
    // Initialize platform handlers
    this.handlers = {
      twitter: this.handleTwitterEmbed.bind(this),
      instagram: this.handleInstagramEmbed.bind(this),
      youtube: this.handleYouTubeEmbed.bind(this),
      linkedin: this.handleLinkedInEmbed.bind(this),
      website: this.handleWebsiteEmbed.bind(this)
    };
  }

  /**
   * Load an embed
   * @param {string} url - URL to embed
   * @param {string} platform - Platform name
   * @param {HTMLElement} container - Container element
   * @returns {Promise} Resolves when embed is loaded
   */
  async loadEmbed(url, platform, container) {
    if (!url || !platform || !container) {
      return Promise.reject(new Error('Missing required parameters'));
    }
    
    // Get handler for platform
    const handler = this.handlers[platform];
    
    if (!handler) {
      return Promise.reject(new Error(`No handler for platform: ${platform}`));
    }
    
    try {
      // Call platform-specific handler
      await handler(url, container);
      return Promise.resolve();
    } catch (error) {
      console.error(`Error loading ${platform} embed:`, error);
      return Promise.reject(error);
    }
  }

  /**
   * Load a script
   * @param {string} url - Script URL
   * @returns {Promise} Resolves when script is loaded
   */
  loadScript(url) {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (document.querySelector(`script[src="${url}"]`)) {
        resolve();
        return;
      }
      
      // Create script element
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      
      // Set up event handlers
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      
      // Add to document
      document.head.appendChild(script);
    });
  }

  /**
   * Handle Twitter embed
   * @param {string} url - Twitter URL
   * @param {HTMLElement} container - Container element
   * @returns {Promise} Resolves when embed is loaded
   */
  async handleTwitterEmbed(url, container) {
    // Load Twitter widget script if not already loaded
    if (!this.loadedScripts.twitter) {
      await this.loadScript('https://platform.twitter.com/widgets.js');
      this.loadedScripts.twitter = true;
    }
    
    // Extract tweet ID
    const match = url.match(CONFIG.platforms.twitter.pattern);
    
    if (!match || !match[2]) {
      throw new Error('Invalid Twitter URL');
    }
    
    const tweetId = match[2];
    
    // Create tweet container
    container.innerHTML = `<div class="twitter-tweet-container"></div>`;
    const tweetContainer = container.querySelector('.twitter-tweet-container');
    
    // Create tweet
    return new Promise((resolve, reject) => {
      if (!window.twttr) {
        reject(new Error('Twitter widget script not loaded'));
        return;
      }
      
      window.twttr.widgets.createTweet(
        tweetId,
        tweetContainer,
        {
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          dnt: true,
          cards: 'visible',
          conversation: 'none'
        }
      ).then(el => {
        if (el) {
          resolve();
        } else {
          reject(new Error('Failed to create tweet'));
        }
      }).catch(reject);
    });
  }

  /**
   * Handle Instagram embed
   * @param {string} url - Instagram URL
   * @param {HTMLElement} container - Container element
   * @returns {Promise} Resolves when embed is loaded
   */
  async handleInstagramEmbed(url, container) {
    // Load Instagram embed script if not already loaded
    if (!this.loadedScripts.instagram) {
      await this.loadScript('https://www.instagram.com/embed.js');
      this.loadedScripts.instagram = true;
    }
    
    // Extract post ID
    const match = url.match(CONFIG.platforms.instagram.pattern);
    
    if (!match || !match[1]) {
      throw new Error('Invalid Instagram URL');
    }
    
    const postId = match[1];
    const isReel = url.includes('/reel/');
    const embedUrl = isReel 
      ? `https://www.instagram.com/reel/${postId}/embed/`
      : `https://www.instagram.com/p/${postId}/embed/`;
    
    // Create iframe
    container.innerHTML = `
      <iframe
        src="${embedUrl}"
        frameborder="0"
        scrolling="no"
        allowtransparency="true"
        allowfullscreen="true"
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
      ></iframe>
    `;
    
    // Return resolved promise
    return Promise.resolve();
  }

  /**
   * Handle YouTube embed
   * @param {string} url - YouTube URL
   * @param {HTMLElement} container - Container element
   * @returns {Promise} Resolves when embed is loaded
   */
  async handleYouTubeEmbed(url, container) {
    // Extract video ID
    const match = url.match(CONFIG.platforms.youtube.pattern);
    
    if (!match || !match[1]) {
      throw new Error('Invalid YouTube URL');
    }
    
    const videoId = match[1];
    
    // Extract timestamp if present
    let timestamp = '';
    if (url.includes('t=') || url.includes('time_continue=')) {
      const timeMatch = url.match(/[?&](t|time_continue)=([0-9hms]+)/);
      if (timeMatch && timeMatch[2]) {
        timestamp = `?start=${this.parseYouTubeTimestamp(timeMatch[2])}`;
      }
    }
    
    // Create iframe
    container.innerHTML = `
      <iframe
        src="https://www.youtube.com/embed/${videoId}${timestamp}"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
      ></iframe>
    `;
    
    // Return resolved promise
    return Promise.resolve();
  }

  /**
   * Parse YouTube timestamp
   * @param {string} timestamp - YouTube timestamp (e.g. 1h2m3s or 123)
   * @returns {number} Timestamp in seconds
   */
  parseYouTubeTimestamp(timestamp) {
    // If timestamp is just a number, return it
    if (/^\d+$/.test(timestamp)) {
      return parseInt(timestamp, 10);
    }
    
    // Parse timestamp in format 1h2m3s
    let seconds = 0;
    const hours = timestamp.match(/(\d+)h/);
    const minutes = timestamp.match(/(\d+)m/);
    const secs = timestamp.match(/(\d+)s/);
    
    if (hours && hours[1]) {
      seconds += parseInt(hours[1], 10) * 3600;
    }
    
    if (minutes && minutes[1]) {
      seconds += parseInt(minutes[1], 10) * 60;
    }
    
    if (secs && secs[1]) {
      seconds += parseInt(secs[1], 10);
    }
    
    return seconds;
  }

  /**
   * Handle LinkedIn embed
   * @param {string} url - LinkedIn URL
   * @param {HTMLElement} container - Container element
   * @returns {Promise} Resolves when embed is loaded
   */
  async handleLinkedInEmbed(url, container) {
    // LinkedIn doesn't provide a simple embed API like other platforms
    // We'll create a preview card with a link to the original post
    
    // Extract post ID
    const match = url.match(CONFIG.platforms.linkedin.pattern);
    
    if (!match || !match[1]) {
      throw new Error('Invalid LinkedIn URL');
    }
    
    // Create preview card
    container.innerHTML = `
      <div class="linkedin-preview flex flex-col items-center justify-center h-full p-4 bg-gray-50 dark:bg-gray-800">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-12 h-12 text-[#0077B5] mb-3">
          <path fill="currentColor" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">LinkedIn Post</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">LinkedIn doesn't support direct embedding. Click below to view the original post.</p>
        <a href="${url}" target="_blank" rel="noopener noreferrer" class="px-4 py-2 bg-[#0077B5] text-white rounded-lg hover:bg-[#006699] transition-colors">
          View on LinkedIn
        </a>
      </div>
    `;
    
    // Return resolved promise
    return Promise.resolve();
  }

  /**
   * Handle website embed
   * @param {string} url - Website URL
   * @param {HTMLElement} container - Container element
   * @returns {Promise} Resolves when embed is loaded
   */
  async handleWebsiteEmbed(url, container) {
    try {
      // Show loading state
      container.innerHTML = `
        <div class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
          <div class="loading-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      `;
      
      // Fetch metadata from proxy service
      // In a real app, you'd have a server-side proxy to fetch metadata
      // For this demo, we'll simulate metadata
      
      // Parse URL to get domain
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      // Create a basic preview with domain info
      const previewData = {
        title: url,
        description: `Content from ${domain}`,
        image: '',
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        url: url
      };
      
      // Create preview card
      container.innerHTML = `
        <div class="website-preview">
          <div class="website-preview-image bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            ${previewData.image ? 
              `<img src="${previewData.image}" alt="${previewData.title}" class="w-full h-full object-cover">` :
              `<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>`
            }
          </div>
          <div class="website-preview-content">
            <h3 class="website-preview-title text-gray-800 dark:text-gray-200">${previewData.title}</h3>
            <p class="website-preview-description">${previewData.description}</p>
            <div class="website-preview-url">
              <img src="${previewData.favicon}" alt="" class="website-preview-favicon">
              <span>${domain}</span>
            </div>
          </div>
        </div>
      `;
      
      // Add click handler to open URL
      container.querySelector('.website-preview').addEventListener('click', () => {
        window.open(url, '_blank', 'noopener,noreferrer');
      });
      
      // Return resolved promise
      return Promise.resolve();
    } catch (error) {
      console.error('Error creating website preview:', error);
      
      // Create fallback preview
      container.innerHTML = `
        <div class="website-preview">
          <div class="website-preview-content p-4">
            <h3 class="website-preview-title text-gray-800 dark:text-gray-200 mb-2">Website Link</h3>
            <a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline break-all">${url}</a>
          </div>
        </div>
      `;
      
      // Return resolved promise (we don't want to fail the embed)
      return Promise.resolve();
    }
  }
}

// Create and export a singleton instance
const embedHandler = new EmbedHandler();
