# Makefile for HeadlineHub API Docker operations

.PHONY: help build run dev dev-down prod prod-down logs shell clean

# Default target
help:
	@echo "Available commands:"
	@echo "  build      - Build the Docker image"
	@echo "  run        - Run single container with .env file"
	@echo "  dev        - Start development environment"
	@echo "  dev-down   - Stop development environment"
	@echo "  prod       - Start production environment"
	@echo "  prod-down  - Stop production environment"
	@echo "  logs       - View application logs"
	@echo "  shell      - Access container shell"
	@echo "  clean      - Clean up Docker resources"

# Build the Docker image
build:
	docker build -t headlinehub .

# Run single container
run:
	docker run -p 3000:3000 --env-file .env headlinehub

# Development environment
dev:
	docker-compose up --build

dev-down:
	docker-compose down

# Production environment
prod:
	docker-compose -f docker-compose.prod.yml up --build -d

prod-down:
	docker-compose -f docker-compose.prod.yml down

# Utility commands
logs:
	docker-compose logs -f app

shell:
	docker-compose exec app sh

# Clean up Docker resources
clean:
	docker-compose down -v
	docker system prune -f
	docker volume prune -f
