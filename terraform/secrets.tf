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

resource "aws_secretsmanager_secret" "oauth_credentials" {
  name        = "${var.project}/oauth-credentials"
  description = "OAuth provider credentials for Apple and Google Sign In"

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "oauth_credentials" {
  secret_id     = aws_secretsmanager_secret.oauth_credentials.id
  secret_string = jsonencode(local.oauth_secrets)
}
