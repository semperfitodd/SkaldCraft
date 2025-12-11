data "archive_file" "lambda_shared_layer" {
  type        = "zip"
  output_path = "${path.module}/.terraform/lambda_shared_layer.zip"

  source {
    content  = file("${path.module}/lambda_shared/package.json")
    filename = "nodejs/node_modules/lambda_shared/package.json"
  }

  source {
    content  = file("${path.module}/lambda_shared/index.js")
    filename = "nodejs/node_modules/lambda_shared/index.js"
  }

  source {
    content  = file("${path.module}/lambda_shared/types.js")
    filename = "nodejs/node_modules/lambda_shared/types.js"
  }

  source {
    content  = file("${path.module}/lambda_shared/constants.js")
    filename = "nodejs/node_modules/lambda_shared/constants.js"
  }

  source {
    content  = file("${path.module}/lambda_shared/utils.js")
    filename = "nodejs/node_modules/lambda_shared/utils.js"
  }

  source {
    content  = file("${path.module}/lambda_shared/storyModels.js")
    filename = "nodejs/node_modules/lambda_shared/storyModels.js"
  }

  source {
    content  = file("${path.module}/lambda_shared/storyRepository.js")
    filename = "nodejs/node_modules/lambda_shared/storyRepository.js"
  }

  depends_on = [null_resource.lambda_shared_build]
}

resource "aws_lambda_layer_version" "lambda_shared" {
  layer_name          = "${var.environment}_lambda_shared"
  description         = "Shared code for all SkaldCraft Lambda functions"
  compatible_runtimes = ["nodejs20.x"]
  filename            = data.archive_file.lambda_shared_layer.output_path
  source_code_hash    = data.archive_file.lambda_shared_layer.output_base64sha256
}

resource "null_resource" "lambda_shared_build" {
  triggers = {
    package_json = filebase64sha256("${path.module}/lambda_shared/package.json")
    source_hash  = sha256(join("", [for f in fileset("${path.module}/lambda_shared", "*.ts") : filesha256("${path.module}/lambda_shared/${f}")]))
  }

  provisioner "local-exec" {
    working_dir = "${path.module}/lambda_shared"
    command     = "npm install && npm run build"
  }
}
