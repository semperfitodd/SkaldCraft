locals {
  oauth_secrets = {
    apple = {
      app_id      = var.apple_app_id
      key_id      = var.apple_key_id
      private_key = var.apple_private_key
      team_id     = var.apple_team_id
    }
    google = {
      client_id     = var.google_client_id
      client_secret = var.google_client_secret
    }
  }
}

resource "aws_secretsmanager_secret" "github_tfvars" {
  name        = "${var.project}/github-tfvars"
  description = "Terraform variables for GitHub Actions CI/CD pipeline"

  tags = var.tags
}

resource "aws_secretsmanager_secret" "oauth_credentials" {
  name        = "${var.project}/oauth-credentials"
  description = "OAuth provider credentials for Apple and Google Sign In"

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "github_tfvars" {
  secret_id = aws_secretsmanager_secret.github_tfvars.id
  secret_string = jsonencode({
    adult_story_model_id      = var.adult_story_model_id
    adult_summarizer_model_id = var.adult_summarizer_model_id
    app_name                  = var.app_name
    apple_app_id              = var.apple_app_id
    apple_key_id              = var.apple_key_id
    apple_private_key         = var.apple_private_key
    apple_team_id             = var.apple_team_id
    domain                    = var.domain
    environment               = var.environment
    google_client_id          = var.google_client_id
    google_client_secret      = var.google_client_secret
    project                   = var.project
    region                    = var.region
    use_subdomain             = var.use_subdomain
  })
}

resource "aws_secretsmanager_secret_version" "oauth_credentials" {
  secret_id     = aws_secretsmanager_secret.oauth_credentials.id
  secret_string = jsonencode(local.oauth_secrets)
}
