locals {
  cloudsql_mount_path = "/cloudsql"

  secret_env = {
    DATABASE_URL       = google_secret_manager_secret.this["database-url"].secret_id
    AUTH_SECRET        = google_secret_manager_secret.this["auth-secret"].secret_id
    AUTH_GOOGLE_SECRET = google_secret_manager_secret.this["auth-google-secret"].secret_id
  }

  plain_env = {
    AUTH_URL              = local.app_url
    AUTH_GOOGLE_ID        = var.google_oauth_client_id
    ALLOWED_EMAIL_DOMAINS = var.allowed_email_domains
    INITIAL_ADMIN_EMAIL   = var.initial_admin_email
    GCS_BUCKET            = google_storage_bucket.attachments.name
    MAX_UPLOAD_BYTES      = tostring(var.max_upload_bytes)
  }
}

resource "google_cloud_run_v2_service" "app" {
  project             = var.project_id
  name                = var.service_name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = var.deletion_protection
  labels              = local.labels

  # The app is public and handles authentication itself (Auth.js), so skip the
  # Cloud Run invoker IAM check instead of granting roles/run.invoker to allUsers.
  invoker_iam_disabled = true

  template {
    service_account                  = google_service_account.app.email
    max_instance_request_concurrency = 80

    scaling {
      min_instance_count = var.run_min_instances
      max_instance_count = var.run_max_instances
    }

    containers {
      image = local.placeholder_image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = var.run_cpu
          memory = var.run_memory
        }
        cpu_idle = true
      }

      dynamic "env" {
        for_each = local.plain_env
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = local.secret_env
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = local.cloudsql_mount_path
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.main.connection_name]
      }
    }
  }

  lifecycle {
    # GitHub Actions deploys new images with gcloud; don't roll them back.
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
    ]
  }

  depends_on = [
    google_project_iam_member.app_cloudsql_client,
    google_secret_manager_secret_iam_member.app,
    google_secret_manager_secret_version.database_url,
    google_secret_manager_secret_version.auth_secret,
    google_secret_manager_secret_version.auth_google_secret,
  ]
}

# Runs `prisma migrate deploy` before each deployment (Dockerfile `migrate` target).
resource "google_cloud_run_v2_job" "migrate" {
  project             = var.project_id
  name                = "${var.service_name}-migrate"
  location            = var.region
  deletion_protection = var.deletion_protection
  labels              = local.labels

  template {
    task_count = 1

    template {
      service_account = google_service_account.migrate.email
      max_retries     = 0
      timeout         = "600s"

      containers {
        image = local.placeholder_image

        env {
          name = "DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = local.secret_env.DATABASE_URL
              version = "latest"
            }
          }
        }

        volume_mounts {
          name       = "cloudsql"
          mount_path = local.cloudsql_mount_path
        }
      }

      volumes {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [google_sql_database_instance.main.connection_name]
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
      client,
      client_version,
    ]
  }

  depends_on = [
    google_project_iam_member.migrate_cloudsql_client,
    google_secret_manager_secret_iam_member.migrate_database_url,
    google_secret_manager_secret_version.database_url,
  ]
}
