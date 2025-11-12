# Productivity App

A unified productivity hub for tasks, calendar, journal, and exercise tracking.

## Project Structure

```
productivity-app/
├── src/
│   ├── storage/          # IndexedDB storage layer
│   ├── tasks/            # Task management
│   ├── calendar/          # Calendar integration
│   ├── journal/          # Journal system
│   ├── exercise/         # Exercise tracking
│   ├── dashboard/        # Dashboard widgets
│   ├── automation/       # Automation engine
│   ├── schedule/         # Work schedule
│   ├── ui/               # UI components
│   └── utils/            # Utility functions
└── tests/                # Test files
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Cloud Project with Calendar API enabled (for calendar sync)

### Installation

```bash
npm install
```

### Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Get your Google OAuth Client ID:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Calendar API
   - Go to "Credentials" > "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized JavaScript origins: `http://localhost:3000`
   - Add authorized redirect URIs: `http://localhost:3000` (required for redirect flow)
   - Copy the Client ID

3. Add your Client ID to `.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=your-actual-client-id-here
   ```

**Note:** The app works without Google Calendar sync configured, but calendar sync features will be unavailable.

### Development

```bash
npm run dev
```

### Testing

```bash
npm test
```

## Storage Layer

The storage layer uses IndexedDB via the `idb` library for persistent local storage.

### Usage

```javascript
import { initStorage, tasksStore } from './storage';

// Initialize storage at app startup
await initStorage();

// Create a task
const task = await tasksStore.create({
  id: crypto.randomUUID(),
  title: 'Complete project',
  status: 'pending',
  priority: 'high',
  createdAt: new Date().toISOString()
});

// Get all tasks
const allTasks = await tasksStore.getAll();

// Update a task
await tasksStore.update(taskId, { status: 'completed' });

// Query tasks
const pendingTasks = await tasksStore.getByStatus('pending');
```

## Database Migrations

Database migrations are handled automatically when the database version changes. See `src/storage/indexeddb/migrations/README.md` for details on adding new migrations.

