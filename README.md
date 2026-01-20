# Story Writing Agent

A modern story writing assistant designed to help authors manage multiple stories, distinct story bibles, and chapter drafts with version control and persistence.

## Project Purpose

The goal of this project is to create a robust, local-first story writing environment that bridges the gap between traditional writing software and AI-assisted creativity. It is architected to eventually support AI generation of story elements and chapters via local LLMs (like LMStudio) or OpenAI-compatible APIs.

## Features

-   **Multi-Story Support**: Create and switch between multiple independent stories.
-   **Story Bible**: Manage characters, locations, timelines, and narrative arcs with customizable fields.
-   **Chapter Management**: Write and organize chapters with support for reordering.
-   **Version Control**: granular history tracking for both chapters and story bible elements, allowing you to view and revert to previous versions.
-   **Soft Delete**: "Recycle bin" functionality prevents accidental data loss.
-   **Local Persistence**: All data is stored locally in a SQLite database.
-   **Dark Mode**: A modern, dark-themed UI optimized for writing.
-   **Cross-Referencing**: Refer to bible elements within your text (e.g., `[[Character:Name]]`) for quick context.

## Technology Stack

### Backend
-   **Language**: Python 3.x
-   **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
-   **Database**: SQLite (via [SQLModel](https://sqlmodel.tiangolo.com/))
-   **Key Libraries**: `uvicorn` (server), `pydantic` (validation)
-   **Architecture**: RESTful API with distinct layers for Models, CRUD operations, and Route handlers.

### Frontend
-   **Framework**: [React](https://react.dev/) (Vite)
-   **Styling**: Vanilla CSS (Modern CSS3 variables for theming)
-   **HTTP Client**: Native `fetch` / Async logic
-   **Architecture**: Component-based React application (currently centralized in `App.jsx` for rapid prototyping, with specialized components like `SlashEditor`).

## Architecture Overview

The application follows a standard Client-Server architecture:

1.  **Frontend (Client)**: A React SPA (Single Page Application) that communicates with the backend via JSON REST APIs. It handles the UI state, routing (view switching), and interactions.
2.  **Backend (Server)**: A FastAPI application serving at `http://localhost:8000`. It manages business logic, data validation, and database interactions.
3.  **Database**: A local `story_agent.db` SQLite file generated automatically by the backend.

### Data Models
-   **Story**: The root container.
-   **BibleElement**: Entities associated with a story (Characters, Locations, etc.). Contains a JSON-flexible structure for different types.
-   **Chapter**: Narrative units of a story, ordered by index.
-   **VersionHistory**: Immutable snapshots of *Chapters* or *BibleElements* taken on every save, storing the content and timestamp.
-   **GlobalSetting**: System-wide configurations (e.g., default forms/schemas for new bible elements).

## Project Structure

```
story-agent/
├── backend/                # Python FastAPI Backend
│   ├── main.py             # API Entry point & Routes
│   ├── models.py           # SQLModel Database Schemas
│   ├── crud.py             # Database Operation logic
│   ├── database.py         # DB Connection setup
│   └── story_agent.db      # Local SQLite Database (generated)
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── App.jsx         # Main UI Logic & Routing
│   │   ├── App.css         # Main Styles
│   │   └── SlashEditor.jsx # specialized editor component
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites
-   Python 3.8+
-   Node.js 16+ & npm

### Installation relative to root

1.  **Backend Setup**:
    ```bash
    cd backend
    python3 -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install fastapi "uvicorn[standard]" sqlmodel
    ```

2.  **Frontend Setup**:
    ```bash
    cd frontend
    npm install
    ```

### Running the Application

You need to run the backend and frontend in separate terminal windows.

**Terminal 1 (Backend):**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```
*API will run at http://localhost:8000*

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```
*UI will run at http://localhost:3000* (or similar port shown in terminal)

## Future Roadmap

-   **AI Integration**: Connect to local LLMs (via LMStudio) to generate character sheets, plot outlines, and draft chapters based on bible context.
-   **Advanced Export**: Export stories to standard formats (PDF, ePub, Docx).
