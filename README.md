# Hack404 - Bias Detection Project

A comprehensive bias/hate speech detection application with multiple frontend implementations.

## Project Structure

```
Hack404/
├── frontend/
│   ├── react-app/              # Main React/Next.js web application
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── lib/           # Utility functions and API
│   │   │   └── types/         # TypeScript type definitions
│   │   ├── app/               # Next.js app router
│   │   ├── public/            # Static assets
│   │   ├── package.json       # Frontend dependencies
│   │   └── ...config files    # TypeScript, ESLint, Next.js config
│   └── chrome_extension/       # Browser extension implementation
├── backend/                    # Backend API (if applicable)
├── .taskmaster/               # Task management system
├── .cursor/                   # Cursor IDE configuration
└── README.md                  # This file
```

## Frontend Applications

### React Web App (`frontend/react-app/`)

A Next.js 14+ web application for bias detection with:
- Text input with validation and character limits
- Real-time bias detection analysis
- Word highlighting and replacement suggestions
- Responsive design with TailwindCSS
- TypeScript for type safety

**Key Components:**
- `TextInput.tsx` - Advanced text input with validation and confirmation dialogs
- `BiasDetectionApp.tsx` - Main application component
- `Header.tsx` - Application header

**To run:**
```bash
cd frontend/react-app
npm install
npm run dev
```

### Chrome Extension (`frontend/chrome_extension/`)

Browser extension for bias detection in web forms and text areas.

## Development

### Getting Started
1. Clone the repository
2. Navigate to the desired frontend application
3. Install dependencies with `npm install`
4. Start development server with `npm run dev`

### Task Management
This project uses TaskMaster for task tracking. See `.taskmaster/` for current tasks and progress.

## Technologies Used

- **Frontend Web App**: Next.js 14+, React, TypeScript, TailwindCSS
- **Task Management**: TaskMaster AI
- **Development Tools**: ESLint, PostCSS

## Current Status

- ✅ Project structure organized
- ✅ Next.js application initialized
- ✅ Basic layout and header components
- ✅ Advanced text input component with validation
- ✅ Clear/reset functionality with confirmation dialog
- 🔄 Currently implementing accessibility features

See `.taskmaster/tasks/tasks.json` for detailed task progress. 