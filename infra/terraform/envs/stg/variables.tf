variable "project_id" {
  description = "GCP project ID for stg."
  type        = string
}

variable "region" {
  type    = string
  default = "asia-northeast1"
}

variable "allowed_email_domains" {
  type    = string
  default = ""
}

variable "initial_admin_email" {
  type = string
}

variable "google_oauth_client_id" {
  type = string
}

variable "google_oauth_client_secret" {
  description = "Pass via TF_VAR_google_oauth_client_secret when (re)writing the secret. Never stored in state."
  type        = string
  default     = null
  sensitive   = true
  ephemeral   = true
}

variable "google_oauth_client_secret_version" {
  type    = string
  default = "1"
}
