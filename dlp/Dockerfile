# Build context is the project root (dlp/), so this can copy both backend and frontend.
FROM node:20-alpine

WORKDIR /app

# Install backend dependencies first (better Docker layer caching)
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Copy the rest of the project
COPY backend ./backend
COPY frontend ./frontend

WORKDIR /app/backend

EXPOSE 5000

CMD ["node", "server.js"]
