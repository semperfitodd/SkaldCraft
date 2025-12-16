# SkaldCraft

**Forge Your Story. Shape Your Legend.**

SkaldCraft is an AI-powered storytelling app that transforms reading into an immersive, personalized adventure for every age. Inspired by Viking skalds—the legendary storytellers who shaped history through epic tales—SkaldCraft invites readers to become the heroes of their own sagas.

Whether you're an adult seeking an interactive escape or a parent guiding a child's reading journey, SkaldCraft adapts every story to the reader's age, skill level, imagination, and personal preferences.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Infrastructure Setup](#infrastructure-setup)
  - [Web Application Setup](#web-application-setup)
  - [Mobile Application Setup](#mobile-application-setup)
- [Configuration](#configuration)
  - [Terraform Variables](#terraform-variables)
  - [Environment Variables](#environment-variables)
- [OAuth Provider Setup](#oauth-provider-setup)
  - [Apple Sign In](#apple-sign-in)
  - [Google Sign In](#google-sign-in)
- [CI/CD Pipeline](#cicd-pipeline)
  - [Quick Start](#quick-start)
  - [Workflows](#workflows)
  - [Build Scripts](#build-scripts)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Author](#author)

## Features

### Personalized Interactive Stories

Every story is generated uniquely for the reader. Choose your path, alter the narrative, and watch your legend unfold across branching episodes. No two journeys are ever the same.

### Profiles for Every Reader

Create multiple profiles for yourself or your children. Each profile stores:

- Reading level (Pre-K through Adult)
- Age-appropriate story models
- Personal preferences (genres, tones, themes)
- Story history and achievements

### Adaptive Story Engine

Using advanced AI models, SkaldCraft adjusts:

- Vocabulary difficulty
- Story pacing
- Narrative tone (calm, funny, adventurous, epic)
- Episode length
- Themes based on preferences

The engine grows with the reader—like a digital skald learning their audience.

### Legendary Personalization

At the end of each story, readers provide simple feedback:

- What did you enjoy?
- What didn't work?
- What kind of adventure do you want next?

SkaldCraft remembers and learns your style over time, tailoring stories with uncanny accuracy.

## Architecture

- **Frontend**: React single-page application hosted on AWS S3 + CloudFront
- **Backend**: AWS Lambda functions with API Gateway
- **Authentication**: AWS Cognito with Apple and Google OAuth providers
- **AI Engine**: AWS Bedrock (Claude)
- **Infrastructure**: Terraform

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18.x
- [Terraform](https://www.terraform.io/) >= 1.0
- [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate credentials
- Apple Developer account (for Sign in with Apple)
- Google Cloud Console project (for Google Sign In)

## Getting Started

### Infrastructure Setup

1. Configure Terraform variables (see [Configuration](#configuration)):

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

2. Deploy infrastructure:

```bash
terraform init
terraform apply
```

3. Save the outputs for application configuration:

```bash
terraform output
```

### Web Application Setup

1. Configure environment (see [Configuration](#configuration)):

```bash
cd static_site
cp .env.example .env
# Edit .env with values from terraform output
```

2. Install and run:

```bash
npm install
npm start
```

3. Build for production:

```bash
npm run build
```

### Mobile Application Setup

1. Configure secrets (see [Configuration](#configuration)):

```bash
cd mobile/SkaldCraftPackage/Sources/SkaldCraftFeature/Config
cp Secrets.swift.example Secrets.swift
# Edit Secrets.swift with values from terraform output
```

2. Open in Xcode and run:

```bash
cd mobile
open SkaldCraft.xcworkspace
```

## Configuration

### Terraform Variables

Copy `terraform/terraform.tfvars.example` to `terraform/terraform.tfvars` and fill in your values:

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

Required variables:
- `environment` - Environment name (e.g., `dev`, `prod`)
- `region` - AWS region
- `domain` - Your domain name
- `app_name` - Application name

Optional OAuth providers (leave empty to disable):
- Apple Sign In credentials
- Google Sign In credentials

### Web Application

Copy `static_site/.env.example` to `static_site/.env` and configure with values from `terraform output`:

```bash
cp static_site/.env.example static_site/.env
```

### Mobile Application

Copy `mobile/SkaldCraftPackage/Sources/SkaldCraftFeature/Config/Secrets.swift.example` to `Secrets.swift`:

```bash
cp mobile/SkaldCraftPackage/Sources/SkaldCraftFeature/Config/Secrets.swift.example \
   mobile/SkaldCraftPackage/Sources/SkaldCraftFeature/Config/Secrets.swift
```

Configure with values from `terraform output`.

## OAuth Provider Setup

### Apple Sign In

1. Go to [Apple Developer Console](https://developer.apple.com/account/resources/identifiers/list/serviceId)

2. Create a Services ID with Sign in with Apple enabled

3. Configure the Services ID:
   - **Domains**: `{environment}.{domain}` (e.g., `prod.example.com`)
   - **Return URLs**: `https://{environment}-auth.{domain}/oauth2/idpresponse`

4. Create a Sign in with Apple key and download the `.p8` file

5. Base64 encode the private key:

```bash
base64 -i AuthKey_XXXXXXXXXX.p8
```

### Google Sign In

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

2. Create an OAuth 2.0 Client ID (Web application)

3. Configure authorized origins:
   - `https://{environment}.{domain}`
   - `https://{environment}-auth.{domain}`

4. Configure authorized redirect URIs:
   - `https://{environment}-auth.{domain}/oauth2/idpresponse`

## CI/CD Pipeline

SkaldCraft includes a complete GitHub Actions CI/CD pipeline for automated building, testing, and deployment.

### Quick Start

1. **Set up GitHub Secrets** (see [docs/SECRETS_REFERENCE.md](docs/SECRETS_REFERENCE.md))
   ```bash
   gh secret set AWS_ACCESS_KEY_ID --body "YOUR_VALUE"
   gh secret set AWS_SECRET_ACCESS_KEY --body "YOUR_VALUE"
   gh secret set TF_STATE_BUCKET --body "YOUR_VALUE"
   # ... and other required secrets
   ```

2. **Push to main branch** - Automatically deploys to `dev`
   ```bash
   git push origin main
   ```

3. **Manual deployment** - Deploy to any environment
   - Go to Actions → Deploy → Run workflow
   - Select environment (`dev` or `prod`)
   - Select action (`plan` or `apply`)

### Workflows

- **CI** (`ci.yml`): Runs on every PR and push
  - Builds React static site
  - Compiles TypeScript Lambda functions
  - Builds Lambda shared layer
  - Validates Terraform
  - Builds and tests iOS app

- **Deploy** (`deploy.yml`): Deploys to AWS
  - Builds all artifacts
  - Runs Terraform apply
  - Uploads static site to S3
  - Invalidates CloudFront cache

### Build Scripts

Local development scripts in `scripts/`:

```bash
# Build all Lambda functions and shared layer
./scripts/build-lambdas.sh

# Build React static site
./scripts/build-static-site.sh

# Clean all build artifacts
./scripts/clean-builds.sh
```

### Documentation

- **[CI/CD Setup Guide](docs/CICD_SETUP.md)** - Complete setup instructions
- **[Secrets Reference](docs/SECRETS_REFERENCE.md)** - All required secrets and how to get them
- **[Workflows README](.github/workflows/README.md)** - Detailed workflow documentation

## Deployment

### Automated Deployment (Recommended)

Use GitHub Actions for automated deployment:

1. **Development**: Push to `main` branch
   ```bash
   git push origin main
   ```

2. **Production**: Manual workflow dispatch
   - Go to Actions → Deploy → Run workflow
   - Select `prod` environment
   - Requires approval from designated reviewers

### Manual Deployment

For local or emergency deployments:

1. **Build artifacts**
   ```bash
   ./scripts/build-lambdas.sh
   ./scripts/build-static-site.sh
   ```

2. **Deploy infrastructure**
   ```bash
   cd terraform
   terraform init \
     -backend-config="bucket=YOUR_STATE_BUCKET" \
     -backend-config="key=dev/terraform.tfstate" \
     -backend-config="region=us-east-1"
   terraform apply -var-file="dev.tfvars"
   ```

3. **Upload static site**
   ```bash
   BUCKET_NAME=$(terraform output -raw static_site_bucket)
   aws s3 sync ../static_site/build/ s3://$BUCKET_NAME/ --delete
   ```

4. **Invalidate CloudFront cache**
   ```bash
   DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
   aws cloudfront create-invalidation \
     --distribution-id $DISTRIBUTION_ID \
     --paths "/*"
   ```

## Project Structure

```
SkaldCraft/
├── .github/
│   └── workflows/            # GitHub Actions CI/CD workflows
│       ├── ci.yml           # Continuous Integration
│       ├── deploy.yml       # Deployment workflow
│       └── README.md        # Workflow documentation
├── docs/                     # Documentation
│   ├── CICD_SETUP.md        # CI/CD setup guide
│   └── SECRETS_REFERENCE.md # GitHub secrets reference
├── mobile/                   # iOS application
│   ├── Config/              # Xcode build configurations
│   ├── SkaldCraft/          # Main app target
│   ├── SkaldCraftPackage/   # Swift Package with features
│   └── SkaldCraftUITests/   # UI tests
├── scripts/                  # Build and deployment scripts
│   ├── build-lambdas.sh     # Build Lambda functions
│   ├── build-static-site.sh # Build React app
│   └── clean-builds.sh      # Clean build artifacts
├── static_site/             # React web application
│   ├── public/              # Static assets
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── hooks/           # Custom React hooks
│       ├── pages/           # Page components
│       ├── styles/          # Global styles and variables
│       └── utils/           # Utilities and configuration
└── terraform/               # Infrastructure as code
    ├── builds/              # Build artifacts (gitignored)
    ├── lambda_shared/       # Shared Lambda layer
    ├── lambda_profiles/     # Profiles Lambda function
    ├── lambda_stories/      # Stories Lambda function
    ├── lambda_child_stories/# Child stories Lambda function
    ├── dev.tfvars          # Development environment config
    ├── prod.tfvars         # Production environment config
    └── *.tf                # Terraform configurations
```

## Documentation

- **[CI/CD Setup Guide](docs/CICD_SETUP.md)** - Complete guide to setting up the CI/CD pipeline
- **[Secrets Reference](docs/SECRETS_REFERENCE.md)** - All required GitHub secrets and how to obtain them
- **[Workflows README](.github/workflows/README.md)** - Detailed documentation of GitHub Actions workflows

## Author

**Todd Bernson**
