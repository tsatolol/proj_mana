data "google_project" "this" {
  project_id = var.project_id
}

locals {
  labels = {
    app = "proj-mana"
    env = var.env
  }

  # Cloud Run's deterministic URL. Known before the service exists, so it can be
  # used for AUTH_URL, the OAuth redirect URI and bucket CORS.
  app_url = "https://${var.service_name}-${data.google_project.this.number}.${var.region}.run.app"

  # Initial image for the service and job. GitHub Actions deploys the real image;
  # Terraform ignores later image changes (see lifecycle blocks in run.tf).
  placeholder_image = "us-docker.pkg.dev/cloudrun/container/hello"

  artifact_registry_host = "${var.region}-docker.pkg.dev"
}

resource "google_project_service" "this" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "sqladmin.googleapis.com",
    "storage.googleapis.com",
    "sts.googleapis.com",
  ])

  project = var.project_id
  service = each.value
}
