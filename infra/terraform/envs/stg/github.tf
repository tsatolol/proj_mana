# Repository variables read by .github/workflows/deploy-stg.yml.
# None of them are secrets: Workload Identity Federation only accepts tokens
# from tsatolol/proj_mana on main.
locals {
  github_repository = "proj_mana"

  github_variables = {
    STG_GCP_PROJECT_ID                 = var.project_id
    STG_GCP_WORKLOAD_IDENTITY_PROVIDER = module.app.workload_identity_provider
    STG_GCP_DEPLOYER_SERVICE_ACCOUNT   = module.app.deployer_service_account
  }
}

resource "github_actions_variable" "deploy" {
  for_each = local.github_variables

  repository    = local.github_repository
  variable_name = each.key
  value         = each.value
}
