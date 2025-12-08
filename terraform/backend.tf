terraform {
  backend "s3" {
    bucket = "bsc.sandbox.terraform.state"
    key    = "skaldcraft/terraform.tfstate"
    region = "us-east-2"

    encrypt      = true
    use_lockfile = false
  }
}
