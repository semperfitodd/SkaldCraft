variable "domain" {
  description = "Base domain for the website and API"
  type        = string
  validation {
    condition     = can(regex("^[a-zA-Z0-9.-]+$", var.domain))
    error_message = "Domain must be a valid domain name."
  }
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9_-]+$", var.environment))
    error_message = "Environment must contain only lowercase letters, numbers, hyphens, and underscores."
  }
}

variable "region" {
  description = "AWS region for all resources"
  type        = string
  default     = null
  validation {
    condition     = can(regex("^[a-z]+-[a-z]+-[0-9]+$", var.region))
    error_message = "Region must be a valid AWS region format (e.g., us-east-1, eu-west-1)."
  }
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

variable "bedrock_model_id" {
  description = "AWS Bedrock model ID for AI analysis"
  type        = string
  default     = "us.anthropic.claude-3-5-sonnet-20241022-v2:0"
}

# =============================================================================
# Apple Sign In Configuration
# =============================================================================

variable "apple_app_id" {
  description = "Apple Services ID (client_id) for Sign in with Apple"
  type        = string
  default     = ""
}

variable "apple_key_id" {
  description = "Apple Key ID for Sign in with Apple"
  type        = string
  default     = ""
}

variable "apple_private_key" {
  description = "Base64 encoded Apple private key for Sign in with Apple"
  type        = string
  sensitive   = true
  default     = ""
}

variable "apple_team_id" {
  description = "Apple Team ID for Sign in with Apple"
  type        = string
  default     = ""
}

# =============================================================================
# Google Sign In Configuration
# =============================================================================

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
  default     = ""
}
