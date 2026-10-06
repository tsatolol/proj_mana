output "projects" {
  description = "Project ID and number per environment."
  value = {
    for env, project in google_project.env : env => {
      project_id     = project.project_id
      project_number = project.number
    }
  }
}

output "app_urls" {
  description = "Cloud Run URL per environment (use it for the OAuth redirect URI)."
  value = {
    for env, project in google_project.env :
    env => "https://proj-mana-${project.number}.${var.region}.run.app"
  }
}

output "oauth_redirect_uris" {
  description = "Add to the Google OAuth client's authorized redirect URIs."
  value = {
    for env, project in google_project.env :
    env => "https://proj-mana-${project.number}.${var.region}.run.app/api/auth/callback/google"
  }
}

output "backend_configs" {
  description = "Contents of envs/<env>/backend.hcl."
  value = {
    for env, bucket in google_storage_bucket.tfstate : env => "bucket = \"${bucket.name}\"\n"
  }
}
