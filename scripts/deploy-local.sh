#!/usr/bin/env bash
set -euo pipefail

echo "[1/5] 安装依赖"
npm install

echo "[2/5] 生成 Prisma Client"
npm --prefix backend run prisma:generate

echo "[3/5] 执行数据库迁移与种子"
npm --prefix backend run prisma:migrate
npm --prefix backend run prisma:seed

echo "[4/5] 构建前后端"
npm --prefix backend run build
npm --prefix frontend run build

echo "[5/5] 启动 Docker 编排"
docker compose up -d --build

echo "本地部署完成："
echo "- 前端: http://localhost:3000"
echo "- 后端: http://localhost:3001/api"
