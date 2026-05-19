# Stage 1: Build TypeScript
FROM node:22-alpine AS builder
WORKDIR /app

# Install build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy workspace manifests first for layer caching
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci

# Compile TypeScript
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src
RUN npm run build -w backend

# Stage 2: Production image
FROM node:22-alpine
WORKDIR /app

# Runtime: hoisted node_modules + compiled dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY backend/package.json ./backend/

ENV PORT=3000

EXPOSE 3000
VOLUME ["/app/data"]

CMD ["node", "backend/dist/server.js"]
