# Social Media Embed Viewer

A powerful web application for collecting, organizing, and viewing social media posts from various platforms in one place. The app features a responsive masonry grid layout, advanced tag management, user authentication via Supabase, and support for multiple social media platforms.

## 🌟 Features

### Core Functionality

- **Multi-Platform Support**: Embed and view posts from:
  - Twitter/X (supports both twitter.com and x.com domains)
  - Instagram (posts and reels)
  - YouTube (videos with responsive player)
  - LinkedIn (preview cards with direct links)
  - General websites with rich previews (thumbnails, titles, descriptions)

- **Masonry Grid Layout**: Responsive grid layout that adapts to different screen sizes and displays posts in an aesthetically pleasing arrangement.

- **Tag Management System**:
  - Add multiple tags to each post
  - Inline tag editing with immediate UI updates
  - Filter posts by tags with intuitive filtering system
  - Tag-based organization and search
  - Add/remove tags from existing posts

- **Persistent Storage**:
  - Primary: IndexedDB for offline-capable storage
  - Fallback: localStorage for browsers without IndexedDB support
  - Cloud sync with Supabase for cross-device access

- **User Authentication**:
  - Secure login/signup via Supabase
  - User-specific content libraries
  - Profile management

### User Experience

- **Infinite Scrolling**: Smooth pagination with lazy loading for 1000+ links without performance degradation.

- **Responsive Design**: Fully responsive interface that works on mobile, tablet, and desktop devices.

- **Animations**: Smooth transitions and loading animations for a polished user experience.

- **Drag and Drop**: Reorder posts by dragging and dropping them into different positions.

### Content Management

- **Import/Export**: 
  - Export your collection as JSON
  - Import from JSON backup

- **Search Functionality**:
  - Full-text search across all posts
  - Search by tags, content, or platform

- **Sorting Options**:
  - Sort by date added
  - Sort by platform

### Platform-Specific Features

#### Twitter/X
- Automatic embedding of tweets with full interactivity
- Support for both twitter.com and x.com URLs
- Thread visualization

#### Instagram
- Embedded Instagram posts with images and videos
- Support for Instagram Reels
- Caption display

#### YouTube
- Embedded video player with playback controls
- Video thumbnail previews
- Support for timestamps in URLs

#### LinkedIn
- Preview cards for LinkedIn posts
- Direct links to original content

#### Website Embeds
- Rich previews showing meta images
- Title and description extraction
- Favicon display

### Technical Features

- **Performance Optimizations**:
  - Lazy loading of embeds
  - Optimized DOM operations for large collections
  - Debounced rendering to prevent performance issues
  - Memory-optimized event handling to prevent leaks

- **Debugging Tools**:
  - Debug console for troubleshooting
  - Detailed logging
  - Error tracking

## 🛠️ Planned Technology Stack

### Frontend
- **Core**: Vanilla JavaScript with modular architecture
- **CSS Framework**: Tailwind CSS for responsive design and consistent styling
- **Layout**: CSS Grid and Flexbox for masonry layout
- **PWA Features**:
  - Service Worker for offline capabilities
  - Web App Manifest for installability
  - Push notifications for engagement
  - Home screen installation on mobile devices
  - Share Target API for receiving shared links from other apps

### Backend & Storage
- **Authentication**: Supabase Auth with social login options
- **Database**: Supabase PostgreSQL for cloud storage
- **Local Storage**: IndexedDB for offline capability with localStorage fallback
- **File Storage**: Supabase Storage for user uploads and media caching

### Embedding & Integration
- **Social Media APIs**:
  - Twitter Widget JS
  - Instagram Embed API
  - YouTube iFrame API
  - LinkedIn oEmbed (when available) or custom preview
- **Metadata Extraction**: Open Graph and Twitter Card protocols
- **Web Share API**: For sharing content from the app
- **Web Share Target API**: For receiving shared links from mobile devices

### Mobile Experience
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Touch Interactions**: Swipe gestures and touch-friendly controls
- **Add to Home Screen**: Custom installation flow with guidance
- **Share Integration**: Register as a share target for social media apps
- **Offline Support**: Full functionality when offline with sync when online

### Development & Deployment
- **Build Tools**: Vite or Parcel for modern bundling
- **Version Control**: Git with GitHub
- **CI/CD**: GitHub Actions for automated testing and deployment
- **Hosting**: GitHub Pages with custom domain support
- **PWA Auditing**: Lighthouse for performance and PWA compliance

## 📝 Planned Features

- **Enhanced Analytics**: Track views and engagement with your shared posts
- **Collaboration**: Share collections with other users
- **Custom Themes**: Create and apply custom color schemes
- **Automated Tagging**: AI-powered tag suggestions based on post content
- **Browser Extension**: Quickly add posts from any webpage
- **Mobile App**: Native mobile experience using web technologies

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Supabase](https://supabase.com) for authentication and database services
- [Twitter](https://developer.twitter.com) for the Twitter Widget JS
- [Instagram](https://developers.facebook.com) for the Instagram Embed API
- [YouTube](https://developers.google.com/youtube) for the YouTube iFrame API
- [Tailwind CSS](https://tailwindcss.com) for the upcoming UI redesign
