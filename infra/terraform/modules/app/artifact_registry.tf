resource "google_artifact_registry_repository" "app" {
  project       = var.project_id
  location      = var.region
  repository_id = "proj-mana"
  description   = "Container images for proj_mana (app and migrate)."
  format        = "DOCKER"
  labels        = local.labels

  cleanup_policy_dry_run = false

  # Keep the 10 most recent versions of each image; delete anything older than 30 days.
  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }

  cleanup_policies {
    id     = "delete-old"
    action = "DELETE"
    condition {
      tag_state  = "ANY"
      older_than = "2592000s"
    }
  }

  depends_on = [google_project_service.this]
}
