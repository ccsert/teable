group "default" {
  targets = ["teable"]
}

group "amd64-only" {
  targets = ["teable-amd64", "teable-db-migrate-amd64"]
}

group "arm64-only" {
  targets = ["teable-arm64", "teable-db-migrate-arm64"]
}

variable "IMAGE_REGISTRY" {
  default = "docker.io"
}

variable "IMAGE_TAG" {
  default = "latest"
}

target "teable" {
  context = "."
  dockerfile = "dockers/teable/Dockerfile"
  platforms = ["linux/amd64", "linux/arm64"]
  tags = ["${IMAGE_REGISTRY}/teableio/teable:latest", "${IMAGE_REGISTRY}/teableio/teable:${IMAGE_TAG}"]
}

target "teable-db-migrate" {
  context = "."
  dockerfile = "dockers/teable/Dockerfile.db-migrate"
  platforms = ["linux/amd64", "linux/arm64"]
  tags = ["${IMAGE_REGISTRY}/teableio/teable-db-migrate:latest", "${IMAGE_REGISTRY}/teableio/teable-db-migrate:${IMAGE_TAG}"]
}

# AMD64 专用目标
target "teable-amd64" {
  context = "."
  dockerfile = "dockers/teable/Dockerfile"
  platforms = ["linux/amd64"]
  tags = ["${IMAGE_REGISTRY}/teableio/teable:latest-amd64", "${IMAGE_REGISTRY}/teableio/teable:${IMAGE_TAG}-amd64"]
}

target "teable-db-migrate-amd64" {
  context = "."
  dockerfile = "dockers/teable/Dockerfile.db-migrate"
  platforms = ["linux/amd64"]
  tags = ["${IMAGE_REGISTRY}/teableio/teable-db-migrate:latest-amd64", "${IMAGE_REGISTRY}/teableio/teable-db-migrate:${IMAGE_TAG}-amd64"]
}

# ARM64 专用目标
target "teable-arm64" {
  context = "."
  dockerfile = "dockers/teable/Dockerfile"
  platforms = ["linux/arm64"]
  tags = ["${IMAGE_REGISTRY}/teableio/teable:latest-arm64", "${IMAGE_REGISTRY}/teableio/teable:${IMAGE_TAG}-arm64"]
}

target "teable-db-migrate-arm64" {
  context = "."
  dockerfile = "dockers/teable/Dockerfile.db-migrate"
  platforms = ["linux/arm64"]
  tags = ["${IMAGE_REGISTRY}/teableio/teable-db-migrate:latest-arm64", "${IMAGE_REGISTRY}/teableio/teable-db-migrate:${IMAGE_TAG}-arm64"]
}