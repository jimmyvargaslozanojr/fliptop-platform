# FlipTop Community Platform

A community platform for FlipTop Battle League, featuring emcees, battle videos, and view statistics.

## Features

- **Emcees Directory** - Browse all 178 FlipTop emcees with profiles
- **Battle Videos** - Explore 1,830+ battle videos with views, likes, comments
- **View Statistics** - Analyze most viewed content by year, division, or emcee
- **Search & Filter** - Find emcees and videos easily

## Tech Stack

- **Backend**: Python API (serves SQLite databases)
- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Databases**: SQLite (fliptop.db, youtube_videos.db)

## Running the Application

### 1. Start the API Server (port 8080)

```bash
cd fliptop-platform/api
python3 server.py
```

### 2. Start the Frontend Server (port 8000)

```bash
cd fliptop-platform
python3 -m http.server 8000
```

### 3. Open in Browser

Navigate to: http://localhost:8000

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/emcees` | List all emcees |
| `/api/emcees/{id}` | Get emcee details |
| `/api/videos` | List videos (supports search, sort) |
| `/api/videos/emcee/{name}` | Get videos for specific emcee |
| `/api/stats` | General platform stats |
| `/api/stats/by-year` | Most viewed by year |
| `/api/stats/by-division` | Most viewed by division |
| `/api/stats/by-emcee` | Most viewed by emcee (rankings) |
| `/api/divisions` | List all divisions |

## Database Schema

### fliptop.db - emcees table
- id, name, profile_picture, title, hometown, reppin, division, year_joined, accomplishments, description, social links

### youtube_videos.db - videos table
- id, videoId, title, publishedAt, thumbnail, views, likes, comments, url

## Project Structure

```
fliptop-platform/
├── api/
│   └── server.py          # Python API server
├── css/
│   └── styles.css         # Styling
├── js/
│   └── app.js             # Frontend JavaScript
├── index.html             # Main HTML file
└── README.md              # This file
```
