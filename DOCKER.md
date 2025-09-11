# Docker Setup for HeadlineHub API

This document explains how to run the HeadlineHub API using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

## Quick Start

### Development Environment

1. **Clone the repository and navigate to the project directory**
2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the development environment**
   ```bash
   npm run docker:dev
   ```

   This will:
   - Build the API container
   - Start PostgreSQL database
   - Start Redis (optional)
   - Run database migrations
   - Start the API on port 3000

4. **Stop the development environment**
   ```bash
   npm run docker:dev:down
   ```

### Production Environment

1. **Create production environment file**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with your production configuration
   ```

2. **Deploy to production**
   ```bash
   npm run docker:prod
   ```

3. **Stop production environment**
   ```bash
   npm run docker:prod:down
   ```

## Available Docker Commands

| Command | Description |
|---------|-------------|
| `npm run docker:build` | Build the Docker image |
| `npm run docker:run` | Run the container with local .env file |
| `npm run docker:dev` | Start development environment with compose |
| `npm run docker:dev:down` | Stop development environment |
| `npm run docker:prod` | Start production environment |
| `npm run docker:prod:down` | Stop production environment |
| `npm run docker:logs` | View API logs |
| `npm run docker:shell` | Access container shell |

## Environment Variables

### Required Variables

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://username:password@db:5432/headlinehub-db
```

### Database Configuration

```env
PG_HOST=db
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your_secure_password
PG_DATABASE=headlinehub-db
```

### Optional Configuration

```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Scraper Settings
SCRAPER_DELAY_MS=1000
SCRAPER_ARTICLE_CONCURRENCY=5
SCRAPER_SOURCE_CONCURRENCY=5

# Logging
LOG_LEVEL=info

# External APIs (if used)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
GOOGLE_AI_API_KEY=your_google_ai_key
ELEVENLABS_API_KEY=your_elevenlabs_key
```

## Container Architecture

### Multi-stage Build

The Dockerfile uses a multi-stage build process:

1. **Base Stage**: Sets up Node.js and system dependencies
2. **Dependencies Stage**: Installs production dependencies
3. **Build Stage**: Installs all dependencies and builds the application
4. **Production Stage**: Creates the final optimized image

### Security Features

- Runs as non-root user (`headlinehub`)
- Minimal Alpine Linux base image
- Only production dependencies in final image
- Health checks configured

### Services

#### API Container
- **Image**: Custom built from Dockerfile
- **Port**: 3000
- **Health Check**: HTTP check on `/api/health`
- **Restart Policy**: Unless stopped

#### PostgreSQL Database
- **Image**: postgres:15-alpine
- **Port**: 5432
- **Health Check**: pg_isready
- **Persistent Storage**: Named volume

#### Redis (Optional)
- **Image**: redis:7-alpine
- **Port**: 6379
- **Persistent Storage**: Named volume

## Troubleshooting

### Container Won't Start

1. **Check logs**
   ```bash
   npm run docker:logs
   ```

2. **Verify environment variables**
   ```bash
   docker-compose config
   ```

3. **Check database connection**
   ```bash
   docker-compose exec db pg_isready -U postgres
   ```

### Database Issues

1. **Reset database**
   ```bash
   npm run docker:dev:down
   docker volume rm gm-scraper_postgres_data
   npm run docker:dev
   ```

2. **Run migrations manually**
   ```bash
   docker-compose exec app npx prisma migrate deploy
   ```

### Performance Issues

1. **Monitor resource usage**
   ```bash
   docker stats
   ```

2. **Adjust resource limits in docker-compose.prod.yml**

### Port Conflicts

If port 3000 is already in use, modify the port mapping in docker-compose.yml:

```yaml
ports:
  - "8080:3000"  # Use port 8080 instead
```

## Monitoring

### Health Checks

The API includes built-in health checks:
- Container health check every 30 seconds
- Database connectivity verification
- Service status reporting

### Logs

View real-time logs:
```bash
npm run docker:logs
```

Logs are also persisted to the `./logs` directory on the host.

## Scaling

For production scaling, you can:

1. **Increase replicas in docker-compose.prod.yml**
2. **Use Docker Swarm for orchestration**
3. **Deploy to Kubernetes with provided manifests**

## Security Considerations

1. **Use strong passwords** for database
2. **Keep images updated** regularly
3. **Use secrets management** for sensitive data
4. **Configure firewall rules** appropriately
5. **Monitor logs** for suspicious activity
