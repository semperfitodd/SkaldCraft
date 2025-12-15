# Use pre-built layer zip from CI/CD pipeline
resource "aws_lambda_layer_version" "lambda_shared" {
  layer_name          = "${var.project}_lambda_shared"
  description         = "Shared code for all SkaldCraft Lambda functions"
  compatible_runtimes = ["nodejs20.x"]
  filename            = "${path.module}/builds/lambda_shared_layer.zip"
  source_code_hash    = filebase64sha256("${path.module}/builds/lambda_shared_layer.zip")
}
