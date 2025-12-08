locals {
  auth_domain   = "${local.environment}-auth.${var.domain}"
  mobile_scheme = var.app_name

  cognito_callback_urls = ["https://${local.domain_name}/auth/callback"]
  cognito_logout_urls   = ["https://${local.domain_name}/logout"]

  apple_configured  = var.apple_app_id != "" && var.apple_key_id != "" && var.apple_private_key != "" && var.apple_team_id != ""
  google_configured = var.google_client_id != "" && var.google_client_secret != ""

  supported_identity_providers = concat(
    local.apple_configured ? ["SignInWithApple"] : [],
    local.google_configured ? ["Google"] : []
  )
}

resource "aws_cognito_user_pool" "main" {
  name = "${var.environment}_${var.app_name}"

  mfa_configuration        = "OFF"
  auto_verified_attributes = ["email"]

  username_configuration {
    case_sensitive = false
  }

  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  tags = var.tags
}

resource "aws_cognito_identity_provider" "apple" {
  count = local.apple_configured ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "SignInWithApple"
  provider_type = "SignInWithApple"

  provider_details = {
    attributes_url_add_attributes = "false"
    authorize_scopes              = "email name"
    authorize_url                 = "https://appleid.apple.com/auth/authorize"
    client_id                     = var.apple_app_id
    key_id                        = var.apple_key_id
    oidc_issuer                   = "https://appleid.apple.com"
    private_key                   = base64decode(var.apple_private_key)
    team_id                       = var.apple_team_id
    token_request_method          = "POST"
    token_url                     = "https://appleid.apple.com/auth/token"
  }

  attribute_mapping = {
    email       = "email"
    given_name  = "firstName"
    family_name = "lastName"
    username    = "sub"
  }

  lifecycle {
    ignore_changes = [provider_details]
  }
}

resource "aws_cognito_identity_provider" "google" {
  count = local.google_configured ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    authorize_scopes              = "email profile openid"
    client_id                     = var.google_client_id
    client_secret                 = var.google_client_secret
    attributes_url_add_attributes = "true"
  }

  attribute_mapping = {
    email       = "email"
    given_name  = "given_name"
    family_name = "family_name"
    username    = "sub"
    picture     = "picture"
  }

  lifecycle {
    ignore_changes = [provider_details]
  }
}

resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.environment}_${var.app_name}_client"
  user_pool_id = aws_cognito_user_pool.main.id

  explicit_auth_flows          = ["ALLOW_REFRESH_TOKEN_AUTH"]
  supported_identity_providers = local.supported_identity_providers

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  callback_urls = concat(
    local.cognito_callback_urls,
    ["${local.mobile_scheme}://auth/callback"]
  )
  logout_urls = concat(
    local.cognito_logout_urls,
    ["${local.mobile_scheme}://logout"]
  )

  access_token_validity  = 24
  id_token_validity      = 24
  refresh_token_validity = 365

  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true
  generate_secret               = false

  depends_on = [
    aws_cognito_identity_provider.apple,
    aws_cognito_identity_provider.google
  ]
}

resource "aws_cognito_user_pool_domain" "main" {
  domain          = local.auth_domain
  certificate_arn = aws_acm_certificate.auth.arn
  user_pool_id    = aws_cognito_user_pool.main.id

  depends_on = [aws_acm_certificate_validation.auth]
}

resource "aws_acm_certificate" "auth" {
  domain_name       = local.auth_domain
  validation_method = "DNS"

  tags = var.tags
}

resource "aws_route53_record" "auth_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.auth.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.public.zone_id
}

resource "aws_acm_certificate_validation" "auth" {
  certificate_arn         = aws_acm_certificate.auth.arn
  validation_record_fqdns = [for record in aws_route53_record.auth_cert_validation : record.fqdn]
}

resource "aws_route53_record" "cognito_domain" {
  zone_id = data.aws_route53_zone.public.zone_id
  name    = aws_cognito_user_pool_domain.main.domain
  type    = "A"

  alias {
    name                   = aws_cognito_user_pool_domain.main.cloudfront_distribution
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }

  depends_on = [aws_cognito_user_pool_domain.main]
}
