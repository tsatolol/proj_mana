terraform {
  required_version = ">= 1.11"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.5"
    }
  }

  # No backend here on purpose: the first apply runs with local state because the
  # state bucket does not exist yet. Afterwards copy backend.tf.example to
  # backend.tf and run `terraform init -migrate-state` (see infra/README.md).
}

provider "google" {
  region = var.region

  # Personal (ADC) credentials have no quota project, which the Service Usage API
  # rejects. With this, requests are charged to the project being configured.
  user_project_override = true
}
