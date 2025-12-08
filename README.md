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
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Author](#author)
- [License](#license)

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

1. Navigate to the terraform directory:

```bash
cd terraform
```

2. Create a `terraform.tfvars` file (see [Configuration](#terraform-variables))

3. Initialize and apply:

```bash
terraform init
terraform plan
terraform apply
```

4. Note the outputs for configuring the web application:

```bash
terraform output
```

### Web Application Setup

1. Navigate to the static site directory:

```bash
cd static_site
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file (see [Configuration](#environment-variables))

4. Start the development server:

```bash
npm start
```

5. Build for production:

```bash
npm run build
```

### Mobile Application Setup

1. Navigate to the mobile directory:

```bash
cd mobile
```

2. Open the workspace in Xcode:

```bash
open SkaldCraft.xcworkspace
```

3. Configure signing and capabilities in Xcode

4. Build and run on simulator or device

## Configuration

### Terraform Variables

Create `terraform/terraform.tfvars`:

```hcl
# Required
app_name    = "skaldcraft"
domain      = "example.com"
environment = "prod"
region      = "us-east-1"

# Apple Sign In (optional - leave empty to disable)
apple_app_id      = "com.example.skaldcraft-sid"
apple_key_id      = "XXXXXXXXXX"
apple_private_key = "BASE64_ENCODED_PRIVATE_KEY"
apple_team_id     = "XXXXXXXXXX"

# Google Sign In (optional - leave empty to disable)
google_client_id     = "123456789-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
google_client_secret = "GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"

# Optional
tags = {
  Project = "SkaldCraft"
  Owner   = "YourName"
}
```

| Variable | Description | Required |
|----------|-------------|----------|
| `app_name` | Application name for resources and mobile deep links | Yes |
| `domain` | Base domain (e.g., `example.com`) | Yes |
| `environment` | Environment name (e.g., `dev`, `staging`, `prod`) | Yes |
| `region` | AWS region | Yes |
| `apple_app_id` | Apple Services ID | No |
| `apple_key_id` | Apple Key ID | No |
| `apple_private_key` | Base64-encoded Apple private key | No |
| `apple_team_id` | Apple Team ID | No |
| `google_client_id` | Google OAuth Client ID | No |
| `google_client_secret` | Google OAuth Client Secret | No |
| `bedrock_model_id` | AWS Bedrock model ID | No |
| `tags` | Additional resource tags | No |

### Environment Variables

Create `static_site/.env`:

```bash
# Required - obtain from terraform output
REACT_APP_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
REACT_APP_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
REACT_APP_COGNITO_DOMAIN=prod-auth.example.com

# Optional - defaults to current origin
REACT_APP_REDIRECT_URI=https://prod.example.com/auth/callback
REACT_APP_LOGOUT_URI=https://prod.example.com/logout
```

For local development:

```bash
REACT_APP_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
REACT_APP_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
REACT_APP_COGNITO_DOMAIN=prod-auth.example.com
REACT_APP_REDIRECT_URI=http://localhost:3000/auth/callback
REACT_APP_LOGOUT_URI=http://localhost:3000/logout
```

Note: Add `http://localhost:3000/auth/callback` and `http://localhost:3000/logout` to your Cognito callback/logout URLs for local development.

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

## Deployment

### Deploy Infrastructure

```bash
cd terraform
terraform apply
```

### Deploy Web Application

```bash
cd static_site
npm run build
cd ../terraform
terraform apply
```

The S3 bucket is automatically synced with the build directory on `terraform apply`.

### Invalidate CloudFront Cache (if needed)

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## Project Structure

```
SkaldCraft/
├── mobile/                    # iOS application
│   ├── Config/               # Xcode build configurations
│   ├── SkaldCraft/           # Main app target
│   ├── SkaldCraftPackage/    # Swift Package with features
│   └── SkaldCraftUITests/    # UI tests
├── static_site/              # React web application
│   ├── public/               # Static assets
│   └── src/
│       ├── components/       # Reusable UI components
│       ├── hooks/            # Custom React hooks
│       ├── pages/            # Page components
│       ├── styles/           # Global styles and variables
│       └── utils/            # Utilities and configuration
└── terraform/                # Infrastructure as code
    ├── lambda_temp/          # Lambda function source
    └── *.tf                  # Terraform configurations
```

## Author

**Todd Bernson**

## License

All rights reserved.
