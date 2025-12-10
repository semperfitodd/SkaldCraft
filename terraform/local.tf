locals {
  environment     = replace(var.environment, "_", "-")
  domain_name     = "${local.environment}.${var.domain}"
  api_domain_name = "${local.environment}-api.${var.domain}"
}
