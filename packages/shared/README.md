# @ersinkoc/webhook-proxy-shared

Shared types, utilities, and validation schemas for webhook proxy service. This package provides common functionality used across webhook proxy components.

![License](https://img.shields.io/npm/l/@ersinkoc/webhook-proxy-shared)
![npm](https://img.shields.io/npm/v/@ersinkoc/webhook-proxy-shared)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)

## Features

- 🔍 **Type Safety** - Complete TypeScript definitions
- ⚙️ **Validation** - Zod schemas for runtime validation
- 🛠️ **Utilities** - Common helper functions
- 📄 **Constants** - Shared configuration values
- 🔄 **Compatibility** - Works in Node.js and browsers

## Installation

```bash
npm install @ersinkoc/webhook-proxy-shared
```

## Usage

### Basic Types

```typescript
import { 
  WebhookEvent, 
  EndpointConfig, 
  WebhookRequest,
  WebhookResponse 
} from '@ersinkoc/webhook-proxy-shared';

// Create a webhook event
const webhook: WebhookEvent = {
  id: 'wh_1234567890',
  endpointId: 'ep_0987654321',
  method: 'POST',
  url: '/github/webhook',
  headers: {
    'content-type': 'application/json',
    'x-github-event': 'push'
  },
  body: {
    ref: 'refs/heads/main',
    commits: []
  },
  timestamp: new Date(),
  statusCode: 200,
  responseTime: 150
};

// Configure an endpoint
const endpoint: EndpointConfig = {
  id: 'ep_0987654321',
  name: 'GitHub Development',
  slug: 'github-dev',
  targetUrl: 'http://localhost:3000/webhook',
  isActive: true,
  apiKey: 'whep_secret_key',
  createdAt: new Date(),
  updatedAt: new Date()
};
```

### Validation Schemas

```typescript
import { 
  webhookEventSchema, 
  endpointConfigSchema,
  validateWebhookPayload,
  validateEndpoint
} from '@ersinkoc/webhook-proxy-shared';

// Validate webhook data
const webhookData = {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: { message: 'Hello' }
};

try {
  const validWebhook = webhookEventSchema.parse(webhookData);
  console.log('Valid webhook:', validWebhook);
} catch (error) {
  console.error('Invalid webhook:', error.errors);
}

// Validate endpoint configuration
const endpointData = {
  name: 'My Endpoint',
  targetUrl: 'http://localhost:3000',
  isActive: true
};

if (validateEndpoint(endpointData)) {
  console.log('Valid endpoint configuration');
} else {
  console.log('Invalid endpoint configuration');
}
```

### Utility Functions

```typescript
import { 
  generateApiKey,
  generateSlug,
  formatWebhookUrl,
  parseWebhookHeaders,
  sanitizeWebhookBody,
  validateUrl,
  isValidHttpMethod
} from '@ersinkoc/webhook-proxy-shared';

// Generate API keys and slugs
const apiKey = generateApiKey(); // "whep_..."
const endpointSlug = generateSlug('My Endpoint'); // "my-endpoint"

// Format webhook URLs
const webhookUrl = formatWebhookUrl('example.com', 'my-endpoint');
// "https://example.com/webhook/my-endpoint"

// Parse and sanitize webhook data
const headers = parseWebhookHeaders(rawHeaders);
const sanitizedBody = sanitizeWebhookBody(requestBody);

// Validation utilities
if (validateUrl('http://localhost:3000')) {
  console.log('Valid URL');
}

if (isValidHttpMethod('POST')) {
  console.log('Valid HTTP method');
}
```

### Error Handling

```typescript
import { 
  WebhookProxyError,
  ValidationError,
  EndpointError,
  NetworkError,
  isWebhookProxyError
} from '@ersinkoc/webhook-proxy-shared';

// Create custom errors
throw new ValidationError('Invalid webhook payload', {
  field: 'targetUrl',
  received: 'invalid-url'
});

throw new EndpointError('Endpoint not found', {
  endpointId: 'ep_123',
  slug: 'missing-endpoint'
});

// Handle errors
try {
  // Some webhook operation
} catch (error) {
  if (isWebhookProxyError(error)) {
    console.error('Webhook Proxy Error:', error.message);
    console.error('Details:', error.details);
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Constants and Configuration

```typescript
import { 
  HTTP_METHODS,
  WEBHOOK_EVENTS,
  API_ENDPOINTS,
  DEFAULT_CONFIG,
  RATE_LIMITS
} from '@ersinkoc/webhook-proxy-shared';

// Available HTTP methods
console.log(HTTP_METHODS); // ['GET', 'POST', 'PUT', 'DELETE', ...]

// Webhook event types
console.log(WEBHOOK_EVENTS.RECEIVED); // 'webhook:received'
console.log(WEBHOOK_EVENTS.DELIVERED); // 'webhook:delivered'

// API endpoints
console.log(API_ENDPOINTS.WEBHOOKS); // '/api/webhooks'
console.log(API_ENDPOINTS.ENDPOINTS); // '/api/endpoints'

// Default configuration
const config = {
  ...DEFAULT_CONFIG,
  timeout: 60000 // Override specific values
};

// Rate limiting constants
console.log(RATE_LIMITS.DEFAULT_REQUESTS_PER_MINUTE); // 100
```

### Real-time Events

```typescript
import { 
  SocketEvent,
  createSocketEventPayload,
  parseSocketEvent
} from '@ersinkoc/webhook-proxy-shared';

// Create socket event payload
const eventPayload = createSocketEventPayload('webhook:received', {
  webhookId: 'wh_123',
  endpointId: 'ep_456',
  timestamp: new Date()
});

// Parse incoming socket events
const socketData = JSON.stringify(eventPayload);
const parsedEvent = parseSocketEvent(socketData);

if (parsedEvent.type === 'webhook:received') {
  console.log('New webhook received:', parsedEvent.payload);
}
```

## API Reference

### Types

#### WebhookEvent
Represents a complete webhook event with request and response data.

```typescript
interface WebhookEvent {
  id: string;
  endpointId: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  query: Record<string, string>;
  timestamp: Date;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}
```

#### EndpointConfig
Configuration for a webhook endpoint.

```typescript
interface EndpointConfig {
  id: string;
  name: string;
  slug: string;
  targetUrl: string;
  isActive: boolean;
  apiKey: string;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  description?: string;
  tags?: string[];
}
```

#### WebhookRequest
Incoming webhook request data.

```typescript
interface WebhookRequest {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  query: Record<string, string>;
  timestamp: Date;
}
```

#### WebhookResponse
Webhook delivery response data.

```typescript
interface WebhookResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  responseTime: number;
  error?: string;
}
```

### Validation Schemas

All validation schemas are built with [Zod](https://zod.dev/) for runtime type safety:

- `webhookEventSchema` - Validates complete webhook events
- `endpointConfigSchema` - Validates endpoint configurations
- `webhookRequestSchema` - Validates incoming webhook requests
- `webhookResponseSchema` - Validates webhook responses
- `socketEventSchema` - Validates real-time socket events

### Utility Functions

#### `generateApiKey(): string`
Generates a secure API key with the `whep_` prefix.

#### `generateSlug(name: string): string`
Generates a URL-safe slug from an endpoint name.

#### `formatWebhookUrl(domain: string, slug: string): string`
Formats a complete webhook URL.

#### `validateUrl(url: string): boolean`
Validates if a string is a valid HTTP/HTTPS URL.

#### `isValidHttpMethod(method: string): boolean`
Checks if a string is a valid HTTP method.

#### `sanitizeWebhookBody(body: unknown): unknown`
Sanitizes webhook body data for safe processing.

#### `parseWebhookHeaders(headers: unknown): Record<string, string>`
Parses and normalizes webhook headers.

### Error Classes

#### `WebhookProxyError`
Base error class for all webhook proxy errors.

#### `ValidationError`
Thrown when data validation fails.

#### `EndpointError`
Thrown when endpoint operations fail.

#### `NetworkError`
Thrown when network operations fail.

## Browser Support

This package works in both Node.js and browser environments:

```html
<!-- Browser usage via CDN -->
<script src="https://unpkg.com/@ersinkoc/webhook-proxy-shared"></script>
<script>
  const { validateUrl, generateSlug } = WebhookProxyShared;
  
  if (validateUrl('https://example.com')) {
    console.log('Valid URL');
  }
</script>
```

## TypeScript Configuration

For optimal TypeScript support, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## Contributing

Contributions are welcome! Please see our [Contributing Guide](https://github.com/ersinkoc/webhook-proxy/blob/main/CONTRIBUTING.md) for details.

### Development

```bash
# Clone the repository
git clone https://github.com/ersinkoc/webhook-proxy.git
cd webhook-proxy/packages/shared

# Install dependencies
npm install

# Run tests
npm test

# Build package
npm run build
```

## License

MIT License - see [LICENSE](https://github.com/ersinkoc/webhook-proxy/blob/main/LICENSE) for details.

## Related Packages

- [`@ersinkoc/webhook-proxy-cli`](https://www.npmjs.com/package/@ersinkoc/webhook-proxy-cli) - Command-line interface
- [`@ersinkoc/webhook-proxy-server`](https://github.com/ersinkoc/webhook-proxy/tree/main/packages/server) - Self-hosted server

## Support

- 📖 [Documentation](https://github.com/ersinkoc/webhook-proxy/tree/main/docs)
- 🐛 [Report Issues](https://github.com/ersinkoc/webhook-proxy/issues)
- 💬 [Discussions](https://github.com/ersinkoc/webhook-proxy/discussions)