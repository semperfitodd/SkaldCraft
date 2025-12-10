resource "aws_dynamodb_table" "child_profiles" {
  name         = "${var.environment}_child_profiles"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "parentEmail"
  range_key    = "profileId"

  attribute {
    name = "parentEmail"
    type = "S"
  }

  attribute {
    name = "profileId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = "${var.environment}_child_profiles"
  })
}

resource "aws_dynamodb_table" "stories" {
  name         = "${var.environment}_stories"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "storyId"

  attribute {
    name = "storyId"
    type = "S"
  }

  attribute {
    name = "profileId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "profileId-createdAt-index"
    hash_key        = "profileId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  # Enable DynamoDB Streams for async archiving
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  point_in_time_recovery {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = "${var.environment}_stories"
  })
}

resource "aws_dynamodb_table" "story_nodes" {
  name         = "${var.environment}_story_nodes"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "storyId"
  range_key    = "nodeId"

  attribute {
    name = "storyId"
    type = "S"
  }

  attribute {
    name = "nodeId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = "${var.environment}_story_nodes"
  })
}

resource "aws_dynamodb_table" "users" {
  name         = "${var.environment}_users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "email"

  attribute {
    name = "email"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = "${var.environment}_users"
  })
}
