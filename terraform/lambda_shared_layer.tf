resource "null_resource" "lambda_shared_layer_build" {
  triggers = {
    package_json = filebase64sha256("${path.module}/lambda_shared/package.json")
    source_hash  = sha256(join("", [for f in fileset("${path.module}/lambda_shared", "*.ts") : filesha256("${path.module}/lambda_shared/${f}")]))
  }

  provisioner "local-exec" {
    working_dir = "${path.module}"
    command     = <<-EOT
      set -e
      cd lambda_shared
      npm install
      npm run build
      cd ..
      rm -rf .terraform/lambda_shared_layer
      mkdir -p .terraform/lambda_shared_layer/nodejs/node_modules/lambda_shared
      cp lambda_shared/package.json .terraform/lambda_shared_layer/nodejs/node_modules/lambda_shared/
      cp lambda_shared/*.js .terraform/lambda_shared_layer/nodejs/node_modules/lambda_shared/
      cp -r lambda_shared/node_modules/* .terraform/lambda_shared_layer/nodejs/node_modules/
      cd .terraform/lambda_shared_layer
      zip -r ../lambda_shared_layer.zip nodejs/
    EOT
  }
}

resource "aws_lambda_layer_version" "lambda_shared" {
  layer_name          = "${var.environment}_lambda_shared"
  description         = "Shared code for all SkaldCraft Lambda functions"
  compatible_runtimes = ["nodejs20.x"]
  filename            = "${path.module}/.terraform/lambda_shared_layer.zip"
  source_code_hash    = null_resource.lambda_shared_layer_build.id

  depends_on = [null_resource.lambda_shared_layer_build]
}
