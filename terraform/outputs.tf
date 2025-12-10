output "api_url" {
  description = "API Gateway custom domain URL"
  value       = local.api_domain_name
}

output "cognito_client_id" {
  description = "Cognito User Pool Client ID"
  value       = aws_cognito_user_pool_client.main.id
}

output "cognito_domain" {
  description = "Cognito custom domain"
  value       = local.auth_domain
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "frontend_url" {
  description = "Frontend website URL"
  value       = local.domain_name
}

output "oauth_secrets_arn" {
  description = "ARN of the OAuth credentials secret in Secrets Manager"
  value       = aws_secretsmanager_secret.oauth_credentials.arn
}
