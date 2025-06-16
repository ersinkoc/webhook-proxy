# API Documentation

The Webhook Proxy API provides programmatic access to manage webhook endpoints and view webhook logs.

## Base URL

For production deployments, configure your own domain.

```
https://your-domain.com
```

For local development:
```
http://localhost:3001
```

## Authentication

All API requests require authentication using an API key. Include your API key in the request headers:

```http
X-API-Key: whp_your_api_key_here
```

You can also use Bearer token authentication:

```http
Authorization: Bearer your_jwt_token_here
```

## Rate Limiting

- Default rate limit: 100 requests per minute per API key
- Webhook endpoints: 1000 requests per minute per endpoint

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

## Common Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400,
  "details": {
    // Additional error details (optional)
  }
}
```

## Endpoints

### Authentication

#### Login with API Key

```http
POST /api/auth/login
Content-Type: application/json

{
  "apiKey": "whp_your_api_key"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "apiKey": "whp_..."
    }
  }
}
```

#### Get Current User

```http
GET /api/auth/me
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "apiKey": "whp_..."
    }
  }
}
```

### Endpoints Management

#### List Endpoints

```http
GET /api/endpoints?page=1&pageSize=20&search=github
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search by name or target URL

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "endpoint_id",
        "name": "GitHub Webhooks",
        "slug": "abc123",
        "targetUrl": "http://localhost:3000/github",
        "apiKey": "whep_...",
        "isActive": true,
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T10:00:00Z",
        "webhookCount": 42,
        "lastWebhookAt": "2024-01-15T12:30:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 20,
    "hasMore": false
  }
}
```

#### Get Endpoint

```http
GET /api/endpoints/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "endpoint_id",
    "name": "GitHub Webhooks",
    "slug": "abc123",
    "targetUrl": "http://localhost:3000/github",
    "apiKey": "whep_...",
    "isActive": true,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z",
    "webhookCount": 42,
    "lastWebhookAt": "2024-01-15T12:30:00Z"
  }
}
```

#### Create Endpoint

```http
POST /api/endpoints
Content-Type: application/json

{
  "name": "My Webhook Endpoint",
  "targetUrl": "http://localhost:3000/webhook"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new_endpoint_id",
    "name": "My Webhook Endpoint",
    "slug": "xyz789",
    "targetUrl": "http://localhost:3000/webhook",
    "apiKey": "whep_new_api_key",
    "isActive": true,
    "createdAt": "2024-01-15T14:00:00Z",
    "updatedAt": "2024-01-15T14:00:00Z",
    "webhookCount": 0
  }
}
```

#### Update Endpoint

```http
PUT /api/endpoints/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "targetUrl": "http://localhost:4000/webhook",
  "isActive": false
}
```

**Request Body (all fields optional):**
- `name`: New endpoint name
- `targetUrl`: New target URL
- `isActive`: Enable/disable endpoint

**Response:**
```json
{
  "success": true,
  "data": {
    // Updated endpoint object
  }
}
```

#### Delete Endpoint

```http
DELETE /api/endpoints/:id
```

**Response:**
```
HTTP/1.1 204 No Content
```

#### Regenerate Endpoint API Key

```http
POST /api/endpoints/:id/regenerate-key
```

**Response:**
```json
{
  "success": true,
  "data": {
    "apiKey": "whep_new_regenerated_key"
  }
}
```

### Webhooks

#### List Webhooks

```http
GET /api/webhooks?endpointId=abc&page=1&pageSize=20&success=true
```

**Query Parameters:**
- `endpointId` (optional): Filter by endpoint ID
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20, max: 100)
- `method` (optional): Filter by HTTP method
- `statusCode` (optional): Filter by status code
- `success` (optional): Filter by success status (true/false)
- `startDate` (optional): Filter by start date (ISO 8601)
- `endDate` (optional): Filter by end date (ISO 8601)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "webhook_id",
        "endpointId": "endpoint_id",
        "method": "POST",
        "headers": {
          "content-type": "application/json",
          "x-github-event": "push"
        },
        "query": {
          "token": "secret"
        },
        "body": {
          "ref": "refs/heads/main",
          "commits": []
        },
        "statusCode": 200,
        "response": {
          "success": true
        },
        "deliveredAt": "2024-01-15T12:30:00Z",
        "duration": 150,
        "createdAt": "2024-01-15T12:29:59Z"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  }
}
```

#### Get Webhook

```http
GET /api/webhooks/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "webhook_id",
    "endpointId": "endpoint_id",
    "method": "POST",
    "headers": {},
    "body": {},
    "statusCode": 200,
    "response": {},
    "error": null,
    "deliveredAt": "2024-01-15T12:30:00Z",
    "duration": 150,
    "createdAt": "2024-01-15T12:29:59Z"
  }
}
```

#### Resend Webhook

```http
POST /api/webhooks/:id/resend
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "statusCode": 200,
    "response": {
      "received": true
    },
    "duration": 120
  }
}
```

#### Delete Webhook

```http
DELETE /api/webhooks/:id
```

**Response:**
```
HTTP/1.1 204 No Content
```

#### Delete All Webhooks for Endpoint

```http
DELETE /api/webhooks/bulk?endpointId=endpoint_id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": 42
  }
}
```

### Webhook Receiver

#### Receive Webhook

This endpoint is used by external services to send webhooks. It doesn't require authentication.

```http
POST /webhook/:endpointSlug
Content-Type: application/json

{
  "event": "payment.succeeded",
  "data": {
    "amount": 1000,
    "currency": "USD"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook received",
  "webhookId": "webhook_id"
}
```

The webhook will be forwarded to the configured target URL with all headers and body intact.

### Health Check

#### Get Health Status

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "connected"
  }
}
```

## WebSocket Events

Connect to the WebSocket endpoint for real-time webhook updates:

```javascript
const socket = io('wss://your-domain.com', {
  auth: {
    token: 'your_jwt_token'
  }
});

// Subscribe to endpoint events
socket.emit('subscribe:endpoint', 'endpoint_id');

// Listen for webhook events
socket.on('webhook:event', (event) => {
  switch(event.type) {
    case 'webhook:received':
      console.log('New webhook:', event.data);
      break;
    case 'webhook:delivered':
      console.log('Webhook delivered:', event.data);
      break;
    case 'webhook:failed':
      console.log('Webhook failed:', event.data);
      break;
  }
});
```

### Event Types

- `webhook:received` - New webhook received
- `webhook:delivered` - Webhook successfully delivered
- `webhook:failed` - Webhook delivery failed

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing API key |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

## SDKs

Official SDKs are available for:

- [JavaScript/TypeScript](https://github.com/webhook-proxy/js-sdk)
- [Python](https://github.com/webhook-proxy/python-sdk)
- [Go](https://github.com/webhook-proxy/go-sdk)
- [Ruby](https://github.com/webhook-proxy/ruby-sdk)

## Examples

### cURL

```bash
# Create an endpoint
curl -X POST https://your-domain.com/api/endpoints \
  -H "X-API-Key: whp_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Webhooks",
    "targetUrl": "https://myapp.com/webhooks"
  }'

# List recent webhooks
curl https://your-domain.com/api/webhooks?pageSize=10 \
  -H "X-API-Key: whp_your_api_key"
```

### JavaScript

```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'https://your-domain.com',
  headers: {
    'X-API-Key': 'whp_your_api_key'
  }
});

// Create endpoint
const endpoint = await client.post('/api/endpoints', {
  name: 'My App',
  targetUrl: 'http://localhost:3000/webhook'
});

console.log('Webhook URL:', `https://your-domain.com/webhook/${endpoint.data.data.slug}`);
```

### Python

```python
import requests

headers = {
    'X-API-Key': 'whp_your_api_key',
    'Content-Type': 'application/json'
}

# Create endpoint
response = requests.post(
    'https://your-domain.com/api/endpoints',
    headers=headers,
    json={
        'name': 'My App',
        'targetUrl': 'http://localhost:3000/webhook'
    }
)

endpoint = response.json()['data']
print(f"Webhook URL: https://your-domain.com/webhook/{endpoint['slug']}")
```