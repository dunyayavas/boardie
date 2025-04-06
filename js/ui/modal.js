/**
 * Modal manager module for Boardie application
 * Handles displaying and managing modal dialogs
 */
class ModalManager {
  constructor() {
    this.activeModals = [];
    this.modalStack = [];
    
    // Close modals when ESC key is pressed
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalStack.length > 0) {
        this.closeTopModal();
      }
    });
  }

  /**
   * Open a modal dialog
   * @param {string} modalId - ID of the modal element
   * @param {Object} options - Modal options
   * @returns {Object} Modal control object
   */
  open(modalId, options = {}) {
    const modal = document.getElementById(modalId);
    
    if (!modal) {
      console.error(`Modal with ID "${modalId}" not found`);
      return null;
    }
    
    // Default options
    const defaultOptions = {
      closeOnOverlayClick: true,
      onOpen: null,
      onClose: null,
      data: {}
    };
    
    // Merge options
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Create modal control object
    const modalControl = {
      id: modalId,
      element: modal,
      overlay: modal.querySelector('[id$="Overlay"]'),
      closeButton: modal.querySelector('[id^="close"][id$="Btn"]'),
      cancelButton: modal.querySelector('[id^="cancel"][id$="Btn"]'),
      options: mergedOptions,
      isOpen: false,
      
      // Open the modal
      open: () => {
        // Show modal
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        
        // Add to active modals
        this.activeModals.push(modalControl);
        this.modalStack.push(modalControl);
        
        // Set focus trap
        this.trapFocus(modal);
        
        // Set flag
        modalControl.isOpen = true;
        
        // Call onOpen callback
        if (typeof mergedOptions.onOpen === 'function') {
          mergedOptions.onOpen(mergedOptions.data);
        }
        
        // Dispatch event
        modal.dispatchEvent(new CustomEvent('modal:open', { detail: mergedOptions.data }));
        
        return modalControl;
      },
      
      // Close the modal
      close: (result) => {
        // Hide modal
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        
        // Remove from active modals
        this.activeModals = this.activeModals.filter(m => m.id !== modalId);
        this.modalStack = this.modalStack.filter(m => m.id !== modalId);
        
        // Release focus trap
        this.releaseFocus();
        
        // Set flag
        modalControl.isOpen = false;
        
        // Call onClose callback
        if (typeof mergedOptions.onClose === 'function') {
          mergedOptions.onClose(result);
        }
        
        // Dispatch event
        modal.dispatchEvent(new CustomEvent('modal:close', { detail: result }));
        
        return modalControl;
      },
      
      // Update modal data
      update: (data) => {
        modalControl.options.data = { ...modalControl.options.data, ...data };
        
        // Dispatch event
        modal.dispatchEvent(new CustomEvent('modal:update', { detail: modalControl.options.data }));
        
        return modalControl;
      }
    };
    
    // Set up event listeners
    
    // Close button
    if (modalControl.closeButton) {
      modalControl.closeButton.addEventListener('click', () => {
        modalControl.close({ action: 'close' });
      });
    }
    
    // Cancel button
    if (modalControl.cancelButton) {
      modalControl.cancelButton.addEventListener('click', () => {
        modalControl.close({ action: 'cancel' });
      });
    }
    
    // Overlay click
    if (modalControl.overlay && mergedOptions.closeOnOverlayClick) {
      modalControl.overlay.addEventListener('click', (e) => {
        if (e.target === modalControl.overlay) {
          modalControl.close({ action: 'overlay' });
        }
      });
    }
    
    // Open the modal
    return modalControl.open();
  }

  /**
   * Close the top modal in the stack
   * @returns {boolean} True if a modal was closed
   */
  closeTopModal() {
    if (this.modalStack.length > 0) {
      const topModal = this.modalStack[this.modalStack.length - 1];
      topModal.close({ action: 'escape' });
      return true;
    }
    
    return false;
  }

  /**
   * Close all open modals
   */
  closeAll() {
    [...this.activeModals].forEach(modal => {
      modal.close({ action: 'closeAll' });
    });
  }

  /**
   * Check if a modal is open
   * @param {string} modalId - ID of the modal element
   * @returns {boolean} True if the modal is open
   */
  isOpen(modalId) {
    return this.activeModals.some(modal => modal.id === modalId);
  }

  /**
   * Trap focus within a modal
   * @param {HTMLElement} modal - Modal element
   */
  trapFocus(modal) {
    // Find all focusable elements
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // Focus the first element
    setTimeout(() => {
      firstElement.focus();
    }, 100);
    
    // Set up focus trap
    modal._focusTrap = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    // Add event listener
    modal.addEventListener('keydown', modal._focusTrap);
  }

  /**
   * Release focus trap
   */
  releaseFocus() {
    // Remove event listeners from all modals
    this.activeModals.forEach(modal => {
      if (modal.element._focusTrap) {
        modal.element.removeEventListener('keydown', modal.element._focusTrap);
        delete modal.element._focusTrap;
      }
    });
  }
}

// Create and export a singleton instance
const modal = new ModalManager();
