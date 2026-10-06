# Attachments (CLAUDE.md §3.7). Private bucket; the browser uploads / downloads
# directly with short-lived signed URLs issued by the app.
resource "google_storage_bucket" "attachments" {
  project  = var.project_id
  name     = "${var.project_id}-attachments"
  location = var.region
  labels   = local.labels

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = !var.deletion_protection

  cors {
    origin          = [local.app_url]
    method          = ["GET", "HEAD", "PUT"]
    response_header = ["Content-Type", "Content-Disposition"]
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.this]
}

resource "google_storage_bucket_iam_member" "app_object_admin" {
  bucket = google_storage_bucket.attachments.name
  role   = "roles/storage.objectAdmin"
  member = google_service_account.app.member
}
