# ── Stage 1: Build React client ─────────────────────────────────────
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Copy package files first for better layer caching
COPY client/package.json client/package-lock.json* ./

# Install all deps (including devDeps needed for Vite build)
RUN npm install --legacy-peer-deps

# Copy full client source
COPY client/ ./

# ─────────────────────────────────────────────────────────────────────
# CRITICAL for Aletcloud: Hardcode VITE_API_URL=/api at build time.
# This ensures the frontend always talks to /api on the same host,
# regardless of whether a .env file is present or not.
# The Express server (server.js) serves both the frontend and /api
# from the same container on Aletcloud — so /api will always work.
# ─────────────────────────────────────────────────────────────────────
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: Production server ────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install production server dependencies only
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --omit=dev --legacy-peer-deps

# Copy server source code
COPY server/ ./server/

# Copy the built React app from stage 1
# server.js serves this from path.join(__dirname, '../client/dist')
COPY --from=client-builder /app/client/dist ./client/dist

# Runtime environment — credentials injected by Aletcloud dashboard
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Health check so Aletcloud marks the container as healthy
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "server/server.js"]
