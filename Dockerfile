# Use Node.js 18 LTS as base image
FROM node:18-alpine AS base

# Install system dependencies needed for Puppeteer, Prisma, and netcat for health checks
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    netcat-openbsd \
    && rm -rf /var/cache/apk/*

# Tell Puppeteer to skip installing Chromium. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
FROM base AS dependencies
RUN npm ci --only=production && npm cache clean --force

# Install all dependencies (including dev) for building
FROM base AS build-deps
RUN npm ci

# Build stage
FROM build-deps AS build
COPY . .
RUN npm run build

# Production stage
FROM base AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S headlinehub -u 1001

# Copy production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package*.json ./
COPY --from=build /app/docker-entrypoint.sh ./

# Make entrypoint script executable
RUN chmod +x docker-entrypoint.sh

# Generate Prisma client
RUN npx prisma generate

# Create logs directory and set permissions
RUN mkdir -p logs && \
    chown -R headlinehub:nodejs /app

# Switch to non-root user
USER headlinehub

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Set entrypoint and default command
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
