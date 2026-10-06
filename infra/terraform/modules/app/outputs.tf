output "app_url" {
  description = "Public URL of the app (AUTH_URL)."
  value       = local.app_url
}

output "oauth_redirect_uri" {
  description = "Add this to the Google OAuth client's authorized redirect URIs."
  value       = "${local.app_url}/api/auth/callback/google"
}

output "artifact_registry_repository" {
  description = "Image repository; images are <this>/app and <this>/migrate."
  value       = "${local.artifact_registry_host}/${var.project_id}/${google_artifact_registry_repository.app.repository_id}"
}

output "cloud_run_service" {
  value = google_cloud_run_v2_service.app.name
}

output "cloud_run_migrate_job" {
  value = google_cloud_run_v2_job.migrate.name
}

output "cloud_sql_connection_name" {
  value = google_sql_database_instance.main.connection_name
}

output "attachments_bucket" {
  value = google_storage_bucket.attachments.name
}

output "workload_identity_provider" {
  description = "GitHub variable GCP_WORKLOAD_IDENTITY_PROVIDER."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "deployer_service_account" {
  description = "GitHub variable GCP_DEPLOYER_SERVICE_ACCOUNT."
  value       = google_service_account.deployer.email
}
