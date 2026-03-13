#!/usr/bin/env bash
set -euo pipefail

IMAGE="kampretcode/wargapos"
TAG="${1:-latest}"

echo "==> Building $IMAGE:$TAG ..."
docker build -t "$IMAGE:$TAG" .

echo "==> Pushing $IMAGE:$TAG ..."
docker push "$IMAGE:$TAG"

# If a specific tag was given, also update :latest
if [ "$TAG" != "latest" ]; then
  echo "==> Tagging as $IMAGE:latest ..."
  docker tag "$IMAGE:$TAG" "$IMAGE:latest"
  docker push "$IMAGE:latest"
fi

echo "==> Done: $IMAGE:$TAG"
