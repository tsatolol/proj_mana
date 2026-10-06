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
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }

  # The state bucket is created by infra/terraform/bootstrap and passed with
  # `terraform init -backend-config=backend.hcl`.
  backend "gcs" {
    prefix = "envs/stg"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region

  # Charge API quota to this project rather than to the caller's ADC quota
  # project, so personal credentials work without extra gcloud setup.
  user_project_override = true
  billing_project       = var.project_id
}

# Authenticates with the GITHUB_TOKEN environment variable (fine-grained token
# for tsatolol/proj_mana with "Variables: Read and write").
provider "github" {
  owner = "tsatolol"
}
