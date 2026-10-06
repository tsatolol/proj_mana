variable "project_id" {
  description = "GCP project ID (one project per environment)."
  type        = string
}

variable "region" {
  description = "Region for all regional resources."
  type        = string
  default     = "asia-northeast1"
}

variable "env" {
  description = "Environment name used in labels (e.g. stg, prod)."
  type        = string
}

variable "service_name" {
  description = "Cloud Run service name. Also part of the app URL."
  type        = string
  default     = "proj-mana"
}

# --- GitHub Actions (Workload Identity Federation) -------------------------

variable "github_repository" {
  description = "GitHub repository allowed to deploy, as owner/name."
  type        = string
}

variable "github_repository_owner_id" {
  description = "Numeric GitHub user/org ID of the repository owner (guards against renamed or re-created owners)."
  type        = string
}

variable "github_ref_condition" {
  description = "CEL condition on the OIDC token's ref, e.g. \"assertion.ref == 'refs/heads/main'\"."
  type        = string
}

# --- Cloud SQL -------------------------------------------------------------

variable "db_tier" {
  description = "Cloud SQL machine tier."
  type        = string
  default     = "db-f1-micro"
}

variable "db_disk_size_gb" {
  type    = number
  default = 10
}

variable "db_availability_type" {
  description = "ZONAL or REGIONAL."
  type        = string
  default     = "ZONAL"
}

variable "db_backup_enabled" {
  type    = bool
  default = false
}

variable "db_point_in_time_recovery_enabled" {
  type    = bool
  default = false
}

variable "db_backup_retained_count" {
  type    = number
  default = 7
}

variable "db_password_version" {
  description = "Bump to rotate the database password (written to Cloud SQL and the DATABASE_URL secret)."
  type        = string
  default     = "1"
}

# --- Application -----------------------------------------------------------

variable "allowed_email_domains" {
  description = "ALLOWED_EMAIL_DOMAINS (comma separated)."
  type        = string
  default     = ""
}

variable "initial_admin_email" {
  description = "INITIAL_ADMIN_EMAIL."
  type        = string
}

variable "google_oauth_client_id" {
  description = "Google OAuth client ID (AUTH_GOOGLE_ID). Not a secret."
  type        = string
}

variable "google_oauth_client_secret" {
  description = "Google OAuth client secret. Only needed when google_oauth_client_secret_version changes; never stored in state."
  type        = string
  default     = null
  sensitive   = true
  ephemeral   = true
}

variable "google_oauth_client_secret_version" {
  description = "Bump together with google_oauth_client_secret to store a new client secret."
  type        = string
  default     = "1"
}

variable "auth_secret_version" {
  description = "Bump to rotate AUTH_SECRET (signs out every user)."
  type        = string
  default     = "1"
}

variable "max_upload_bytes" {
  type    = number
  default = 20971520
}

variable "run_min_instances" {
  type    = number
  default = 0
}

variable "run_max_instances" {
  type    = number
  default = 2
}

variable "run_cpu" {
  type    = string
  default = "1"
}

variable "run_memory" {
  type    = string
  default = "512Mi"
}

# --- Safety ----------------------------------------------------------------

variable "deletion_protection" {
  description = "Protect Cloud SQL, Cloud Run and the attachments bucket from `terraform destroy`."
  type        = bool
  default     = true
}
