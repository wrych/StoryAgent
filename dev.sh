#!/bin/bash

# Colors for output
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Function to handle cleanup on exit
cleanup() {
    echo -e "\n${NC}Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Trap SIGINT (Ctrl+C)
trap cleanup SIGINT

echo -e "${NC}Starting StoryAgent development servers..."

# Start Backend
echo -e "${BLUE}backend  | ${NC}Starting FastAPI server..."
cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000 2>&1 | sed "s/^/$(echo -e "${BLUE}backend  | ${NC}")/" &
BACKEND_PID=$!

# Start Frontend
echo -e "${MAGENTA}frontend | ${NC}Starting Vite server..."
cd frontend && npm run dev -- --port 5173 2>&1 | sed "s/^/$(echo -e "${MAGENTA}frontend | ${NC}")/" &
FRONTEND_PID=$!

# Wait for background processes
wait
