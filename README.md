# Webhook Proxy 🚀

An open-source webhook proxy service that allows developers to test webhooks locally. Forward webhooks from the cloud to your local development environment with ease.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)

## Features

- 🔄 **Real-time webhook forwarding** - Forward webhooks to your local development environment
- 📊 **Beautiful dashboard** - Monitor webhooks in real-time with a modern React interface
- 🔧 **CLI tool** - Manage endpoints and view logs from your terminal
- 🔐 **Secure** - API key authentication and endpoint isolation
- 🚦 **Reliable delivery** - Automatic retries with exponential backoff
- 📝 **Request/Response logging** - Full visibility into webhook payloads and responses
- 🐳 **Docker ready** - Easy deployment with Docker Compose
- ⚡ **High performance** - Built with Fastify and optimized for speed

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/ersinkoc/webhook-proxy.git
cd webhook-proxy

# Start all services
docker-compose up -d

# Access the dashboard
open http://localhost
```

### Manual Setup

#### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- pnpm 8+

#### Installation

```bash
# Clone the repository
git clone https://github.com/ersinkoc/webhook-proxy.git
cd webhook-proxy

# Install dependencies
pnpm install

# Setup environment variables
cp packages/server/.env.example packages/server/.env
# Edit .env with your configuration

# Run database migrations
pnpm db:migrate

# Seed the database (optional)
pnpm db:seed

# Start development servers
pnpm dev
```

## Using the CLI

### Installation

```bash
npm install -g @ersinkoc/webhook-proxy-cli
```

### Quick Start

```bash
# Initialize configuration
webhook-proxy init

# Login with your API key
webhook-proxy login whp_your_api_key_here

# Create an endpoint
webhook-proxy create "My App" "http://localhost:3000/webhook"

# List all endpoints
webhook-proxy list

# Follow webhook logs in real-time
webhook-proxy logs <endpoint-id> --follow

# Create a quick tunnel to a local port
webhook-proxy tunnel 3000
```

### CLI Commands

- `init` - Initialize webhook proxy configuration
- `login <api-key>` - Authenticate with your API key
- `logout` - Clear authentication
- `create <name> <target-url>` - Create a new endpoint
- `list` - List all endpoints
- `delete <endpoint-id>` - Delete an endpoint
- `info <endpoint-id>` - Show endpoint details
- `logs <endpoint-id>` - Show webhook logs
- `status` - Show connection status
- `tunnel <port>` - Create a quick tunnel to a local port
- `test <endpoint-id>` - Send a test webhook

## API Documentation

### Authentication

Include your API key in the request headers:

```bash
X-API-Key: whp_your_api_key_here
```

### Endpoints

#### Create Endpoint
```bash
POST /api/endpoints
Content-Type: application/json

{
  "name": "My Endpoint",
  "targetUrl": "http://localhost:3000/webhook"
}
```

#### List Endpoints
```bash
GET /api/endpoints
```

#### Get Endpoint
```bash
GET /api/endpoints/:id
```

#### Update Endpoint
```bash
PUT /api/endpoints/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "targetUrl": "http://localhost:4000/webhook",
  "isActive": true
}
```

#### Delete Endpoint
```bash
DELETE /api/endpoints/:id
```

#### List Webhooks
```bash
GET /api/webhooks?endpointId=:endpointId&page=1&pageSize=20
```

#### Get Webhook
```bash
GET /api/webhooks/:id
```

#### Resend Webhook
```bash
POST /api/webhooks/:id/resend
```

## Architecture

The project is organized as a monorepo with the following packages:

- **`packages/server`** - Fastify API server with webhook forwarding
- **`packages/web`** - React dashboard built with Vite
- **`packages/cli`** - Command-line interface tool
- **`packages/shared`** - Shared types and utilities

### Technology Stack

- **Backend**: Node.js, Fastify, Prisma, PostgreSQL, Redis, BullMQ
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Zustand
- **CLI**: Commander.js, Inquirer, Chalk
- **Real-time**: Socket.io
- **Infrastructure**: Docker, Docker Compose

## Development

### Project Structure

```
webhook-proxy/
├── packages/
│   ├── server/         # API server
│   ├── web/           # React dashboard
│   ├── cli/           # CLI tool
│   └── shared/        # Shared utilities
├── docker/            # Docker configurations
├── docs/              # Documentation
└── scripts/           # Build and deployment scripts
```

### Available Scripts

```bash
# Development
pnpm dev              # Start all packages in dev mode
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm lint             # Lint code
pnpm typecheck        # Type check

# Database
pnpm db:migrate       # Run migrations
pnpm db:generate      # Generate Prisma client
pnpm db:seed          # Seed database

# Docker
docker-compose up     # Start production stack
docker-compose -f docker-compose.dev.yml up  # Start dev dependencies
```

### Environment Variables

Create a `.env` file in `packages/server/`:

```env
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/webhookproxy"

# Redis
REDIS_URL="redis://localhost:6379"

# Security
JWT_SECRET="your-super-secret-jwt-key"
API_KEY_SALT="your-api-key-salt"

# URLs
API_BASE_URL="http://localhost:3001"
WEB_BASE_URL="http://localhost:3000"
PUBLIC_WEBHOOK_URL="http://localhost:3001"

# Webhook Configuration
WEBHOOK_TIMEOUT_MS=30000
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_DELAY_MS=1000
```

## Deployment

### Using Docker

1. Build and start the containers:
```bash
docker-compose up -d
```

2. Run database migrations:
```bash
docker-compose exec server pnpm prisma migrate deploy
```

3. Access the application:
- Dashboard: http://localhost
- API: http://localhost:3001

### Manual Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions for various platforms.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

- Never expose your API keys publicly
- Use HTTPS in production
- Regularly rotate API keys
- Report security vulnerabilities at [GitHub Issues](https://github.com/ersinkoc/webhook-proxy/issues)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with ❤️ by the open-source community
- Inspired by ngrok, localtunnel, and similar tools
- Special thanks to all contributors

## Support

- 🐛 Issues: [GitHub Issues](https://github.com/ersinkoc/webhook-proxy/issues)