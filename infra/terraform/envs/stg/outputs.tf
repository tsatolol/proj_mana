output "app_url" {
  value = module.app.app_url
}

output "oauth_redirect_uri" {
  value = module.app.oauth_redirect_uri
}

output "artifact_registry_repository" {
  value = module.app.artifact_registry_repository
}

output "cloud_run_service" {
  value = module.app.cloud_run_service
}

output "cloud_run_migrate_job" {
  value = module.app.cloud_run_migrate_job
}

output "cloud_sql_connection_name" {
  value = module.app.cloud_sql_connection_name
}

output "attachments_bucket" {
  value = module.app.attachments_bucket
}

output "workload_identity_provider" {
  value = module.app.workload_identity_provider
}

output "deployer_service_account" {
  value = module.app.deployer_service_account
}
