terraform {
  backend "s3" {
    encrypt      = true
    use_lockfile = false
  }
}
