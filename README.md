# Quotation Desktop

A desktop application for managing quotations, built with Electron, React, and TypeScript.

## Features

- Create, edit, view, and delete quotations
- PDF export for quotations
- Excel export for quotation lists
- Local JSON file storage (no database required)
- Import data from the web app's Supabase database
- Dark/Light mode support

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# For Electron development (opens the desktop app)
npm run electron:dev
```

### Building for Production

```bash
# Build the app
npm run build

# This will create:
# - dist/ folder with the web build
# - dist-electron/ folder with the Electron build
# - release/ folder with the packaged installer
```

## Importing Data from Web App

If you have data in the existing Supabase-powered web app, you can export and import it:

### Option 1: Using the Export Script

1. Navigate to the `scripts` folder
2. Run the export script:
   ```bash
   node scripts/export-supabase.js
   ```
3. This creates a JSON file with all your data
4. Open Quotation Desktop, go to Settings > Data
5. Click "Import Data" and select the exported file

### Option 2: Manual Export from Supabase

1. Log into your Supabase dashboard
2. Export each table as JSON
3. Combine them into a single file matching the expected format
4. Import via Settings > Data in the desktop app

## Data Storage

All data is stored locally in JSON files at:

- **Windows**: `%APPDATA%/quotation-desktop/data/`
- **macOS**: `~/Library/Application Support/quotation-desktop/data/`
- **Linux**: `~/.config/quotation-desktop/data/`

Data files:
- `quotations.json`
- `quotation_items.json`
- `vendors.json`
- `recipients.json`
- `categories.json`
- `item_types.json`
- `exchange_rates.json`
- `settings.json`

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Desktop**: Electron
- **Build Tool**: Vite
- **State Management**: TanStack Query (React Query)

## Development

```bash
# Run web version only
npm run dev

# Run with Electron
npm run electron:dev
```

## License

MIT


