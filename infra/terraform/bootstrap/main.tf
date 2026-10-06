# Creates what has to exist before an environment (envs/<env>) can be applied:
# the GCP project with billing, the APIs Terraform itself needs, and the bucket
# that stores the environment's Terraform state.

resource "google_project" "env" {
  for_each = var.environments

  project_id      = each.value.project_id
  name            = each.value.name
  org_id          = var.org_id
  billing_account = var.billing_account
  labels = {
    app = "proj-mana"
    env = each.key
  }

  # Never delete a whole environment by accident (`terraform destroy` fails).
  deletion_policy = "PREVENT"
}

locals {
  # APIs needed before envs/<env> can run; that configuration enables the rest.
  base_services = [
    "cloudresourcemanager.googleapis.com",
    "serviceusage.googleapis.com",
    "storage.googleapis.com",
  ]

  project_services = {
    for pair in setproduct(keys(var.environments), local.base_services) :
    "${pair[0]}/${pair[1]}" => { env = pair[0], service = pair[1] }
  }
}

resource "google_project_service" "base" {
  for_each = local.project_services

  project = google_project.env[each.value.env].project_id
  service = each.value.service
}

resource "google_storage_bucket" "tfstate" {
  for_each = var.environments

  project  = google_project.env[each.key].project_id
  name     = "${each.value.project_id}-tfstate"
  location = var.region
  labels = {
    app = "proj-mana"
    env = each.key
  }

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  # State history for recovery; keep the 20 most recent old versions.
  versioning {
    enabled = true
  }
  lifecycle_rule {
    condition {
      num_newer_versions = 20
      with_state         = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.base]
}
