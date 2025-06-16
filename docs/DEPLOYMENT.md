# Deployment Guide

This guide covers various deployment options for Webhook Proxy.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Cloud Platform Deployments](#cloud-platform-deployments)
  - [AWS](#aws-deployment)
  - [Google Cloud Platform](#google-cloud-platform)
  - [Azure](#azure)
  - [DigitalOcean](#digitalocean)
  - [Heroku](#heroku)
- [Reverse Proxy Configuration](#reverse-proxy-configuration)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Database Considerations](#database-considerations)
- [Monitoring](#monitoring)

## Prerequisites

- Docker and Docker Compose (for containerized deployments)
- PostgreSQL 15+
- Redis 7+
- Node.js 18+ (for non-containerized deployments)
- A domain name (for production deployments)
- SSL certificate (Let's Encrypt recommended)

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Server Configuration
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://webhookproxy:password@postgres:5432/webhookproxy

# Redis
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
API_KEY_SALT=your-api-key-salt-change-this

# URLs (adjust for your domain)
API_BASE_URL=https://api.yourdomain.com
WEB_BASE_URL=https://yourdomain.com
PUBLIC_WEBHOOK_URL=https://webhooks.yourdomain.com

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Webhook Configuration
WEBHOOK_TIMEOUT_MS=30000
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_DELAY_MS=1000
```

## Docker Deployment

### 1. Basic Docker Compose Deployment

```bash
# Clone the repository
git clone https://github.com/ersinkoc/webhook-proxy.git
cd webhook-proxy

# Create environment file
cp .env.example .env
# Edit .env with your configuration

# Build and start services
docker-compose up -d

# Run database migrations
docker-compose exec server pnpm prisma migrate deploy

# Check logs
docker-compose logs -f
```

### 2. Production Docker Compose

Create a `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - backend

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - backend

  server:
    image: webhook-proxy/server:latest
    restart: always
    depends_on:
      - postgres
      - redis
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    networks:
      - backend
      - frontend

  web:
    image: webhook-proxy/web:latest
    restart: always
    depends_on:
      - server
    networks:
      - frontend

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - server
      - web
    networks:
      - frontend

networks:
  backend:
  frontend:

volumes:
  postgres_data:
  redis_data:

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

## Kubernetes Deployment

### 1. Create Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: webhook-proxy
```

### 2. PostgreSQL Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: webhook-proxy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: webhookproxy
        - name: POSTGRES_USER
          value: webhookproxy
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
```

### 3. Application Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webhook-proxy-server
  namespace: webhook-proxy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webhook-proxy-server
  template:
    metadata:
      labels:
        app: webhook-proxy-server
    spec:
      containers:
      - name: server
        image: webhook-proxy/server:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 4. Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webhook-proxy-ingress
  namespace: webhook-proxy
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - yourdomain.com
    - api.yourdomain.com
    secretName: webhook-proxy-tls
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: webhook-proxy-web
            port:
              number: 80
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: webhook-proxy-server
            port:
              number: 3001
```

## Cloud Platform Deployments

### AWS Deployment

#### Using AWS ECS

1. **Build and push images to ECR:**
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URI

docker build -f docker/Dockerfile.server -t webhook-proxy-server .
docker tag webhook-proxy-server:latest $ECR_URI/webhook-proxy-server:latest
docker push $ECR_URI/webhook-proxy-server:latest
```

2. **Create ECS Task Definition:**
```json
{
  "family": "webhook-proxy",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "server",
      "image": "${ECR_URI}/webhook-proxy-server:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:webhook-proxy/db"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/webhook-proxy",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### Using AWS Elastic Beanstalk

1. **Create Dockerrun.aws.json:**
```json
{
  "AWSEBDockerrunVersion": "2",
  "containerDefinitions": [
    {
      "name": "server",
      "image": "webhook-proxy/server:latest",
      "memory": 512,
      "portMappings": [
        {
          "hostPort": 80,
          "containerPort": 3001
        }
      ]
    }
  ]
}
```

2. **Deploy:**
```bash
eb init webhook-proxy
eb create production
eb deploy
```

### Google Cloud Platform

#### Using Google Cloud Run

```bash
# Build and push to Container Registry
gcloud builds submit --tag gcr.io/PROJECT-ID/webhook-proxy-server

# Deploy to Cloud Run
gcloud run deploy webhook-proxy-server \
  --image gcr.io/PROJECT-ID/webhook-proxy-server \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=webhook-proxy-db:latest
```

### Azure

#### Using Azure Container Instances

```bash
# Create resource group
az group create --name webhook-proxy-rg --location eastus

# Create container instance
az container create \
  --resource-group webhook-proxy-rg \
  --name webhook-proxy \
  --image webhook-proxy/server:latest \
  --ports 3001 \
  --environment-variables NODE_ENV=production \
  --secure-environment-variables DATABASE_URL=$DATABASE_URL
```

### DigitalOcean

#### Using App Platform

1. **Create app.yaml:**
```yaml
name: webhook-proxy
region: nyc
services:
- name: server
  github:
    repo: yourusername/webhook-proxy
    branch: main
    deploy_on_push: true
  dockerfile_path: docker/Dockerfile.server
  http_port: 3001
  instance_count: 2
  instance_size_slug: professional-xs
  envs:
  - key: NODE_ENV
    value: production
  - key: DATABASE_URL
    value: ${db.DATABASE_URL}
    type: SECRET

databases:
- name: db
  engine: PG
  version: "15"
```

### Heroku

1. **Create Heroku app:**
```bash
heroku create webhook-proxy-app
```

2. **Add buildpacks:**
```bash
heroku buildpacks:add heroku/nodejs
```

3. **Add add-ons:**
```bash
heroku addons:create heroku-postgresql:standard-0
heroku addons:create heroku-redis:premium-0
```

4. **Deploy:**
```bash
git push heroku main
heroku run pnpm prisma migrate deploy
```

## Reverse Proxy Configuration

### Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://web:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://server:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io {
        proxy_pass http://server:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Apache

```apache
<VirtualHost *:443>
    ServerName yourdomain.com
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/yourdomain.com/cert.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/yourdomain.com/privkey.pem
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    ProxyPass /api http://localhost:3001/api
    ProxyPassReverse /api http://localhost:3001/api
    
    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://localhost:3001/$1" [P,L]
</VirtualHost>
```

## SSL/TLS Configuration

### Using Let's Encrypt with Certbot

```bash
# Install Certbot
apt-get update
apt-get install certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d yourdomain.com -d api.yourdomain.com

# Auto-renewal
certbot renew --dry-run
```

### Using Cloudflare

1. Add your domain to Cloudflare
2. Enable "Full (strict)" SSL/TLS mode
3. Create Origin Certificate
4. Configure your server to use the Origin Certificate

## Database Considerations

### Backup Strategy

```bash
# PostgreSQL backup script
#!/bin/bash
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="webhookproxy"

pg_dump -h localhost -U webhookproxy -d $DB_NAME | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

### High Availability

Consider using:
- PostgreSQL streaming replication
- pgBouncer for connection pooling
- Redis Sentinel for Redis HA

## Monitoring

### Health Checks

```bash
# Simple health check
curl https://api.yourdomain.com/health

# Detailed health check
curl https://api.yourdomain.com/health/detailed
```

### Recommended Monitoring Tools

1. **Application Monitoring:**
   - New Relic
   - Datadog
   - Sentry (for error tracking)

2. **Infrastructure Monitoring:**
   - Prometheus + Grafana
   - CloudWatch (AWS)
   - Stackdriver (GCP)

3. **Uptime Monitoring:**
   - UptimeRobot
   - Pingdom
   - StatusCake

### Example Prometheus Configuration

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'webhook-proxy'
    static_configs:
      - targets: ['server:3001']
    metrics_path: '/metrics'
```

## Security Best Practices

1. **Environment Variables:**
   - Never commit secrets to version control
   - Use secret management services (AWS Secrets Manager, HashiCorp Vault)

2. **Network Security:**
   - Use private networks for database connections
   - Implement firewall rules
   - Enable DDoS protection

3. **Updates:**
   - Regularly update dependencies
   - Apply security patches promptly
   - Monitor security advisories

4. **Monitoring:**
   - Set up alerts for suspicious activity
   - Monitor rate limit violations
   - Track failed authentication attempts