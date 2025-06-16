# NPM Publishing Guide

This document provides a complete guide for publishing webhook proxy packages to npm.

## Overview

The webhook proxy project includes a comprehensive NPM publishing system with:

- ✅ **Pre-publish validation** - Extensive checks before publishing
- 🔨 **Automated building** - TypeScript compilation and preparation
- 📦 **Multi-package publishing** - Handles dependencies between packages
- 🧪 **Dry run support** - Test publishing without actually publishing
- 🔒 **Secure authentication** - Token-based npm authentication
- 📊 **Detailed reporting** - Success/failure reporting with next steps
- 🚀 **GitHub Actions** - Automated CI/CD publishing

## Quick Start

### 1. Setup npm Token

Create an npm token and store it securely:

```bash
# Create .npmjs file with your token
echo "npm_your_token_here" > .npmjs

# Or set environment variable
export NPM_TOKEN=npm_your_token_here
```

### 2. Test the Pipeline

```bash
# Run all validation tests
npm run test:publish

# Test the publishing pipeline (dry run)
npm run publish:npm:dry-run
```

### 3. Publish Packages

```bash
# Publish to npm
npm run publish:npm

# Or use the shell script
./scripts/publish.sh
```

## Package Structure

The publishing system handles these packages:

| Package | Description | Published |
|---------|-------------|-----------|
| `@ersinkoc/webhook-proxy-cli` | Command-line interface | ✅ Yes |
| `@ersinkoc/webhook-proxy-shared` | Shared utilities and types | ✅ Yes |
| `@ersinkoc/webhook-proxy-server` | Server package | ❌ No (private) |
| `@ersinkoc/webhook-proxy-web` | Web dashboard | ❌ No (private) |

## Publishing Commands

### Main Commands

```bash
# Standard publish
npm run publish:npm

# Dry run (test without publishing)
npm run publish:npm:dry-run

# Force publish (skip version checks)
npm run publish:npm:force

# Shell script version
npm run publish:npm:shell
```

### Validation Commands

```bash
# Run full publish pipeline test
npm run test:publish

# Run pre-publish validation only
npm run validate:publish

# Check individual package
cd packages/cli && npm run prepublishOnly
```

## Detailed Workflow

### 1. Pre-Publish Validation

The system runs extensive validation before publishing:

- ✅ Package.json validation (required fields, version format)
- ✅ Build output validation (dist files, entry points)
- ✅ Test execution (unit tests, integration tests)
- ✅ Linting and type checking
- ✅ Security audit
- ✅ Version consistency check
- ✅ File inclusion validation
- ✅ License and README checks

### 2. Building Process

Each package is built individually:

```bash
# Shared package (built first)
cd packages/shared
npm run build  # TypeScript compilation

# CLI package (depends on shared)
cd packages/cli
npm run build  # TypeScript compilation + executable permissions
```

### 3. Publishing Order

Packages are published in dependency order:

1. **`@ersinkoc/webhook-proxy-shared`** - No dependencies
2. **`@ersinkoc/webhook-proxy-cli`** - Depends on shared package

### 4. Post-Publish Tasks

After successful publishing:

- 📝 Changelog generation (conventional commits)
- 🏷️ Git tag creation (`v1.0.0`)
- 📤 Tag push to repository
- 📊 Summary report with installation commands

## GitHub Actions Automation

### Automated Publishing

The GitHub Actions workflow handles:

- **Tag-based publishing** - Automatically publishes when you push a version tag
- **Manual publishing** - Workflow dispatch with version bump options
- **Dry run testing** - Test the pipeline without publishing
- **Installation testing** - Verify packages work after publishing

### Usage

#### Tag-based Publishing

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will automatically publish
```

#### Manual Publishing

1. Go to GitHub Actions tab
2. Select "Publish NPM Packages" workflow
3. Click "Run workflow"
4. Choose version bump type (patch/minor/major)
5. Optionally enable dry run

### Workflow Features

- 🔍 **Pre-flight checks** - Tests, linting, type checking
- 📦 **Automated building** - Compiles TypeScript packages
- 🧪 **Dry run testing** - Tests publish pipeline before real publish
- 📊 **Installation testing** - Verifies packages install correctly
- 📋 **GitHub releases** - Creates releases with changelogs
- 🚨 **Failure notifications** - Creates issues on publish failures

## Configuration Files

### Package Configuration

Each publishable package includes:

```json
{
  "name": "@ersinkoc/webhook-proxy-*",
  "version": "1.0.0",
  "files": ["dist/**/*", "README.md", "LICENSE"],
  "engines": { "node": ">=16.0.0" },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "scripts": {
    "prepublishOnly": "npm run build && npm test"
  }
}
```

### .npmignore Files

Packages exclude development files:

```
# Source files
src/
*.ts
!*.d.ts

# Development
.env*
coverage/
node_modules/

# Testing
test/
*.test.*
jest.config.*

# Build artifacts
tsconfig.json
.tsbuildinfo

# CI/CD and docs
.github/
docs/
```

## Error Handling

### Common Issues

#### Authentication Errors

```bash
# Error: npm authentication failed
# Solution: Check your npm token
npm whoami
npm login

# Or verify .npmjs file
cat .npmjs
```

#### Build Failures

```bash
# Error: TypeScript compilation failed
# Solution: Fix TypeScript errors
npm run typecheck

# Build packages individually
cd packages/shared && npm run build
cd packages/cli && npm run build
```

#### Version Conflicts

```bash
# Error: Version already exists
# Solution: Bump version or use force flag
npm version patch  # In each package
npm run publish:npm:force  # Skip version checks
```

#### Test Failures

```bash
# Error: Tests failed
# Solution: Fix failing tests
npm test

# Run tests for specific package
cd packages/cli && npm test
```

### Debug Mode

Enable debug output for troubleshooting:

```bash
# Enable debug logging
DEBUG=webhook-proxy:* npm run publish:npm

# Use shell script with verbose output
./scripts/publish.sh --verbose
```

## Best Practices

### Before Publishing

1. **Update versions** consistently across packages
2. **Run full test suite** to ensure quality
3. **Update documentation** including READMEs and changelogs
4. **Test locally** with dry run before real publish
5. **Check npm registry** for any naming conflicts

### Version Management

```bash
# Bump version in all packages
npm version patch  # In root and each package

# Or use the automated workflow
# which handles version bumping for you
```

### Security

- 🔒 **Never commit tokens** - Use .npmjs file (in .gitignore)
- 🔑 **Use scoped tokens** - Limit token permissions
- 🔄 **Rotate tokens regularly** - Update tokens periodically
- 📊 **Monitor packages** - Watch for unauthorized publishes

## Troubleshooting

### Package Not Installing

```bash
# Check if package exists
npm view @ersinkoc/webhook-proxy-cli

# Check installation
npm install -g @ersinkoc/webhook-proxy-cli
webhook-proxy --version
```

### Permission Issues

```bash
# Global install permission denied
sudo npm install -g @ersinkoc/webhook-proxy-cli

# Or use npx (no installation)
npx @ersinkoc/webhook-proxy-cli --help
```

### Updates Not Appearing

```bash
# Clear npm cache
npm cache clean --force

# Use specific version
npm install -g @ersinkoc/webhook-proxy-cli@latest
```

## Advanced Usage

### Custom Publishing

For specialized publishing needs:

```javascript
// Use the publisher programmatically
const { NPMPublisher } = require('./scripts/publish.js');

const publisher = new NPMPublisher();
await publisher.publish();
```

### Selective Publishing

Publish only specific packages:

```bash
# Modify publishablePackages in publish.js
const publishablePackages = [
  { name: 'shared', order: 1 }
  // Remove CLI to skip it
];
```

### Custom Validation

Add custom validation rules:

```javascript
// In scripts/pre-publish-checks.js
validateCustomRules(packagePath) {
  // Add your custom validation logic
}
```

## Support

For issues with the publishing system:

1. 📖 **Check this guide** for common solutions
2. 🧪 **Run test suite** to identify specific issues
3. 🐛 **Create an issue** on GitHub with debug output
4. 💬 **Join discussions** for community help

## Contributing

To improve the publishing system:

1. 🍴 Fork the repository
2. 🔧 Make improvements to scripts in `scripts/` directory
3. 🧪 Test with `npm run test:publish`
4. 📝 Update this documentation
5. 🔄 Submit a pull request

---

This publishing system ensures reliable, consistent, and secure npm package publishing for the webhook proxy project.