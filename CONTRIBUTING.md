# Contributing to Webhook Proxy

First off, thank you for considering contributing to Webhook Proxy! It's people like you that make Webhook Proxy such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior at [GitHub Issues](https://github.com/ersinkoc/webhook-proxy/issues).

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed after following the steps**
- **Explain which behavior you expected to see instead and why**
- **Include screenshots and animated GIFs if possible**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior and explain which behavior you expected**
- **Explain why this enhancement would be useful**

### Your First Code Contribution

Unsure where to begin contributing? You can start by looking through these issues:

- `good-first-issue` - issues which should only require a few lines of code
- `help-wanted` - issues which should be a bit more involved than beginner issues

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/ersinkoc/webhook-proxy.git
   cd webhook-proxy
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up the development environment**
   ```bash
   # Copy environment variables
   cp packages/server/.env.example packages/server/.env
   
   # Start Docker services (PostgreSQL and Redis)
   docker-compose -f docker-compose.dev.yml up -d
   
   # Run database migrations
   pnpm db:migrate
   
   # Seed the database (optional)
   pnpm db:seed
   ```

4. **Start the development servers**
   ```bash
   pnpm dev
   ```

## Development Process

### Branch Naming

- Feature branches: `feature/description-of-feature`
- Bug fix branches: `fix/description-of-fix`
- Documentation branches: `docs/description-of-change`

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - A new feature
- `fix:` - A bug fix
- `docs:` - Documentation only changes
- `style:` - Changes that don't affect the meaning of the code
- `refactor:` - A code change that neither fixes a bug nor adds a feature
- `perf:` - A code change that improves performance
- `test:` - Adding missing tests or correcting existing tests
- `chore:` - Changes to the build process or auxiliary tools

Examples:
```
feat: add webhook retry configuration
fix: prevent duplicate webhook deliveries
docs: update API documentation for endpoints
```

### Code Style

- We use ESLint and Prettier for code formatting
- Run `pnpm lint` to check your code
- Run `pnpm format` to format your code
- TypeScript strict mode is enabled

### Testing

- Write tests for new features and bug fixes
- Run `pnpm test` to run all tests
- Run `pnpm test:watch` during development
- Aim for good test coverage

### Documentation

- Update the README.md if you change functionality
- Add JSDoc comments to exported functions and classes
- Update API documentation for endpoint changes
- Include examples in your documentation

## Project Structure

```
webhook-proxy/
├── packages/
│   ├── server/         # Backend API server
│   │   ├── src/
│   │   │   ├── routes/     # API routes
│   │   │   ├── services/   # Business logic
│   │   │   ├── plugins/    # Fastify plugins
│   │   │   └── utils/      # Utilities
│   │   └── tests/      # Server tests
│   ├── web/           # React dashboard
│   │   ├── src/
│   │   │   ├── components/ # React components
│   │   │   ├── pages/      # Page components
│   │   │   ├── hooks/      # Custom hooks
│   │   │   └── store/      # State management
│   │   └── tests/      # Frontend tests
│   ├── cli/           # CLI tool
│   │   └── src/
│   │       └── commands/   # CLI commands
│   └── shared/        # Shared types and utilities
│       └── src/
│           └── types/      # TypeScript types
├── docker/            # Docker configurations
├── docs/              # Documentation
└── scripts/           # Build and utility scripts
```

## API Guidelines

When modifying or adding API endpoints:

1. Follow RESTful conventions
2. Use proper HTTP status codes
3. Include request/response validation with Zod
4. Add OpenAPI documentation comments
5. Implement proper error handling
6. Add tests for new endpoints

## Database Changes

When making database schema changes:

1. Create a new migration: `pnpm db:migrate dev`
2. Update the Prisma schema
3. Generate the Prisma client: `pnpm db:generate`
4. Test migrations both up and down
5. Update seed data if necessary

## Review Process

1. All submissions require review before merging
2. The review process looks at:
   - Code quality and style
   - Test coverage
   - Documentation
   - Performance implications
   - Security considerations

## Release Process

1. Releases are managed by maintainers
2. We use semantic versioning
3. Releases are automated through GitHub Actions
4. Changelog is automatically generated

## Questions?

Feel free to open an issue with your question or reach out on our Discord server.

Thank you for contributing! 🎉