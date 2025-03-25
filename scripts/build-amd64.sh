#!/bin/bash

# 脚本用于构建AMD64架构的Docker镜像
# 适用于在任何架构的机器上构建AMD64镜像

set -e

# 脚本路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 切换到项目根目录
cd "$PROJECT_ROOT"

# 确保安装了zx
if ! command -v zx &> /dev/null; then
    echo "正在安装zx..."
    npm install -g zx
fi

# 确保设置PNPM_HOME
if [ -z "$PNPM_HOME" ]; then
    echo "设置PNPM_HOME环境变量..."
    export PNPM_HOME="$HOME/.local/share/pnpm"
    export PATH="$PNPM_HOME:$PATH"
fi

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "错误: Docker未安装，请先安装Docker"
    exit 1
fi

# 构建镜像
echo "开始构建AMD64架构的Teable镜像..."

# 使用Docker Buildx构建
if command -v docker-buildx &> /dev/null || docker buildx version &> /dev/null; then
    echo "使用Docker Buildx构建多架构镜像..."
    
    # 确保buildx设置正确
    docker buildx inspect mybuilder &> /dev/null || docker buildx create --name mybuilder --use
    
    echo "构建teable AMD64镜像..."
    docker buildx build --platform=linux/amd64 \
        -t teableio/teable:latest-amd64 \
        -f dockers/teable/Dockerfile \
        --load .
    
    echo "构建teable-db-migrate AMD64镜像..."
    docker buildx build --platform=linux/amd64 \
        -t teableio/teable-db-migrate:latest-amd64 \
        -f dockers/teable/Dockerfile.db-migrate \
        --load .
else
    echo "使用Makefile进行构建..."
    make build.app.amd64
    make build.db-migrate.amd64
fi

echo "AMD64镜像构建完成"
echo "镜像列表:"
docker images | grep teable

echo "你可以使用以下命令启动容器:"
echo "docker-compose -f <你的compose文件> up -d" 