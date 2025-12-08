module "lambda_temp" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.1"

  function_name = "${var.environment}_temp"
  description   = "${replace(var.environment, "_", " ")} temp function"
  handler       = "index.handler"
  publish       = true
  runtime       = "nodejs20.x"
  timeout       = 30

  environment_variables = {
    ENVIRONMENT = var.environment
  }

  source_path = [
    {
      path             = "${path.module}/lambda_temp"
      npm_requirements = true
      commands = [
        "npm install",
        "npm run build",
        ":zip"
      ]
    }
  ]

  attach_policies = true
  policies        = ["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"]

  allowed_triggers = {
    AllowExecutionFromAPIGateway = {
      service    = "apigateway"
      source_arn = "${module.api_gateway.api_execution_arn}/*/*"
    }
  }

  cloudwatch_logs_retention_in_days = 3

  tags = var.tags
}