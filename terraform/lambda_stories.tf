module "lambda_stories" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.1"

  function_name = "${var.environment}_stories"
  description   = "Story and story node management with AI generation"
  handler       = "index.handler"
  publish       = true
  runtime       = "nodejs20.x"
  timeout       = 120
  memory_size   = 512

  environment_variables = {
    ENVIRONMENT               = var.environment
    STORIES_TABLE             = aws_dynamodb_table.stories.name
    STORY_NODES_TABLE         = aws_dynamodb_table.story_nodes.name
    USERS_TABLE               = aws_dynamodb_table.users.name
    ADULT_STORY_MODEL_ID      = var.adult_story_model_id
    ADULT_SUMMARIZER_MODEL_ID = var.adult_summarizer_model_id
    STORY_ARCHIVE_BUCKET      = module.story_archive_bucket.s3_bucket_id
    STORY_ARCHIVE_PREFIX      = "stories/"
  }

  source_path = [
    {
      path             = "${path.module}/lambda_stories"
      npm_requirements = true
      commands = [
        "npm install",
        "npm run build",
        ":zip"
      ]
    }
  ]

  attach_policies    = true
  number_of_policies = 4
  policies = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    aws_iam_policy.lambda_stories_dynamodb.arn,
    aws_iam_policy.lambda_stories_bedrock.arn,
    aws_iam_policy.lambda_stories_s3.arn
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

resource "aws_iam_policy" "lambda_stories_dynamodb" {
  name        = "${var.environment}_lambda_stories_dynamodb"
  description = "Allow Stories Lambda to access Stories and StoryNodes tables"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.stories.arn,
          "${aws_dynamodb_table.stories.arn}/index/*",
          aws_dynamodb_table.story_nodes.arn,
          "${aws_dynamodb_table.story_nodes.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem"
        ]
        Resource = [
          aws_dynamodb_table.users.arn
        ]
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_policy" "lambda_stories_bedrock" {
  name        = "${var.environment}_lambda_stories_bedrock"
  description = "Allow Stories Lambda to invoke Bedrock models for story generation"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          "arn:aws:bedrock:${var.region}::foundation-model/${var.adult_story_model_id}",
          "arn:aws:bedrock:${var.region}::foundation-model/${var.adult_summarizer_model_id}"
        ]
      }
    ]
  })

  tags = var.tags
}
