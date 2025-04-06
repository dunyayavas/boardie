# Boardie - Social Media Embed Viewer

A powerful Progressive Web App (PWA) for collecting, organizing, and viewing social media posts from various platforms in one place. The app features a responsive masonry grid layout, advanced tag management, user authentication via Supabase, and support for multiple social media platforms.

## 🌟 Features

- **Multi-Platform Support**: Embed and view posts from Twitter/X, Instagram, YouTube, LinkedIn, and general websites
- **Masonry Grid Layout**: Responsive grid layout that adapts to different screen sizes
- **Tag Management System**: Add, edit, and filter posts by tags
- **Persistent Storage**: IndexedDB with localStorage fallback and Supabase cloud sync
- **User Authentication**: Secure login/signup via Supabase
- **PWA Features**: Offline capabilities, installable on mobile devices, Share Target API

## 🚀 Getting Started

### Using the App

1. Visit the [Boardie App](https://yourusername.github.io/boardie/)
2. Create an account or log in
3. Start adding your favorite social media posts
4. Organize them with tags
5. Install the app on your device for the best experience

### Development

To run the app locally:

1. Clone this repository
2. Open `index.html` in your browser
3. For full functionality, set up a Supabase project and update the configuration in `js/config.js`

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript with modular architecture
- **CSS Framework**: Tailwind CSS
- **Backend & Storage**: Supabase (Auth, PostgreSQL, Storage)
- **PWA Features**: Service Worker, Web App Manifest, Share Target API

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Supabase](https://supabase.com) for authentication and database services
- [Twitter](https://developer.twitter.com) for the Twitter Widget JS
- [Instagram](https://developers.facebook.com) for the Instagram Embed API
- [YouTube](https://developers.google.com/youtube) for the YouTube iFrame API
- [Tailwind CSS](https://tailwindcss.com) for the UI design
