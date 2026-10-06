module "app" {
  source = "../../modules/app"

  project_id = var.project_id
  region     = var.region
  env        = "stg"

  github_repository          = "tsatolol/proj_mana"
  github_repository_owner_id = "30972312"
  # stg deploys only from main.
  github_ref_condition = "assertion.ref == 'refs/heads/main'"

  # Minimal, disposable environment.
  db_tier                           = "db-f1-micro"
  db_availability_type              = "ZONAL"
  db_backup_enabled                 = false
  db_point_in_time_recovery_enabled = false
  run_min_instances                 = 0
  run_max_instances                 = 2
  deletion_protection               = false

  allowed_email_domains              = var.allowed_email_domains
  initial_admin_email                = var.initial_admin_email
  google_oauth_client_id             = var.google_oauth_client_id
  google_oauth_client_secret         = var.google_oauth_client_secret
  google_oauth_client_secret_version = var.google_oauth_client_secret_version
}
