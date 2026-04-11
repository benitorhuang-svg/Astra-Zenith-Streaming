# --- Build Stage ---
FROM node:25-slim AS build

WORKDIR /app

# Install dependencies including devDependencies for build
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build both frontend and backend
RUN npm run build

# --- Runtime Stage ---
FROM node:25-slim

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Copy the build artifacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/public ./public
COPY --from=build /app/server/core/AGENT_STATE.json ./server/core/AGENT_STATE.json
COPY --from=build /app/server/core/VECTOR_STORAGE.json ./server/core/VECTOR_STORAGE.json

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080

# Start the server using node
CMD ["npm", "run", "start:prod"]
