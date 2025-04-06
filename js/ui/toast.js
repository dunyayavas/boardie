/**
 * Toast notification module for Boardie application
 * Handles displaying toast messages to the user
 */
class ToastManager {
  constructor() {
    this.container = document.getElementById('toastContainer');
    this.toasts = [];
    this.defaultDuration = CONFIG.ui.toastDuration || 3000;
  }

  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {string} type - Type of toast (success, error, info, warning)
   * @param {number} duration - Duration to show toast in ms
   * @returns {Object} Toast element and close function
   */
  show(message, type = 'info', duration = this.defaultDuration) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast flex items-center p-4 mb-3 rounded-lg shadow-lg max-w-md animate-slideUp`;
    
    // Set background color based on type
    switch (type) {
      case 'success':
        toast.classList.add('bg-green-500', 'text-white');
        break;
      case 'error':
        toast.classList.add('bg-red-500', 'text-white');
        break;
      case 'warning':
        toast.classList.add('bg-yellow-500', 'text-white');
        break;
      case 'info':
      default:
        toast.classList.add('bg-blue-500', 'text-white');
        break;
    }
    
    // Create icon based on type
    let icon = '';
    switch (type) {
      case 'success':
        icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>`;
        break;
      case 'error':
        icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>`;
        break;
      case 'warning':
        icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>`;
        break;
      case 'info':
      default:
        icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>`;
        break;
    }
    
    // Set content
    toast.innerHTML = `
      <div class="flex items-center">
        ${icon}
        <div class="flex-grow">${message}</div>
        <button class="ml-2 text-white hover:text-gray-200 focus:outline-none" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    `;
    
    // Add to container
    this.container.appendChild(toast);
    
    // Add to toasts array
    this.toasts.push(toast);
    
    // Set up close button
    const closeButton = toast.querySelector('button');
    closeButton.addEventListener('click', () => this.close(toast));
    
    // Set up auto-close timer
    const timer = setTimeout(() => this.close(toast), duration);
    
    // Store timer on toast element
    toast._timer = timer;
    
    // Return toast element and close function
    return {
      element: toast,
      close: () => this.close(toast)
    };
  }

  /**
   * Close a toast notification
   * @param {HTMLElement} toast - Toast element to close
   */
  close(toast) {
    // Clear timer if exists
    if (toast._timer) {
      clearTimeout(toast._timer);
    }
    
    // Add exit animation
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    // Remove after animation
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      
      // Remove from toasts array
      this.toasts = this.toasts.filter(t => t !== toast);
    }, 300);
  }

  /**
   * Show a success toast
   * @param {string} message - Message to display
   * @param {number} duration - Duration to show toast in ms
   * @returns {Object} Toast element and close function
   */
  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  /**
   * Show an error toast
   * @param {string} message - Message to display
   * @param {number} duration - Duration to show toast in ms
   * @returns {Object} Toast element and close function
   */
  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  /**
   * Show a warning toast
   * @param {string} message - Message to display
   * @param {number} duration - Duration to show toast in ms
   * @returns {Object} Toast element and close function
   */
  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  /**
   * Show an info toast
   * @param {string} message - Message to display
   * @param {number} duration - Duration to show toast in ms
   * @returns {Object} Toast element and close function
   */
  info(message, duration) {
    return this.show(message, 'info', duration);
  }

  /**
   * Close all toasts
   */
  closeAll() {
    [...this.toasts].forEach(toast => this.close(toast));
  }
}

// Create and export a singleton instance
const toast = new ToastManager();
