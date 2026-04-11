# --- Build Stage ---
FROM node:25-slim AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# --- Runtime Stage ---
FROM node:25-slim

WORKDIR /app

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Install tsx globally or as a dependency to run the server
RUN npm install -g tsx

# Copy the build artifacts and server code
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/public ./public
COPY --from=build /app/src ./src

# Expose port
EXPOSE 8080

# Start the server
CMD ["tsx", "server/index.ts"]
