variable "adult_story_model_id" {
  description = "AWS Bedrock model ID for adult story generation"
  type        = string
  default     = null
}

variable "adult_summarizer_model_id" {
  description = "AWS Bedrock model ID for story summarization (cheaper model)"
  type        = string
  default     = null
}

variable "app_name" {
  description = "Application name for Cognito pool and mobile deep links"
  type        = string
}

variable "apple_app_id" {
  description = "Apple Services ID for Sign in with Apple"
  type        = string
  default     = null
}

variable "apple_key_id" {
  description = "Apple Key ID for Sign in with Apple"
  type        = string
  default     = null
}

variable "apple_private_key" {
  description = "Base64 encoded Apple private key"
  type        = string
  sensitive   = true
  default     = null
}

variable "apple_team_id" {
  description = "Apple Team ID for Sign in with Apple"
  type        = string
  default     = null
}

variable "child_story_haiku_model_id" {
  description = "AWS Bedrock model ID for elementary child stories (K-5)"
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
}

variable "child_story_sonnet_model_id" {
  description = "AWS Bedrock model ID for advanced child stories (6+)"
  type        = string
  default     = "anthropic.claude-3-5-sonnet-20240620-v1:0"
}

variable "domain" {
  description = "Base domain for the website and API"
  type        = string
  validation {
    condition     = can(regex("^[a-zA-Z0-9.-]+$", var.domain))
    error_message = "Domain must be a valid domain name."
  }
}

variable "environment" {
  description = "Environment to be deployed in"
  type        = string
  default     = null
}

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  default     = null
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
  default     = null
}

variable "project" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9_-]+$", var.project))
    error_message = "Environment must contain only lowercase letters, numbers, hyphens, and underscores."
  }
}

variable "region" {
  description = "AWS region for all resources"
  type        = string
  validation {
    condition     = can(regex("^[a-z]+-[a-z]+-[0-9]+$", var.region))
    error_message = "Region must be a valid AWS region format (e.g., us-east-1)."
  }
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

variable "use_subdomain" {
  description = "Whether to use project as subdomain prefix (true = project.domain, false = just domain)"
  type        = bool
  default     = true
}
