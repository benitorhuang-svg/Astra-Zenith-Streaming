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

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Install tsx and typescript for runtime execution
RUN npm install -g tsx typescript

# Copy the build artifacts and server code
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/public ./public
COPY --from=build /app/src ./src

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080

# Start the server using tsx
CMD ["tsx", "server/index.ts"]
