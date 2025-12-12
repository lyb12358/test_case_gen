FROM node:18-alpine AS base
WORKDIR /app

# 配置 npm 国内镜像源
RUN npm config set registry https://registry.npmmirror.com

FROM base as deps
COPY package*.json ./
RUN npm cache clean --force && npm ci --legacy-peer-deps

FROM base as builder
# 硬编码相对路径 API 地址（支持外网访问）
ENV VITE_API_BASE_URL=/api
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base as runner
RUN npm install -g serve
COPY --from=builder /app/dist ./
CMD ["serve", "-l", "5173"]
