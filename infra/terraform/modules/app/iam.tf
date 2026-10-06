# --- Service accounts --------------------------------------------------------

# Runtime identity of the Cloud Run service.
resource "google_service_account" "app" {
  project      = var.project_id
  account_id   = "proj-mana-app"
  display_name = "proj_mana Cloud Run service"
  depends_on   = [google_project_service.this]
}

# Runtime identity of the migration job (database access only).
resource "google_service_account" "migrate" {
  project      = var.project_id
  account_id   = "proj-mana-migrate"
  display_name = "proj_mana migration job"
  depends_on   = [google_project_service.this]
}

# Used by GitHub Actions to push images and deploy.
resource "google_service_account" "deployer" {
  project      = var.project_id
  account_id   = "proj-mana-deployer"
  display_name = "proj_mana GitHub Actions deployer"
  depends_on   = [google_project_service.this]
}

resource "google_project_iam_member" "app_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = google_service_account.app.member
}

resource "google_project_iam_member" "migrate_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = google_service_account.migrate.member
}

# Signed URLs for Cloud Storage are signed via the IAM Credentials API (signBlob)
# because Cloud Run has no private key; this needs Token Creator on itself.
resource "google_service_account_iam_member" "app_sign_blob" {
  service_account_id = google_service_account.app.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = google_service_account.app.member
}

# Deploy Cloud Run services and update / execute jobs.
resource "google_project_iam_member" "deployer_run_developer" {
  project = var.project_id
  role    = "roles/run.developer"
  member  = google_service_account.deployer.member
}

resource "google_artifact_registry_repository_iam_member" "deployer_writer" {
  project    = var.project_id
  location   = google_artifact_registry_repository.app.location
  repository = google_artifact_registry_repository.app.name
  role       = "roles/artifactregistry.writer"
  member     = google_service_account.deployer.member
}

# Deploying a revision that runs as another service account requires actAs on it.
resource "google_service_account_iam_member" "deployer_act_as" {
  for_each = {
    app     = google_service_account.app.name
    migrate = google_service_account.migrate.name
  }

  service_account_id = each.value
  role               = "roles/iam.serviceAccountUser"
  member             = google_service_account.deployer.member
}

# --- Workload Identity Federation for GitHub Actions ----------------------------
# GitHub's OIDC token is exchanged for the deployer service account; no keys exist.

resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github"
  display_name              = "GitHub Actions"
  depends_on                = [google_project_service.this]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-actions"
  display_name                       = "GitHub Actions OIDC"

  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.repository"       = "assertion.repository"
    "attribute.repository_owner" = "assertion.repository_owner"
    "attribute.ref"              = "assertion.ref"
  }

  # Only tokens from this repository (and owner ID) and the allowed refs are accepted.
  attribute_condition = join(" && ", [
    "assertion.repository_owner_id == '${var.github_repository_owner_id}'",
    "assertion.repository == '${var.github_repository}'",
    "(${var.github_ref_condition})",
  ])

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "deployer_workload_identity" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}
