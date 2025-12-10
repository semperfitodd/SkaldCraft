module "lambda_profiles" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.1"

  function_name = "${var.environment}_profiles"
  description   = "User and child profile management"
  handler       = "index.handler"
  publish       = true
  runtime       = "nodejs20.x"
  timeout       = 30

  environment_variables = {
    ENVIRONMENT          = var.environment
    USERS_TABLE          = aws_dynamodb_table.users.name
    CHILD_PROFILES_TABLE = aws_dynamodb_table.child_profiles.name
  }

  source_path = [
    {
      path             = "${path.module}/lambda_profiles"
      npm_requirements = true
      commands = [
        "npm install",
        "npm run build",
        ":zip"
      ]
    }
  ]

  attach_policies    = true
  number_of_policies = 2
  policies = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    aws_iam_policy.lambda_profiles_dynamodb.arn
  ]

  allowed_triggers = {
    AllowExecutionFromAPIGateway = {
      service    = "apigateway"
      source_arn = "${module.api_gateway.api_execution_arn}/*/*"
    }
  }

  cloudwatch_logs_retention_in_days = 3

  tags = var.tags
}

resource "aws_iam_policy" "lambda_profiles_dynamodb" {
  name        = "${var.environment}_lambda_profiles_dynamodb"
  description = "Allow Profiles Lambda to access Users and ChildProfiles tables"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.users.arn,
          "${aws_dynamodb_table.users.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.child_profiles.arn,
          "${aws_dynamodb_table.child_profiles.arn}/index/*"
        ]
      }
    ]
  })

  tags = var.tags
}

