locals {
  api_domain_name = var.use_subdomain ? "${local.project}-api.${var.domain}" : "api.${var.domain}"
  domain_name     = var.use_subdomain ? "${local.project}.${var.domain}" : var.domain
  project         = replace(var.project, "_", "-")
}
