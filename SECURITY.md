# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within Webhook Proxy, please create an issue at [GitHub Issues](https://github.com/ersinkoc/webhook-proxy/issues). All security vulnerabilities will be promptly addressed.

Please do not report security vulnerabilities through public GitHub issues.

### What to Include

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

### What to Expect

- You should receive a response within 48 hours acknowledging your report
- We will confirm the vulnerability and determine its impact
- We will release a fix as soon as possible, depending on complexity
- We will credit you for the discovery (unless you prefer to remain anonymous)

## Security Best Practices

When using Webhook Proxy, please follow these security best practices:

### API Keys

- **Never expose API keys in client-side code**
- **Never commit API keys to version control**
- Rotate API keys regularly
- Use different API keys for different environments (dev, staging, production)
- Immediately revoke any API keys that may have been exposed

### Webhook URLs

- Use HTTPS for all webhook endpoints
- Implement webhook signature verification when possible
- Validate all incoming webhook data
- Use rate limiting to prevent abuse

### Self-Hosting

If you're self-hosting Webhook Proxy:

- Always use HTTPS in production
- Keep all dependencies up to date
- Use strong, unique passwords for database access
- Enable firewall rules to restrict access
- Regular backup your database
- Monitor logs for suspicious activity
- Use environment variables for sensitive configuration

### Database Security

- Use strong passwords for PostgreSQL
- Enable SSL for database connections in production
- Restrict database access to only necessary hosts
- Regular backup your database
- Enable query logging for audit purposes

### Redis Security

- Set a strong password for Redis
- Bind Redis to localhost only (unless using separate servers)
- Disable dangerous commands in production
- Use SSL for Redis connections when possible

## Security Features

Webhook Proxy includes several security features:

### Rate Limiting

- API endpoints are rate-limited to prevent abuse
- Webhook endpoints have separate, higher rate limits
- Rate limits are configurable per environment

### Authentication

- API key-based authentication for all API endpoints
- JWT tokens for session management
- Secure password hashing using bcrypt

### Data Protection

- All sensitive data is encrypted at rest
- SSL/TLS encryption for data in transit
- Webhook payloads are stored encrypted
- API keys are hashed and salted

### Input Validation

- All user inputs are validated and sanitized
- SQL injection protection through parameterized queries
- XSS protection in the web interface

## Disclosure Policy

- Security issues are taken seriously and will be addressed promptly
- We will work with security researchers to verify and fix issues
- We will publicly disclose the issue after a fix is available
- Security researchers will be credited (unless they prefer anonymity)

## Contact

For any security concerns, please create an issue at: [GitHub Issues](https://github.com/ersinkoc/webhook-proxy/issues)