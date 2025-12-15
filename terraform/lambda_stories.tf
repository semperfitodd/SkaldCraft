data "aws_iam_policy_document" "lambda_archive_stream_dynamodb" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:BatchWriteItem",
      "dynamodb:DeleteItem",
      "dynamodb:GetItem",
      "dynamodb:Query",
      "dynamodb:UpdateItem",
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
      "dynamodb:DescribeStream",
      "dynamodb:GetRecords",
      "dynamodb:GetShardIterator",
      "dynamodb:ListStreams",
    ]
    resources = [
      "${aws_dynamodb_table.stories.arn}/stream/*"
    ]
  }
}

data "aws_iam_policy_document" "lambda_stories_bedrock" {
  statement {
    effect = "Allow"
    actions = [
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream"
    ]
    resources = [
      "arn:aws:bedrock:${var.region}::foundation-model/${var.adult_story_model_id}",
      "arn:aws:bedrock:${var.region}::foundation-model/${var.adult_summarizer_model_id}"
    ]
  }
}

data "aws_iam_policy_document" "lambda_stories_dynamodb" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:BatchGetItem",
      "dynamodb:BatchWriteItem"
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

data "aws_iam_policy_document" "lambda_stories_invoke_self" {
  statement {
    effect = "Allow"
    actions = [
      "lambda:InvokeFunction"
    ]
    resources = [
      "arn:aws:lambda:${var.region}:${data.aws_caller_identity.current.account_id}:function:${var.project}_stories"
    ]
  }
}

module "lambda_archive_stream" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.1"

  function_name = "${var.project}_archive_stream"
  description   = "DynamoDB Stream handler for archiving completed stories"
  handler       = "archiveStreamHandler.handler"
  publish       = true
  runtime       = "nodejs20.x"
  timeout       = 60
  memory_size   = 256

  environment_variables = {
    ENVIRONMENT          = var.project
    STORIES_TABLE        = aws_dynamodb_table.stories.name
    STORY_NODES_TABLE    = aws_dynamodb_table.story_nodes.name
    STORY_ARCHIVE_BUCKET = module.story_archive_bucket.s3_bucket_id
    STORY_ARCHIVE_PREFIX = "stories/"
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

  layers = [aws_lambda_layer_version.lambda_shared.arn]

  attach_policies    = true
  number_of_policies = 3
  policies = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    aws_iam_policy.lambda_archive_stream_dynamodb.arn,
    aws_iam_policy.lambda_stories_s3.arn
  ]

  cloudwatch_logs_retention_in_days = 3

  tags = var.tags
}

module "lambda_stories" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.1"

  function_name = "${var.project}_stories"
  description   = "Story and story node management with AI generation"
  handler       = "index.handler"
  publish       = true
  runtime       = "nodejs20.x"
  timeout       = 180
  memory_size   = 512

  environment_variables = {
    ENVIRONMENT               = var.project
    STORIES_TABLE             = aws_dynamodb_table.stories.name
    STORY_NODES_TABLE         = aws_dynamodb_table.story_nodes.name
    USERS_TABLE               = aws_dynamodb_table.users.name
    CHILD_PROFILES_TABLE      = aws_dynamodb_table.child_profiles.table
_name
    ADULT_STORY_MODEL_ID      = var.adult_story_model_id
    ADULT_SUMMARIZER_MODEL_ID = var.adult_summarizer_model_id
    STORY_ARCHIVE_BUCKET      = module.story_archive_bucket.s3_bucket_id
    STORY_ARCHIVE_PREFIX      = "stories/"
    LAMBDA_FUNCTION_NAME      = "${var.project}_stories"
  }

  # Use pre-built zip from CI/CD pipeline
  create_package         = false
  local_existing_package = "${path.module}/builds/lambda_stories.zip"

  layers = [aws_lambda_layer_version.lambda_shared.arn]

  attach_policies    = true
  number_of_policies = 5
  policies = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    aws_iam_policy.lambda_stories_bedrock.arn,
    aws_iam_policy.lambda_stories_dynamodb.arn,
    aws_iam_policy.lambda_stories_invoke_self.arn,
    aws_iam_policy.lambda_stories_s3.arn,
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

resource "aws_iam_policy" "lambda_archive_stream_dynamodb" {
  name        = "${var.project}_lambda_archive_stream_dynamodb"
  description = "Allow Archive Stream Lambda to read/write Stories and StoryNodes tables"
  policy      = data.aws_iam_policy_document.lambda_archive_stream_dynamodb.json

  tags = var.tags
}

# Event source mapping for DynamoDB Stream
resource "aws_iam_policy" "lambda_stories_bedrock" {
  name        = "${var.project}_lambda_stories_bedrock"
  description = "Allow Stories Lambda to invoke Bedrock models for story generation"
  policy      = data.aws_iam_policy_document.lambda_stories_bedrock.json

  tags = var.tags
}

resource "aws_iam_policy" "lambda_stories_dynamodb" {
  name        = "${var.project}_lambda_stories_dynamodb"
  description = "Allow Stories Lambda to access Stories and StoryNodes tables"
  policy      = data.aws_iam_policy_document.lambda_stories_dynamodb.json

  tags = var.tags
}

resource "aws_iam_policy" "lambda_stories_invoke_self" {
  name        = "${var.project}_lambda_stories_invoke_self"
  description = "Allow Stories Lambda to invoke itself asynchronously for background generation"
  policy      = data.aws_iam_policy_document.lambda_stories_invoke_self.json

  tags = var.tags
}

# DynamoDB Stream Lambda for async story archiving
resource "aws_lambda_event_source_mapping" "stories_stream" {
  event_source_arn  = aws_dynamodb_table.stories.stream_arn
  function_name     = module.lambda_archive_stream.lambda_function_arn
  starting_position = "LATEST"

  # Process records in small batches for faster processing
  batch_size = 10

  # Retry configuration
  maximum_retry_attempts = 3

  # Only process records that are less than 24 hours old
  maximum_record_age_in_seconds = 86400

  # Bisect batch on function error to isolate problematic records
  bisect_batch_on_function_error = true

  # Filter to only process MODIFY events (optional - handler also filters)
  filter_criteria {
    filter {
      pattern = <<-EOT
        {
          "eventName": ["MODIFY"]
        }
      EOT
    }
  }

  depends_on = [
    aws_dynamodb_table.stories,
    module.lambda_archive_stream
  ]
}

