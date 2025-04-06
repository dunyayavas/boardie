/**
 * Database module for Boardie application
 * Handles local storage using IndexedDB with localStorage as fallback
 */
class BoardieDB {
  constructor() {
    this.db = null;
    this.isIndexedDBSupported = 'indexedDB' in window;
    this.isInitialized = false;
    this.pendingOperations = [];
    this.supabaseClient = null;
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnlineStatusChange(true));
    window.addEventListener('offline', () => this.handleOnlineStatusChange(false));
  }

  /**
   * Initialize the database connection
   * @returns {Promise} Resolves when the database is ready
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
        
        // Check if user is authenticated
        const { data: { user } } = await this.supabaseClient.auth.getUser();
        this.currentUser = user;
      }
      
      if (this.isIndexedDBSupported) {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(CONFIG.storage.dbName, CONFIG.storage.dbVersion);
          
          request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            this.fallbackToLocalStorage();
            resolve();
          };
          
          request.onsuccess = (event) => {
            this.db = event.target.result;
            this.isInitialized = true;
            
            // Process any pending operations
            this.processPendingOperations();
            
            // Sync with Supabase if online and authenticated
            if (this.isOnline && this.currentUser) {
              this.syncWithSupabase();
            }
            
            resolve();
          };
          
          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create object stores if they don't exist
            if (!db.objectStoreNames.contains(CONFIG.storage.postsStore)) {
              const postsStore = db.createObjectStore(CONFIG.storage.postsStore, { keyPath: 'id' });
              postsStore.createIndex('url', 'url', { unique: true });
              postsStore.createIndex('platform', 'platform', { unique: false });
              postsStore.createIndex('dateAdded', 'dateAdded', { unique: false });
              postsStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
            }
            
            if (!db.objectStoreNames.contains(CONFIG.storage.tagsStore)) {
              const tagsStore = db.createObjectStore(CONFIG.storage.tagsStore, { keyPath: 'name' });
              tagsStore.createIndex('count', 'count', { unique: false });
            }
            
            if (!db.objectStoreNames.contains(CONFIG.storage.settingsStore)) {
              db.createObjectStore(CONFIG.storage.settingsStore, { keyPath: 'key' });
            }
          };
        });
      } else {
        this.fallbackToLocalStorage();
        return Promise.resolve();
      }
    } catch (error) {
      console.error('Error initializing database:', error);
      this.fallbackToLocalStorage();
      return Promise.resolve();
    }
  }

  /**
   * Fall back to localStorage if IndexedDB is not supported
   */
  fallbackToLocalStorage() {
    console.warn('Falling back to localStorage');
    this.isIndexedDBSupported = false;
    this.isInitialized = true;
    
    // Initialize localStorage with default structure if not exists
    if (!localStorage.getItem(CONFIG.storage.fallbackKey)) {
      localStorage.setItem(CONFIG.storage.fallbackKey, JSON.stringify({
        posts: [],
        tags: [],
        settings: {}
      }));
    }
    
    // Process any pending operations
    this.processPendingOperations();
  }

  /**
   * Process operations that were queued while the DB was initializing
   */
  processPendingOperations() {
    while (this.pendingOperations.length > 0) {
      const operation = this.pendingOperations.shift();
      operation();
    }
  }

  /**
   * Handle online/offline status changes
   * @param {boolean} isOnline - Whether the device is online
   */
  handleOnlineStatusChange(isOnline) {
    this.isOnline = isOnline;
    document.body.classList.toggle('offline', !isOnline);
    
    if (isOnline && this.currentUser) {
      this.syncWithSupabase();
    }
  }

  /**
   * Sync local data with Supabase
   */
  async syncWithSupabase() {
    if (!this.supabaseClient || !this.currentUser) return;
    
    try {
      // Process sync queue first
      while (this.syncQueue.length > 0) {
        const { action, data } = this.syncQueue.shift();
        
        switch (action) {
          case 'add':
            await this.supabaseClient.from('posts').insert(data);
            break;
          case 'update':
            await this.supabaseClient.from('posts').update(data).eq('id', data.id);
            break;
          case 'delete':
            await this.supabaseClient.from('posts').delete().eq('id', data.id);
            break;
        }
      }
      
      // Fetch remote data and merge with local
      const { data: remotePosts, error } = await this.supabaseClient
        .from('posts')
        .select('*')
        .eq('user_id', this.currentUser.id);
      
      if (error) throw error;
      
      // Get local posts
      const localPosts = await this.getAllPosts();
      
      // Merge remote and local posts
      for (const remotePost of remotePosts) {
        const localPost = localPosts.find(p => p.id === remotePost.id);
        
        if (!localPost) {
          // Remote post doesn't exist locally, add it
          await this.addPost(remotePost, false);
        } else if (remotePost.updatedAt > localPost.updatedAt) {
          // Remote post is newer, update local
          await this.updatePost(remotePost, false);
        }
      }
      
      // Push local posts that don't exist remotely
      for (const localPost of localPosts) {
        const remotePost = remotePosts.find(p => p.id === localPost.id);
        
        if (!remotePost) {
          // Local post doesn't exist remotely, push it
          await this.supabaseClient.from('posts').insert({
            ...localPost,
            user_id: this.currentUser.id
          });
        }
      }
    } catch (error) {
      console.error('Error syncing with Supabase:', error);
    }
  }

  /**
   * Add a post to the database
   * @param {Object} post - The post to add
   * @param {boolean} sync - Whether to sync with Supabase
   * @returns {Promise<Object>} The added post
   */
  async addPost(post, sync = true) {
    if (!this.isInitialized) {
      return new Promise((resolve) => {
        this.pendingOperations.push(() => {
          this.addPost(post, sync).then(resolve);
        });
      });
    }
    
    // Generate ID if not provided
    if (!post.id) {
      post.id = crypto.randomUUID();
    }
    
    // Set timestamps
    const now = new Date().toISOString();
    post.dateAdded = post.dateAdded || now;
    post.updatedAt = now;
    
    try {
      if (this.isIndexedDBSupported) {
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction([CONFIG.storage.postsStore, CONFIG.storage.tagsStore], 'readwrite');
          const postsStore = transaction.objectStore(CONFIG.storage.postsStore);
          const tagsStore = transaction.objectStore(CONFIG.storage.tagsStore);
          
          // Add post
          const postRequest = postsStore.add(post);
          
          postRequest.onsuccess = () => {
            // Update tag counts
            if (post.tags && post.tags.length > 0) {
              for (const tag of post.tags) {
                const tagRequest = tagsStore.get(tag);
                
                tagRequest.onsuccess = () => {
                  const tagData = tagRequest.result || { name: tag, count: 0 };
                  tagData.count++;
                  tagsStore.put(tagData);
                };
              }
            }
            
            // Queue for sync with Supabase if online and authenticated
            if (sync && this.isOnline && this.currentUser) {
              this.syncQueue.push({ action: 'add', data: { ...post, user_id: this.currentUser.id } });
              this.syncWithSupabase();
            }
            
            resolve(post);
          };
          
          postRequest.onerror = (event) => {
            reject(event.target.error);
          };
        });
      } else {
        // Use localStorage
        const data = JSON.parse(localStorage.getItem(CONFIG.storage.fallbackKey));
        
        // Check for duplicate URL
        const existingIndex = data.posts.findIndex(p => p.url === post.url);
        if (existingIndex >= 0) {
          throw new Error('Post with this URL already exists');
        }
        
        data.posts.push(post);
        
        // Update tag counts
        if (post.tags && post.tags.length > 0) {
          for (const tag of post.tags) {
            const tagIndex = data.tags.findIndex(t => t.name === tag);
            
            if (tagIndex >= 0) {
              data.tags[tagIndex].count++;
            } else {
              data.tags.push({ name: tag, count: 1 });
            }
          }
        }
        
        localStorage.setItem(CONFIG.storage.fallbackKey, JSON.stringify(data));
        
        // Queue for sync with Supabase if online and authenticated
        if (sync && this.isOnline && this.currentUser) {
          this.syncQueue.push({ action: 'add', data: { ...post, user_id: this.currentUser.id } });
          this.syncWithSupabase();
        }
        
        return post;
      }
    } catch (error) {
      console.error('Error adding post:', error);
      throw error;
    }
  }

  /**
   * Get all posts from the database
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of posts
   */
  async getAllPosts(options = {}) {
    if (!this.isInitialized) {
      return new Promise((resolve) => {
        this.pendingOperations.push(() => {
          this.getAllPosts(options).then(resolve);
        });
      });
    }
    
    const { limit, offset, sortBy, sortOrder, filterTags, searchTerm, platform } = options;
    
    try {
      if (this.isIndexedDBSupported) {
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction(CONFIG.storage.postsStore, 'readonly');
          const store = transaction.objectStore(CONFIG.storage.postsStore);
          
          // Use appropriate index based on sort
          let request;
          if (sortBy === 'platform') {
            request = store.index('platform').getAll();
          } else {
            request = store.index('dateAdded').getAll();
          }
          
          request.onsuccess = () => {
            let posts = request.result;
            
            // Apply filters
            if (filterTags && filterTags.length > 0) {
              posts = posts.filter(post => {
                return filterTags.every(tag => post.tags && post.tags.includes(tag));
              });
            }
            
            if (platform) {
              posts = posts.filter(post => post.platform === platform);
            }
            
            if (searchTerm) {
              const term = searchTerm.toLowerCase();
              posts = posts.filter(post => {
                return post.url.toLowerCase().includes(term) || 
                       (post.title && post.title.toLowerCase().includes(term)) || 
                       (post.description && post.description.toLowerCase().includes(term)) ||
                       (post.tags && post.tags.some(tag => tag.toLowerCase().includes(term)));
              });
            }
            
            // Sort posts
            posts.sort((a, b) => {
              if (sortBy === 'platform') {
                return a.platform.localeCompare(b.platform) * (sortOrder === 'asc' ? 1 : -1);
              } else {
                return (new Date(a.dateAdded) - new Date(b.dateAdded)) * (sortOrder === 'asc' ? 1 : -1);
              }
            });
            
            // Apply pagination
            if (limit) {
              const start = offset || 0;
              posts = posts.slice(start, start + limit);
            }
            
            resolve(posts);
          };
          
          request.onerror = (event) => {
            reject(event.target.error);
          };
        });
      } else {
        // Use localStorage
        const data = JSON.parse(localStorage.getItem(CONFIG.storage.fallbackKey));
        let posts = data.posts;
        
        // Apply filters
        if (filterTags && filterTags.length > 0) {
          posts = posts.filter(post => {
            return filterTags.every(tag => post.tags && post.tags.includes(tag));
          });
        }
        
        if (platform) {
          posts = posts.filter(post => post.platform === platform);
        }
        
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          posts = posts.filter(post => {
            return post.url.toLowerCase().includes(term) || 
                   (post.title && post.title.toLowerCase().includes(term)) || 
                   (post.description && post.description.toLowerCase().includes(term)) ||
                   (post.tags && post.tags.some(tag => tag.toLowerCase().includes(term)));
          });
        }
        
        // Sort posts
        posts.sort((a, b) => {
          if (sortBy === 'platform') {
            return a.platform.localeCompare(b.platform) * (sortOrder === 'asc' ? 1 : -1);
          } else {
            return (new Date(a.dateAdded) - new Date(b.dateAdded)) * (sortOrder === 'asc' ? 1 : -1);
          }
        });
        
        // Apply pagination
        if (limit) {
          const start = offset || 0;
          posts = posts.slice(start, start + limit);
        }
        
        return posts;
      }
    } catch (error) {
      console.error('Error getting posts:', error);
      return [];
    }
  }

  /**
   * Get a post by ID
   * @param {string} id - The post ID
   * @returns {Promise<Object>} The post
   */
  async getPostById(id) {
    if (!this.isInitialized) {
      return new Promise((resolve) => {
        this.pendingOperations.push(() => {
          this.getPostById(id).then(resolve);
        });
      });
    }
    
    try {
      if (this.isIndexedDBSupported) {
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction(CONFIG.storage.postsStore, 'readonly');
          const store = transaction.objectStore(CONFIG.storage.postsStore);
          const request = store.get(id);
          
          request.onsuccess = () => {
            resolve(request.result);
          };
          
          request.onerror = (event) => {
            reject(event.target.error);
          };
        });
      } else {
        // Use localStorage
        const data = JSON.parse(localStorage.getItem(CONFIG.storage.fallbackKey));
        return data.posts.find(post => post.id === id) || null;
      }
    } catch (error) {
      console.error('Error getting post by ID:', error);
      return null;
    }
  }

  /**
   * Update a post
   * @param {Object} post - The post to update
   * @param {boolean} sync - Whether to sync with Supabase
   * @returns {Promise<Object>} The updated post
   */
  async updatePost(post, sync = true) {
    if (!this.isInitialized) {
      return new Promise((resolve) => {
        this.pendingOperations.push(() => {
          this.updatePost(post, sync).then(resolve);
        });
      });
    }
    
    // Set updated timestamp
    post.updatedAt = new Date().toISOString();
    
    try {
      // Get existing post to compare tags
      const existingPost = await this.getPostById(post.id);
      
      if (!existingPost) {
        throw new Error('Post not found');
      }
      
      const oldTags = existingPost.tags || [];
      const newTags = post.tags || [];
      
      // Find tags to add and remove
      const tagsToAdd = newTags.filter(tag => !oldTags.includes(tag));
      const tagsToRemove = oldTags.filter(tag => !newTags.includes(tag));
      
      if (this.isIndexedDBSupported) {
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction([CONFIG.storage.postsStore, CONFIG.storage.tagsStore], 'readwrite');
          const postsStore = transaction.objectStore(CONFIG.storage.postsStore);
          const tagsStore = transaction.objectStore(CONFIG.storage.tagsStore);
          
          // Update post
          const postRequest = postsStore.put(post);
          
          postRequest.onsuccess = () => {
            // Update tag counts
            // Increment count for new tags
            for (const tag of tagsToAdd) {
              const tagRequest = tagsStore.get(tag);
              
              tagRequest.onsuccess = () => {
                const tagData = tagRequest.result || { name: tag, count: 0 };
                tagData.count++;
                tagsStore.put(tagData);
              };
            }
            
            // Decrement count for removed tags
            for (const tag of tagsToRemove) {
              const tagRequest = tagsStore.get(tag);
              
              tagRequest.onsuccess = () => {
                if (tagRequest.result) {
                  const tagData = tagRequest.result;
                  tagData.count = Math.max(0, tagData.count - 1);
                  
                  if (tagData.count === 0) {
                    tagsStore.delete(tag);
                  } else {
                    tagsStore.put(tagData);
                  }
                }
              };
            }
            
            // Queue for sync with Supabase if online and authenticated
            if (sync && this.isOnline && this.currentUser) {
              this.syncQueue.push({ action: 'update', data: { ...post, user_id: this.currentUser.id } });
              this.syncWithSupabase();
            }
            
            resolve(post);
          };
          
          postRequest.onerror = (event) => {
            reject(event.target.error);
          };
        });
      } else {
        // Use localStorage
        const data = JSON.parse(localStorage.getItem(CONFIG.storage.fallbackKey));
        const index = data.posts.findIndex(p => p.id === post.id);
        
        if (index === -1) {
          throw new Error('Post not found');
        }
        
        data.posts[index] = post;
        
        // Update tag counts
        // Increment count for new tags
        for (const tag of tagsToAdd) {
          const tagIndex = data.tags.findIndex(t => t.name === tag);
          
          if (tagIndex >= 0) {
            data.tags[tagIndex].count++;
          } else {
            data.tags.push({ name: tag, count: 1 });
          }
        }
        
        // Decrement count for removed tags
        for (const tag of tagsToRemove) {
          const tagIndex = data.tags.findIndex(t => t.name === tag);
          
          if (tagIndex >= 0) {
            data.tags[tagIndex].count = Math.max(0, data.tags[tagIndex].count - 1);
            
            if (data.tags[tagIndex].count === 0) {
              data.tags.splice(tagIndex, 1);
            }
          }
        }
        
        localStorage.setItem(CONFIG.storage.fallbackKey, JSON.stringify(data));
        
        // Queue for sync with Supabase if online and authenticated
        if (sync && this.isOnline && this.currentUser) {
          this.syncQueue.push({ action: 'update', data: { ...post, user_id: this.currentUser.id } });
          this.syncWithSupabase();
        }
        
        return post;
      }
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }

  /**
   * Delete a post
   * @param {string} id - The post ID
   * @param {boolean} sync - Whether to sync with Supabase
   * @returns {Promise<boolean>} Success status
   */
  async deletePost(id, sync = true) {
    if (!this.isInitialized) {
      return new Promise((resolve) => {
        this.pendingOperations.push(() => {
          this.deletePost(id, sync).then(resolve);
        });
      });
    }
    
    try {
      // Get post to update tag counts
      const post = await this.getPostById(id);
      
      if (!post) {
        throw new Error('Post not found');
      }
      
      const tags = post.tags || [];
      
      if (this.isIndexedDBSupported) {
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction([CONFIG.storage.postsStore, CONFIG.storage.tagsStore], 'readwrite');
          const postsStore = transaction.objectStore(CONFIG.storage.postsStore);
          const tagsStore = transaction.objectStore(CONFIG.storage.tagsStore);
          
          // Delete post
          const request = postsStore.delete(id);
          
          request.onsuccess = () => {
            // Update tag counts
            for (const tag of tags) {
              const tagRequest = tagsStore.get(tag);
              
              tagRequest.onsuccess = () => {
                if (tagRequest.result) {
                  const tagData = tagRequest.result;
                  tagData.count = Math.max(0, tagData.count - 1);
                  
                  if (tagData.count === 0) {
                    tagsStore.delete(tag);
                  } else {
                    tagsStore.put(tagData);
                  }
                }
              };
            }
            
            // Queue for sync with Supabase if online and authenticated
            if (sync && this.isOnline && this.currentUser) {
              this.syncQueue.push({ action: 'delete', data: { id, user_id: this.currentUser.id } });
              this.syncWithSupabase();
            }
            
            resolve(true);
          };
          
          request.onerror = (event) => {
            reject(event.target.error);
          };
        });
      } else {
        // Use localStorage
        const data = JSON.parse(localStorage.getItem(CONFIG.storage.fallbackKey));
        const index = data.posts.findIndex(p => p.id === id);
        
        if (index === -1) {
          throw new Error('Post not found');
        }
        
        data.posts.splice(index, 1);
        
        // Update tag counts
        for (const tag of tags) {
          const tagIndex = data.tags.findIndex(t => t.name === tag);
          
          if (tagIndex >= 0) {
            data.tags[tagIndex].count = Math.max(0, data.tags[tagIndex].count - 1);
            
            if (data.tags[tagIndex].count === 0) {
              data.tags.splice(tagIndex, 1);
            }
          }
        }
        
        localStorage.setItem(CONFIG.storage.fallbackKey, JSON.stringify(data));
        
        // Queue for sync with Supabase if online and authenticated
        if (sync && this.isOnline && this.currentUser) {
          this.syncQueue.push({ action: 'delete', data: { id, user_id: this.currentUser.id } });
          this.syncWithSupabase();
        }
        
        return true;
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      return false;
    }
  }

  /**
   * Get all tags with their counts
   * @returns {Promise<Array>} Array of tags
   */
  async getAllTags() {
    if (!this.isInitialized) {
      return new Promise((resolve) => {
        this.pendingOperations.push(() => {
          this.getAllTags().then(resolve);
        });
      });
    }
    
    try {
      if (this.isIndexedDBSupported) {
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction(CONFIG.storage.tagsStore, 'readonly');
          const store = transaction.objectStore(CONFIG.storage.tagsStore);
          const request = store.getAll();
          
          request.onsuccess = () => {
            resolve(request.result);
          };
          
          request.onerror = (event) => {
            reject(event.target.error);
          };
        });
      } else {
        // Use localStorage
        const data = JSON.parse(localStorage.getItem(CONFIG.storage.fallbackKey));
        return data.tags;
      }
    } catch (error) {
      console.error('Error getting tags:', error);
      return [];
    }
  }

  /**
   * Set a setting value
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   * @returns {Promise<boolean>} Success status
   */
  async setSetting(key, value) {
    if (!this.isInitialized) {
      return new Promise((resolve) => {
        this.pendingOperations.push(() => {
          this.setSetting(key, value).then(resolve);
        });
      });
    }
    
    try {
      if (this.isIndexedDBSupported) {
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction(CONFIG.storage.settingsStore, 'readwrite');
          const store = transaction.objectStore(CONFIG.storage.settingsStore);
          const request = store.put({ key, value });
          
          request.onsuccess = () => {
            resolve(true);
          };
          
          request.onerror = (event) => {
            reject(event.target.error);
          };
        });
      } else {
        // Use localStorage
        const data = JSON.parse(localStorage.getItem(CONFIG.storage.fallbackKey));
        
        if (!data.settings) {
          data.settings = {};
        }
        
        data.settings[key] = value;
        localStorage.setItem(CONFIG.storage.fallbackKey, JSON.stringify(data));
        
        return true;
      }
    } catch (error) {
      console.error('Error setting setting:', error);
      return false;
    }
  }

  /**
   * Get a setting value
   * @param {string} key - Setting key
   * @param {*} defaultValue - Default value if setting not found
   * @returns {Promise<*>} Setting value
   */
  async getSetting(key, defaultValue = null) {
    if (!this.isInitialized) {
      return new Promise((resolve) => {
        this.pendingOperations.push(() => {
          this.getSetting(key, defaultValue).then(resolve);
        });
      });
    }
    
    try {
      if (this.isIndexedDBSupported) {
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction(CONFIG.storage.settingsStore, 'readonly');
          const store = transaction.objectStore(CONFIG.storage.settingsStore);
          const request = store.get(key);
          
          request.onsuccess = () => {
            resolve(request.result ? request.result.value : defaultValue);
          };
          
          request.onerror = (event) => {
            reject(event.target.error);
          };
        });
      } else {
        // Use localStorage
        const data = JSON.parse(localStorage.getItem(CONFIG.storage.fallbackKey));
        return (data.settings && data.settings[key] !== undefined) ? data.settings[key] : defaultValue;
      }
    } catch (error) {
      console.error('Error getting setting:', error);
      return defaultValue;
    }
  }
}

// Create and export a singleton instance
const db = new BoardieDB();
