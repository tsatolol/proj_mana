variable "billing_account" {
  description = "Billing account ID linked to every project (XXXXXX-XXXXXX-XXXXXX)."
  type        = string
}

variable "environments" {
  description = "GCP project per environment, keyed by environment name (stg, prod)."
  type = map(object({
    project_id = string
    # Display name shown in the console.
    name = string
  }))
}

variable "org_id" {
  description = "Organization to create the projects in. null for accounts without an organization."
  type        = string
  default     = null
}

variable "region" {
  type    = string
  default = "asia-northeast1"
}
