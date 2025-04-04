# ContextSmash

A web-based tool for crafting prompts with real-time feedback and symbolic file aliasing.

## Features

- File upload and symbolic aliasing
- Real-time prompt editing with live preview
- Character and token count estimation
- Session persistence

## Setup

1. Clone this repository
2. Start a local development server:
   ```bash
   # Using Python's built-in server
   python -m http.server 8000
   ```
3. Open `http://localhost:8000` in your browser

## Development

This project uses:
- HTMX for server-driven updates
- Alpine.js for reactive components
- Browser File System Access API for file handling

## License

MIT License - See LICENSE file for details 