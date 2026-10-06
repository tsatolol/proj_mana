# Secret values are written through write-only arguments (`secret_data_wo`), so
# they are sent to Secret Manager but never stored in the Terraform state.
# Bump the matching *_version variable to write a new value.

locals {
  secrets = {
    database-url       = "DATABASE_URL"
    auth-secret        = "AUTH_SECRET"
    auth-google-secret = "AUTH_GOOGLE_SECRET"
  }
}

resource "google_secret_manager_secret" "this" {
  for_each = local.secrets

  project   = var.project_id
  secret_id = each.key
  labels    = local.labels

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  depends_on = [google_project_service.this]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret = google_secret_manager_secret.this["database-url"].id
  # Cloud Run mounts the instance's Unix socket under /cloudsql.
  secret_data_wo = format(
    "postgresql://%s:%s@localhost/%s?host=/cloudsql/%s",
    google_sql_user.app.name,
    ephemeral.random_password.db.result,
    google_sql_database.app.name,
    google_sql_database_instance.main.connection_name,
  )
  secret_data_wo_version = var.db_password_version
}

ephemeral "random_password" "auth_secret" {
  length  = 48
  special = false
}

resource "google_secret_manager_secret_version" "auth_secret" {
  secret                 = google_secret_manager_secret.this["auth-secret"].id
  secret_data_wo         = ephemeral.random_password.auth_secret.result
  secret_data_wo_version = var.auth_secret_version
}

resource "google_secret_manager_secret_version" "auth_google_secret" {
  secret                 = google_secret_manager_secret.this["auth-google-secret"].id
  secret_data_wo         = var.google_oauth_client_secret
  secret_data_wo_version = var.google_oauth_client_secret_version
}

resource "google_secret_manager_secret_iam_member" "app" {
  for_each = local.secrets

  project   = var.project_id
  secret_id = google_secret_manager_secret.this[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.app.member
}

resource "google_secret_manager_secret_iam_member" "migrate_database_url" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.this["database-url"].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.migrate.member
}
