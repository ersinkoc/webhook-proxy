# @ersinkoc/webhook-proxy-cli

A powerful command-line tool for managing webhook proxy endpoints during development. Forward webhooks from the cloud to your local development environment with ease.

![License](https://img.shields.io/npm/l/@ersinkoc/webhook-proxy-cli)
![npm](https://img.shields.io/npm/v/@ersinkoc/webhook-proxy-cli)
![Node](https://img.shields.io/node/v/@ersinkoc/webhook-proxy-cli)

## Features

- 🚀 **Instant Setup** - Create webhook endpoints in seconds
- 📡 **Real-time Monitoring** - Watch webhooks as they arrive
- 🔄 **Multiple Targets** - Forward to multiple local services
- 🛡️ **Secure** - Built-in authentication and validation
- 📊 **Rich Logging** - Detailed request/response inspection
- 🌐 **Cross-platform** - Works on Windows, macOS, and Linux
- ⚡ **Fast** - Built with modern Node.js and TypeScript

## Installation

### Global Installation (Recommended)

```bash
npm install -g @ersinkoc/webhook-proxy-cli
```

### Using npx (No Installation)

```bash
npx @ersinkoc/webhook-proxy-cli --help
```

## Quick Start

```bash
# Create your first webhook endpoint
webhook-proxy create my-app http://localhost:3000/webhook

# Monitor webhooks in real-time
webhook-proxy logs my-app --follow

# Create a quick tunnel to any port
webhook-proxy tunnel 3000
```

## Commands

### Core Commands

#### `create <name> <target-url>`
Create a new webhook endpoint

```bash
webhook-proxy create github-dev http://localhost:3000/github
```

#### `list`
List all your webhook endpoints

```bash
webhook-proxy list
```

#### `logs <endpoint-name> [options]`
Monitor webhook logs

```bash
# Follow logs in real-time
webhook-proxy logs github-dev --follow

# Filter by HTTP method
webhook-proxy logs github-dev --method=POST

# Show last 50 webhooks
webhook-proxy logs github-dev --limit=50
```

#### `delete <endpoint-name>`
Delete a webhook endpoint

```bash
webhook-proxy delete github-dev
```

### Utility Commands

#### `tunnel <port>`
Create a quick tunnel to a local port

```bash
webhook-proxy tunnel 3000
```

#### `info <endpoint-name>`
Show detailed endpoint information

```bash
webhook-proxy info github-dev
```

#### `test <endpoint-name>`
Send a test webhook

```bash
webhook-proxy test github-dev
```

#### `status`
Show connection status and account info

```bash
webhook-proxy status
```

### Configuration Commands

#### `init`
Initialize webhook proxy configuration

```bash
webhook-proxy init
```

#### `login <api-key>`
Authenticate with your API key

```bash
webhook-proxy login whp_your_api_key_here
```

#### `logout`
Clear authentication

```bash
webhook-proxy logout
```

## Examples

### GitHub Webhooks

```bash
# Create endpoint for GitHub webhooks
webhook-proxy create github-dev http://localhost:3000/github-webhook

# Monitor GitHub events
webhook-proxy logs github-dev --follow --filter="push"
```

### Stripe Webhooks

```bash
# Create endpoint for Stripe webhooks
webhook-proxy create stripe-dev http://localhost:3000/stripe-webhook

# Test with a sample webhook
webhook-proxy test stripe-dev
```

### Multiple Services

```bash
# Create endpoints for different services
webhook-proxy create api-dev http://localhost:3001/webhooks
webhook-proxy create admin-dev http://localhost:3002/webhooks
webhook-proxy create worker-dev http://localhost:3003/webhooks

# List all endpoints
webhook-proxy list
```

## Configuration

Create `.webhook-proxy.json` in your project root for project-specific settings:

```json
{
  "apiKey": "whp_your_api_key",
  "defaultTarget": "http://localhost:3000",
  "autoFollow": true,
  "logLevel": "info",
  "endpoints": {
    "dev": "http://localhost:3000/webhook",
    "staging": "http://localhost:3001/webhook"
  }
}
```

### Global Configuration

Global settings are stored in `~/.webhook-proxy/config.json`:

```json
{
  "apiKey": "whp_your_api_key",
  "defaultRegion": "us-east-1",
  "timeout": 30000,
  "retries": 3
}
```

## Advanced Usage

### Custom Headers

```bash
# Add custom headers to forwarded requests
webhook-proxy create api-dev http://localhost:3000/webhook \
  --header "X-Custom: value" \
  --header "Authorization: Bearer token"
```

### Filtering and Transforms

```bash
# Only forward POST requests
webhook-proxy logs api-dev --method=POST

# Filter by content type
webhook-proxy logs api-dev --content-type="application/json"

# Filter by custom header
webhook-proxy logs api-dev --header="X-GitHub-Event: push"
```

### Webhook Replay

```bash
# Replay the last webhook
webhook-proxy replay api-dev --last

# Replay a specific webhook by ID
webhook-proxy replay api-dev --id=webhook_123

# Replay webhooks from the last hour
webhook-proxy replay api-dev --since="1h"
```

## Troubleshooting

### Common Issues

**Command not found after installation:**
```bash
# Check if npm global bin is in PATH
npm config get prefix

# On macOS/Linux, add to ~/.bashrc or ~/.zshrc:
export PATH="$(npm config get prefix)/bin:$PATH"
```

**Connection issues:**
```bash
# Check connectivity
webhook-proxy status

# Verify API key
webhook-proxy login your_api_key
```

**Webhook not receiving:**
```bash
# Check endpoint status
webhook-proxy info endpoint-name

# Verify target URL is accessible
curl http://localhost:3000/webhook
```

### Debug Mode

```bash
# Enable debug logging
WEBHOOK_PROXY_DEBUG=true webhook-proxy logs api-dev --follow

# Or use debug flag
webhook-proxy --debug logs api-dev --follow
```

## API Integration

The CLI can be used programmatically:

```javascript
const { WebhookProxyCLI } = require('@ersinkoc/webhook-proxy-cli');

const cli = new WebhookProxyCLI({
  apiKey: 'whp_your_api_key'
});

// Create endpoint
const endpoint = await cli.createEndpoint('my-app', 'http://localhost:3000');
console.log(`Webhook URL: ${endpoint.url}`);

// Monitor webhooks
for await (const webhook of cli.streamWebhooks('my-app')) {
  console.log('Received webhook:', webhook);
}
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/ersinkoc/webhook-proxy/blob/main/CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/ersinkoc/webhook-proxy.git
cd webhook-proxy

# Install dependencies
pnpm install

# Build CLI
cd packages/cli
npm run build

# Test CLI locally
node dist/index.js --help
```

## License

MIT License - see [LICENSE](https://github.com/ersinkoc/webhook-proxy/blob/main/LICENSE) for details.

## Support

- 📖 [Documentation](https://github.com/ersinkoc/webhook-proxy/tree/main/docs)
- 🐛 [Report Issues](https://github.com/ersinkoc/webhook-proxy/issues)
- 💬 [Discussions](https://github.com/ersinkoc/webhook-proxy/discussions)
- 📧 [Contact](https://github.com/ersinkoc)

## Related Packages

- [`@ersinkoc/webhook-proxy-shared`](https://www.npmjs.com/package/@ersinkoc/webhook-proxy-shared) - Shared utilities and types
- [`@ersinkoc/webhook-proxy-server`](https://github.com/ersinkoc/webhook-proxy/tree/main/packages/server) - Self-hosted server