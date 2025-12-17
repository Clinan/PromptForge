# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

WORKDIR /app

# 使用阿里云 npm 镜像（npmmirror）
RUN npm config set registry https://registry.npmmirror.com \
  && corepack enable

COPY package.json pnpm-lock.yaml ./

# 按要求使用 pnpm i（-i 参数的习惯写法）
RUN pnpm i --frozen-lockfile

COPY . .
RUN pnpm run build


FROM nginx:1.27-alpine AS runner

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

