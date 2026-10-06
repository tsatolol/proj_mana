terraform {
  required_version = ">= 1.11"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.5"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.9"
    }
  }

  # The state bucket is created by hand once (see infra/README.md) and passed with
  # `terraform init -backend-config=backend.hcl`.
  backend "gcs" {
    prefix = "envs/stg"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
