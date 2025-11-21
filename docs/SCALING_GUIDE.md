# Scaling Guide - JobNaut

## Table of Contents
1. [Horizontal Scaling Strategy](#horizontal-scaling-strategy)
2. [Database Scaling](#database-scaling)
3. [Redis Clustering](#redis-clustering)
4. [Load Balancer Configuration](#load-balancer-configuration)
5. [CDN Setup](#cdn-setup)
6. [Auto-Scaling Policies](#auto-scaling-policies)
7. [Performance Benchmarks](#performance-benchmarks)

---

## Horizontal Scaling Strategy

### Current Architecture

```
┌─────────────┐
│  CDN/WAF    │
└──────┬──────┘
       │
┌──────▼──────┐
│   Nginx     │  Load Balancer
└──────┬──────┘
       │
  ┌────┴────┬─────────┬─────────┐
  │         │         │         │
┌─▼─┐    ┌──▼─┐   ┌──▼─┐    ┌──▼─┐
│App│    │App │   │App │    │App │  Backend Instances
└─┬─┘    └──┬─┘   └──┬─┘    └──┬─┘
  │         │         │         │
  └────┬────┴─────────┴─────────┘
       │
  ┌────▼────┐
  │ Redis   │  Cache Layer
  └────┬────┘
       │
  ┌────▼────┐
  │Postgres │  Database
  │ Primary │
  └────┬────┘
       │
  ┌────▼────┐
  │Postgres │  Read Replicas
  │ Replica │
  └─────────┘
```

### Scaling Targets

**Current Capacity (Single Instance):**
- Concurrent Users: ~500
- Requests/Second: ~100
- Response Time: <200ms (p95)

**Target Capacity:**
- Concurrent Users: 10,000+
- Requests/Second: 2,000+
- Response Time: <300ms (p95)

### Horizontal Scaling Steps

#### 1. Application Layer Scaling

**Docker Compose Scaling:**

```bash
# Scale backend instances
docker-compose up -d --scale backend=4

# Verify all instances running
docker-compose ps

# Check load distribution
for i in {1..10}; do
  curl -s http://localhost:3000/api/health | jq -r '.hostname'
done
```

**Kubernetes Deployment:**

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jobnaut-backend
spec:
  replicas: 4
  selector:
    matchLabels:
      app: jobnaut-backend
  template:
    metadata:
      labels:
        app: jobnaut-backend
    spec:
      containers:
      - name: backend
        image: jobnaut/backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

**Deploy to Kubernetes:**

```bash
# Apply deployment
kubectl apply -f k8s/backend-deployment.yaml

# Scale replicas
kubectl scale deployment jobnaut-backend --replicas=8

# Check pod status
kubectl get pods -l app=jobnaut-backend

# Monitor resource usage
kubectl top pods -l app=jobnaut-backend
```

#### 2. Frontend Scaling

**Static Asset Distribution:**

```yaml
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jobnaut-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: jobnaut-frontend
  template:
    metadata:
      labels:
        app: jobnaut-frontend
    spec:
      containers:
      - name: frontend
        image: jobnaut/frontend:latest
        ports:
        - containerPort: 3001
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
```

**CDN Configuration:**

```javascript
// frontend/nuxt.config.ts
export default defineNuxtConfig({
  app: {
    cdnURL: process.env.CDN_URL || 'https://cdn.jobnaut.com'
  },
  vite: {
    build: {
      assetsInlineLimit: 4096,
      rollupOptions: {
        output: {
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router'],
            'ui-vendor': ['@headlessui/vue', '@heroicons/vue']
          }
        }
      }
    }
  }
})
```

---

## Database Scaling

### Read Replica Configuration

#### 1. PostgreSQL Streaming Replication

**Primary Server Configuration:**

```bash
# postgresql.conf on primary
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
hot_standby = on
```

**Create Replication User:**

```sql
-- On primary database
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'secure_password';
SELECT pg_create_physical_replication_slot('replica_1_slot');
```

**Replica Server Setup:**

```bash
# Stop replica if running
sudo systemctl stop postgresql

# Remove existing data
sudo rm -rf /var/lib/postgresql/14/main/*

# Base backup from primary
sudo -u postgres pg_basebackup -h primary.db.internal -D /var/lib/postgresql/14/main -U replicator -v -P -W

# Create standby.signal
sudo -u postgres touch /var/lib/postgresql/14/main/standby.signal

# Configure replication
cat >> /var/lib/postgresql/14/main/postgresql.auto.conf << EOF
primary_conninfo = 'host=primary.db.internal port=5432 user=replicator password=secure_password'
primary_slot_name = 'replica_1_slot'
EOF

# Start replica
sudo systemctl start postgresql
```

#### 2. Application Read/Write Splitting

**Prisma Configuration:**

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client'

// Primary database for writes
export const dbWrite = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

// Read replica for queries
export const dbRead = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_REPLICA_URL
    }
  }
})

// Smart query router
export class DatabaseRouter {
  static async query<T>(operation: (db: PrismaClient) => Promise<T>): Promise<T> {
    return operation(dbRead)
  }

  static async mutate<T>(operation: (db: PrismaClient) => Promise<T>): Promise<T> {
    return operation(dbWrite)
  }
}

// Usage example
export async function getJobs() {
  return DatabaseRouter.query(db =>
    db.job.findMany({ where: { active: true } })
  )
}

export async function createJob(data: JobData) {
  return DatabaseRouter.mutate(db =>
    db.job.create({ data })
  )
}
```

**Connection Pooling with PgBouncer:**

```ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
jobnaut_write = host=primary.db.internal port=5432 dbname=jobnaut
jobnaut_read = host=replica.db.internal port=5432 dbname=jobnaut

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 10
reserve_pool_size = 5
reserve_pool_timeout = 5
max_db_connections = 50
max_user_connections = 50
```

**Update Environment Variables:**

```bash
# .env
DATABASE_URL="postgresql://user:pass@localhost:6432/jobnaut_write"
DATABASE_REPLICA_URL="postgresql://user:pass@localhost:6432/jobnaut_read"
```

#### 3. Database Sharding Strategy

**Shard by User ID:**

```typescript
// src/lib/sharding.ts
export class DatabaseSharding {
  private static readonly SHARD_COUNT = 4
  private static shards: PrismaClient[] = []

  static initialize() {
    for (let i = 0; i < this.SHARD_COUNT; i++) {
      this.shards[i] = new PrismaClient({
        datasources: {
          db: {
            url: process.env[`DATABASE_SHARD_${i}_URL`]
          }
        }
      })
    }
  }

  static getShardForUser(userId: string): PrismaClient {
    const hash = this.hashUserId(userId)
    const shardIndex = hash % this.SHARD_COUNT
    return this.shards[shardIndex]
  }

  private static hashUserId(userId: string): number {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i)
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  static async getUserData(userId: string) {
    const shard = this.getShardForUser(userId)
    return shard.user.findUnique({ where: { id: userId } })
  }

  static async createUserData(userId: string, data: any) {
    const shard = this.getShardForUser(userId)
    return shard.user.create({ data: { id: userId, ...data } })
  }
}
```

#### 4. Database Performance Optimization

**Index Optimization:**

```sql
-- Create indexes for common queries
CREATE INDEX CONCURRENTLY idx_jobs_location ON jobs(location) WHERE active = true;
CREATE INDEX CONCURRENTLY idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX CONCURRENTLY idx_jobs_salary ON jobs(salary_min, salary_max) WHERE active = true;
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_applications_user_job ON applications(user_id, job_id);

-- GIN index for full-text search
CREATE INDEX CONCURRENTLY idx_jobs_search ON jobs USING GIN(to_tsvector('english', title || ' ' || description));

-- Partial indexes for specific queries
CREATE INDEX CONCURRENTLY idx_jobs_remote ON jobs(id) WHERE remote = true;
CREATE INDEX CONCURRENTLY idx_jobs_featured ON jobs(created_at DESC) WHERE featured = true;
```

**Query Optimization:**

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT j.*, c.name as company_name
FROM jobs j
JOIN companies c ON j.company_id = c.id
WHERE j.active = true
  AND j.location = 'Remote'
  AND j.created_at > NOW() - INTERVAL '30 days'
ORDER BY j.created_at DESC
LIMIT 20;

-- Add missing indexes based on EXPLAIN output
-- Enable query result caching in application layer
```

---

## Redis Clustering

### Redis Sentinel for High Availability

**Sentinel Configuration:**

```bash
# redis-sentinel.conf
port 26379
sentinel monitor jobnaut-master 192.168.1.10 6379 2
sentinel down-after-milliseconds jobnaut-master 5000
sentinel parallel-syncs jobnaut-master 1
sentinel failover-timeout jobnaut-master 10000
```

**Docker Compose with Sentinel:**

```yaml
# docker-compose.redis.yml
version: '3.8'

services:
  redis-master:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-master-data:/data
    networks:
      - redis-network

  redis-replica-1:
    image: redis:7-alpine
    command: redis-server --slaveof redis-master 6379
    depends_on:
      - redis-master
    networks:
      - redis-network

  redis-replica-2:
    image: redis:7-alpine
    command: redis-server --slaveof redis-master 6379
    depends_on:
      - redis-master
    networks:
      - redis-network

  sentinel-1:
    image: redis:7-alpine
    command: redis-sentinel /usr/local/etc/redis/sentinel.conf
    volumes:
      - ./redis-sentinel.conf:/usr/local/etc/redis/sentinel.conf
    depends_on:
      - redis-master
    networks:
      - redis-network

  sentinel-2:
    image: redis:7-alpine
    command: redis-sentinel /usr/local/etc/redis/sentinel.conf
    volumes:
      - ./redis-sentinel.conf:/usr/local/etc/redis/sentinel.conf
    depends_on:
      - redis-master
    networks:
      - redis-network

  sentinel-3:
    image: redis:7-alpine
    command: redis-sentinel /usr/local/etc/redis/sentinel.conf
    volumes:
      - ./redis-sentinel.conf:/usr/local/etc/redis/sentinel.conf
    depends_on:
      - redis-master
    networks:
      - redis-network

networks:
  redis-network:
    driver: bridge

volumes:
  redis-master-data:
```

**Application Configuration with Sentinel:**

```typescript
// src/lib/redis.ts
import Redis from 'ioredis'

const sentinels = [
  { host: 'sentinel-1', port: 26379 },
  { host: 'sentinel-2', port: 26379 },
  { host: 'sentinel-3', port: 26379 }
]

export const redis = new Redis({
  sentinels,
  name: 'jobnaut-master',
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY'
    if (err.message.includes(targetError)) {
      return true
    }
    return false
  }
})

redis.on('error', (err) => {
  console.error('Redis error:', err)
})

redis.on('+switch-master', (data) => {
  console.log('Redis master switched:', data)
})
```

### Redis Cluster Mode

**Cluster Configuration:**

```bash
# redis-cluster.conf
port 7000
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
appendonly yes
```

**Create Redis Cluster:**

```bash
# Create 6 nodes (3 masters, 3 replicas)
for port in {7000..7005}; do
  mkdir -p redis-cluster/${port}
  cat > redis-cluster/${port}/redis.conf << EOF
port ${port}
cluster-enabled yes
cluster-config-file nodes-${port}.conf
cluster-node-timeout 5000
appendonly yes
dir /data
EOF
done

# Start all nodes
docker-compose -f docker-compose.redis-cluster.yml up -d

# Create cluster
redis-cli --cluster create \
  127.0.0.1:7000 \
  127.0.0.1:7001 \
  127.0.0.1:7002 \
  127.0.0.1:7003 \
  127.0.0.1:7004 \
  127.0.0.1:7005 \
  --cluster-replicas 1
```

**Application with Redis Cluster:**

```typescript
// src/lib/redis-cluster.ts
import { Cluster } from 'ioredis'

export const redisCluster = new Cluster([
  { port: 7000, host: 'localhost' },
  { port: 7001, host: 'localhost' },
  { port: 7002, host: 'localhost' },
  { port: 7003, host: 'localhost' },
  { port: 7004, host: 'localhost' },
  { port: 7005, host: 'localhost' }
], {
  redisOptions: {
    password: process.env.REDIS_PASSWORD
  },
  clusterRetryStrategy: (times) => {
    return Math.min(100 * times, 2000)
  }
})

// Usage remains the same as single Redis instance
export async function cacheJob(jobId: string, data: any) {
  await redisCluster.setex(`job:${jobId}`, 3600, JSON.stringify(data))
}
```

---

## Load Balancer Configuration

### Nginx Load Balancer

**Configuration:**

```nginx
# /etc/nginx/nginx.conf
upstream jobnaut_backend {
    least_conn;

    server backend-1:3000 max_fails=3 fail_timeout=30s;
    server backend-2:3000 max_fails=3 fail_timeout=30s;
    server backend-3:3000 max_fails=3 fail_timeout=30s;
    server backend-4:3000 max_fails=3 fail_timeout=30s;

    keepalive 32;
}

upstream jobnaut_frontend {
    server frontend-1:3001;
    server frontend-2:3001;
    server frontend-3:3001;

    keepalive 16;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
limit_conn_zone $binary_remote_addr zone=addr_limit:10m;

server {
    listen 80;
    server_name jobnaut.com www.jobnaut.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name jobnaut.com www.jobnaut.com;

    ssl_certificate /etc/nginx/ssl/jobnaut.crt;
    ssl_certificate_key /etc/nginx/ssl/jobnaut.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API endpoints
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        limit_conn addr_limit 10;

        proxy_pass http://jobnaut_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Health check
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
    }

    # Frontend
    location / {
        proxy_pass http://jobnaut_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Cache static assets
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### AWS Application Load Balancer

**Terraform Configuration:**

```hcl
# terraform/alb.tf
resource "aws_lb" "jobnaut" {
  name               = "jobnaut-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = true
  enable_http2              = true
  enable_cross_zone_load_balancing = true

  tags = {
    Name        = "jobnaut-alb"
    Environment = "production"
  }
}

resource "aws_lb_target_group" "backend" {
  name     = "jobnaut-backend-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/api/health"
    matcher             = "200"
  }

  deregistration_delay = 30

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.jobnaut.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.jobnaut.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.jobnaut.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "backend" {
  name                = "jobnaut-backend-asg"
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.backend.arn]
  health_check_type   = "ELB"
  health_check_grace_period = 300

  min_size         = 2
  max_size         = 10
  desired_capacity = 4

  launch_template {
    id      = aws_launch_template.backend.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "jobnaut-backend"
    propagate_at_launch = true
  }
}
```

---

## CDN Setup

### CloudFlare Configuration

**DNS Settings:**

```bash
# A Records
@ -> ALB IP (proxied through CloudFlare)
www -> ALB IP (proxied through CloudFlare)
api -> ALB IP (proxied through CloudFlare)

# CNAME Records
cdn -> cdn.jobnaut.com
static -> static.jobnaut.com
```

**Page Rules:**

```
1. Cache Everything
   URL: static.jobnaut.com/*
   Settings:
     - Cache Level: Cache Everything
     - Edge Cache TTL: 1 month
     - Browser Cache TTL: 1 month

2. API No Cache
   URL: api.jobnaut.com/*
   Settings:
     - Cache Level: Bypass

3. Frontend Selective Cache
   URL: jobnaut.com/*
   Settings:
     - Cache Level: Standard
     - Browser Cache TTL: 4 hours
```

**Worker for Dynamic Content:**

```javascript
// cloudflare-worker.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // Cache static assets
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$/)) {
    const cache = caches.default
    let response = await cache.match(request)

    if (!response) {
      response = await fetch(request)
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')

      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      })

      event.waitUntil(cache.put(request, response.clone()))
    }

    return response
  }

  // Pass through other requests
  return fetch(request)
}
```

### AWS CloudFront

**Terraform Configuration:**

```hcl
# terraform/cloudfront.tf
resource "aws_cloudfront_distribution" "jobnaut" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "JobNaut CDN"
  default_root_object = "index.html"
  price_class         = "PriceClass_All"

  aliases = ["jobnaut.com", "www.jobnaut.com"]

  origin {
    domain_name = aws_lb.jobnaut.dns_name
    origin_id   = "jobnaut-alb"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  origin {
    domain_name = aws_s3_bucket.static.bucket_regional_domain_name
    origin_id   = "jobnaut-s3"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.jobnaut.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "jobnaut-alb"

    forwarded_values {
      query_string = true
      headers      = ["Host", "Authorization"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  ordered_cache_behavior {
    path_pattern     = "/static/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "jobnaut-s3"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 2592000
    max_ttl                = 31536000
    compress               = true
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.jobnaut.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}
```

---

## Auto-Scaling Policies

### CPU-Based Scaling

**AWS Auto Scaling:**

```hcl
# terraform/autoscaling.tf
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "jobnaut-scale-up"
  scaling_adjustment     = 2
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.backend.name
}

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "jobnaut-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = 70

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.backend.name
  }

  alarm_actions = [aws_autoscaling_policy.scale_up.arn]
}

resource "aws_autoscaling_policy" "scale_down" {
  name                   = "jobnaut-scale-down"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.backend.name
}

resource "aws_cloudwatch_metric_alarm" "cpu_low" {
  alarm_name          = "jobnaut-cpu-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = 30

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.backend.name
  }

  alarm_actions = [aws_autoscaling_policy.scale_down.arn]
}
```

### Request-Based Scaling

```hcl
resource "aws_autoscaling_policy" "scale_by_requests" {
  name                   = "jobnaut-scale-by-requests"
  policy_type            = "TargetTrackingScaling"
  autoscaling_group_name = aws_autoscaling_group.backend.name

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.jobnaut.arn_suffix}/${aws_lb_target_group.backend.arn_suffix}"
    }

    target_value = 1000.0
  }
}
```

### Kubernetes Horizontal Pod Autoscaler

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: jobnaut-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: jobnaut-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Max
```

---

## Performance Benchmarks

### Load Testing Scenarios

**Single Instance Baseline:**

```bash
# Install k6
npm install -g k6

# Run baseline test
k6 run --vus 10 --duration 60s tests/load-testing/baseline.js
```

**Expected Results:**
- Concurrent Users: 10
- Avg Response Time: ~150ms
- Requests/Second: ~65
- Error Rate: <1%

**Scaled Environment:**

```bash
# Test with 1000 concurrent users
k6 run --vus 1000 --duration 300s tests/load-testing/stress.js
```

**Target Results:**
- Concurrent Users: 1000
- Avg Response Time: <300ms
- Requests/Second: 2000+
- Error Rate: <0.1%

### Monitoring Metrics

**Key Performance Indicators:**

```yaml
Response Time:
  - p50: <100ms
  - p95: <300ms
  - p99: <500ms

Throughput:
  - Minimum: 1000 req/s
  - Target: 2000 req/s
  - Peak: 5000 req/s

Error Rate:
  - Target: <0.1%
  - Alert: >1%
  - Critical: >5%

Resource Utilization:
  - CPU: <70% average
  - Memory: <80% average
  - Disk I/O: <80% capacity
  - Network: <70% bandwidth

Database:
  - Connection Pool: <80% utilization
  - Query Time: <50ms average
  - Replication Lag: <1 second

Cache:
  - Hit Rate: >90%
  - Memory Usage: <85%
  - Latency: <5ms
```

---

## References

- [Operations Runbook](OPERATIONS_RUNBOOK.md)
- [Monitoring Setup](MONITORING.md)
- [Disaster Recovery](DISASTER_RECOVERY.md)
- [Cost Optimization](COST_OPTIMIZATION.md)

---

**Last Updated:** 2025-11-21
**Version:** 1.0
**Owner:** DevOps Team
