FROM node:18-alpine AS base
WORKDIR /app

# 配置 npm 国内镜像源
RUN npm config set registry https://registry.npmmirror.com

FROM base as deps
COPY package*.json ./
RUN npm cache clean --force && npm ci --legacy-peer-deps

FROM base as builder
# 生产环境不设置 API_BASE_URL，使用相对路径
# 在生产环境中，前端将使用 Nginx 代理，所以不需要硬编码 API 路径
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base as runner
RUN npm install -g serve
COPY --from=builder /app/dist ./
CMD ["serve", "-l", "5173", "--single"]
