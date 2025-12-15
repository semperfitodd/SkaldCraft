data "aws_iam_policy_document" "lambda_profiles_dynamodb" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:Query"
    ]
    resources = [
      aws_dynamodb_table.users.arn,
      "${aws_dynamodb_table.users.arn}/index/*"
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query"
    ]
    resources = [
      aws_dynamodb_table.child_profiles.arn,
      "${aws_dynamodb_table.child_profiles.arn}/index/*"
    ]
  }
}

module "lambda_profiles" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.1"

  function_name = "${var.project}_profiles"
  description   = "User and child profile management"
  handler       = "index.handler"
  publish       = true
  runtime       = "nodejs20.x"
  timeout       = 30

  environment_variables = {
    ENVIRONMENT          = var.project
    USERS_TABLE          = aws_dynamodb_table.users.name
    CHILD_PROFILES_TABLE = aws_dynamodb_table.child_profiles.name
  }

  # Use pre-built zip from CI/CD pipeline
  create_package         = false
  local_existing_package = "${path.module}/builds/lambda_profiles.zip"

  layers = [aws_lambda_layer_version.lambda_shared.arn]

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
  name        = "${var.project}_lambda_profiles_dynamodb"
  description = "Allow Profiles Lambda to access Users and ChildProfiles tables"
  policy      = data.aws_iam_policy_document.lambda_profiles_dynamodb.json

  tags = var.tags
}
