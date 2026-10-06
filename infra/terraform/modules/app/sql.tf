resource "google_sql_database_instance" "main" {
  project             = var.project_id
  name                = "proj-mana-${var.env}"
  region              = var.region
  database_version    = "POSTGRES_17"
  deletion_protection = var.deletion_protection

  settings {
    edition           = "ENTERPRISE"
    tier              = var.db_tier
    availability_type = var.db_availability_type
    disk_type         = "PD_SSD"
    disk_size         = var.db_disk_size_gb
    disk_autoresize   = true
    user_labels       = local.labels

    deletion_protection_enabled = var.deletion_protection

    # Public IP without authorized networks: connections must go through the
    # Cloud SQL connector (Cloud Run's built-in connector or the Auth Proxy).
    connector_enforcement = "REQUIRED"
    ip_configuration {
      ipv4_enabled = true
      ssl_mode     = "ENCRYPTED_ONLY"
    }

    backup_configuration {
      enabled                        = var.db_backup_enabled
      point_in_time_recovery_enabled = var.db_point_in_time_recovery_enabled
      start_time                     = "18:00" # UTC = 03:00 JST
      backup_retention_settings {
        retained_backups = var.db_backup_retained_count
      }
    }

    maintenance_window {
      day  = 7  # Sunday
      hour = 19 # UTC = Monday 04:00 JST
    }
  }

  depends_on = [google_project_service.this]
}

resource "google_sql_database" "app" {
  project  = var.project_id
  instance = google_sql_database_instance.main.name
  name     = "proj_mana"
}

# Generated during apply and written only to write-only arguments, so the
# password never appears in the Terraform state.
ephemeral "random_password" "db" {
  length  = 32
  special = false
}

resource "google_sql_user" "app" {
  project             = var.project_id
  instance            = google_sql_database_instance.main.name
  name                = "proj_mana"
  password_wo         = ephemeral.random_password.db.result
  password_wo_version = var.db_password_version
}
