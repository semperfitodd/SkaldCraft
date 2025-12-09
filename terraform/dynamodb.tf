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

