# Multi-stage Dockerfile

# 1) Build stage - install deps
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --only=production
COPY . .

# 2) Final stage - slim runtime
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app .
EXPOSE 3000
USER node
CMD ["node", "index.js"]
