data "aws_iam_policy_document" "lambda_child_stories_bedrock" {
  statement {
    effect = "Allow"
    actions = [
      "bedrock:InvokeModel"
    ]
    resources = [
      "arn:aws:bedrock:${var.region}::foundation-model/${var.child_story_haiku_model_id}",
      "arn:aws:bedrock:${var.region}::foundation-model/${var.child_story_sonnet_model_id}"
    ]
  }
}

data "aws_iam_policy_document" "lambda_child_stories_dynamodb" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:Query",
      "dynamodb:BatchGetItem"
    ]
    resources = [
      aws_dynamodb_table.stories.arn,
      "${aws_dynamodb_table.stories.arn}/index/*",
      aws_dynamodb_table.story_nodes.arn,
      "${aws_dynamodb_table.story_nodes.arn}/index/*"
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem"
    ]
    resources = [
      aws_dynamodb_table.users.arn,
      aws_dynamodb_table.child_profiles.arn
    ]
  }
}

data "aws_iam_policy_document" "lambda_child_stories_invoke_self" {
  statement {
    effect = "Allow"
    actions = [
      "lambda:InvokeFunction"
    ]
    resources = [
      "arn:aws:lambda:${var.region}:${data.aws_caller_identity.current.account_id}:function:${var.project}_child_stories"
    ]
  }
}

module "lambda_child_stories" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.1"

  function_name = "${var.project}_child_stories"
  description   = "Child story generation with age-appropriate content"
  handler       = "index.handler"
  publish       = true
  runtime       = "nodejs20.x"
  timeout       = 300
  memory_size   = 512

  environment_variables = {
    ENVIRONMENT                 = var.project
    STORIES_TABLE               = aws_dynamodb_table.stories.name
    STORY_NODES_TABLE           = aws_dynamodb_table.story_nodes.name
    USERS_TABLE                 = aws_dynamodb_table.users.name
    CHILD_PROFILES_TABLE        = aws_dynamodb_table.child_profiles.name
    CHILD_STORY_HAIKU_MODEL_ID  = var.child_story_haiku_model_id
    CHILD_STORY_SONNET_MODEL_ID = var.child_story_sonnet_model_id
    STORY_ARCHIVE_BUCKET        = module.story_archive_bucket.s3_bucket_id
    STORY_ARCHIVE_PREFIX        = "stories/"
    LAMBDA_FUNCTION_NAME        = "${var.project}_child_stories"
  }

  source_path = [
    {
      path             = "${path.module}/lambda_child_stories"
      npm_requirements = true
      commands = [
        "npm install",
        "npm run build",
        ":zip"
      ]
    }
  ]

  layers = [aws_lambda_layer_version.lambda_shared.arn]

  attach_policies    = true
  number_of_policies = 5
  policies = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    aws_iam_policy.lambda_child_stories_bedrock.arn,
    aws_iam_policy.lambda_child_stories_dynamodb.arn,
    aws_iam_policy.lambda_child_stories_invoke_self.arn,
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

resource "aws_iam_policy" "lambda_child_stories_bedrock" {
  name        = "${var.project}_lambda_child_stories_bedrock"
  description = "Allow Child Stories Lambda to invoke Haiku and Sonnet models"
  policy      = data.aws_iam_policy_document.lambda_child_stories_bedrock.json

  tags = var.tags
}

resource "aws_iam_policy" "lambda_child_stories_dynamodb" {
  name        = "${var.project}_lambda_child_stories_dynamodb"
  description = "Allow Child Stories Lambda to access Stories and StoryNodes tables"
  policy      = data.aws_iam_policy_document.lambda_child_stories_dynamodb.json

  tags = var.tags
}

resource "aws_iam_policy" "lambda_child_stories_invoke_self" {
  name        = "${var.project}_lambda_child_stories_invoke_self"
  description = "Allow Child Stories Lambda to invoke itself asynchronously"
  policy      = data.aws_iam_policy_document.lambda_child_stories_invoke_self.json

  tags = var.tags
}
