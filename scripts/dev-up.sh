#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env.docker ] || { cp .env.docker.example .env.docker; echo "Creado .env.docker: completá las contraseñas"; exit 1; }
docker compose --env-file .env.docker up -d postgres minio minio-init
docker compose --env-file .env.docker ps
