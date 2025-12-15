module "api_gateway" {
  source  = "terraform-aws-modules/apigateway-v2/aws"
  version = "~> 6.0"

  name          = var.project
  description   = "HTTP API Gateway for ${var.project}"
  protocol_type = "HTTP"

  cors_configuration = {
    allow_credentials = false
    allow_headers = [
      "content-type",
      "authorization",
      "x-amz-date",
      "x-amz-user-agent"
    ]
    allow_methods = ["*"]
    allow_origins = [
      "https://${local.api_domain_name}",
      "https://${local.domain_name}"
    ]
  }

  create_certificate    = false
  create_domain_name    = true
  create_domain_records = false

  domain_name                 = local.api_domain_name
  domain_name_certificate_arn = aws_acm_certificate.api.arn

  disable_execute_api_endpoint = false

  stage_access_log_settings = {
    create_log_group            = true
    log_group_retention_in_days = 7
  }

  stage_default_route_settings = {
    detailed_metrics_enabled = true
    throttling_burst_limit   = 100
    throttling_rate_limit    = 100
  }

  authorizers = {
    cognito = {
      authorizer_type  = "JWT"
      identity_sources = ["$request.header.Authorization"]
      jwt_configuration = {
        issuer   = "https://cognito-idp.${data.aws_region.current.region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
        audience = [aws_cognito_user_pool_client.main.id]
      }
    }
  }

  routes = {
    "POST /greeting" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_profiles.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "GET /me" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_profiles.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "GET /profile" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_profiles.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "PUT /profile" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_profiles.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "GET /profiles" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_profiles.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "POST /profiles" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_profiles.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "PUT /profiles/{profileId}" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_profiles.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "DELETE /profiles/{profileId}" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_profiles.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "GET /stories" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_stories.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "POST /stories" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_stories.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "POST /stories/adult" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_stories.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "POST /stories/child" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_child_stories.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "POST /stories/child/{storyId}/continue" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_child_stories.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "GET /stories/{storyId}" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_stories.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "PUT /stories/{storyId}" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_stories.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "DELETE /stories/{storyId}" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_stories.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "POST /stories/{storyId}/continue" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_stories.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "GET /stories/{storyId}/nodes" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_stories.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "POST /stories/{storyId}/nodes" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_stories.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "GET /stories/{storyId}/nodes/root" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_stories.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "GET /stories/{storyId}/nodes/{nodeId}" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_stories.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "PUT /stories/{storyId}/nodes/{nodeId}" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_stories.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "GET /stories/{storyId}/current" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_stories.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "GET /stories/{storyId}/archive" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_stories.lambda_function_arn
        payload_format_version = "2.0"
      }
    }

    "GET /stories/{storyId}/chapters/{chapterIndex}" = {
      authorization_type = "JWT"
      authorizer_key     = "cognito"
      integration = {
        method                 = "POST"
        uri                    = module.lambda_stories.lambda_function_arn
        payload_format_version = "2.0"
      }
    }
  }

  tags = var.tags

  depends_on = [aws_route53_record.api_verify]
}

resource "aws_acm_certificate" "api" {
  domain_name       = local.api_domain_name
  validation_method = "DNS"

  tags = merge(var.tags, {
    Name = local.api_domain_name
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "api_custom_domain" {
  zone_id = data.aws_route53_zone.public.zone_id
  name    = local.api_domain_name
  type    = "A"

  alias {
    name                   = module.api_gateway.domain_name_target_domain_name
    zone_id                = module.api_gateway.domain_name_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api_verify" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
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
