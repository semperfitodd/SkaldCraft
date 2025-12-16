#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building Lambda functions and shared layer...${NC}"

# Navigate to terraform directory
cd "$(dirname "$0")/../terraform"

# Create builds directory if it doesn't exist
mkdir -p builds

# Function to build a lambda
build_lambda() {
    local lambda_dir=$1
    local lambda_name=$2
    local output_name=$3
    
    echo -e "\n${YELLOW}Building ${lambda_name}...${NC}"
    cd "$lambda_dir"
    
    # Install dependencies
    npm ci --production
    
    # Build TypeScript
    npm run build
    
    # Create zip file
    zip -r "${output_name}.zip" *.js node_modules/ package.json > /dev/null
    
    # Move to builds directory
    mv "${output_name}.zip" ../builds/
    
    echo -e "${GREEN}✓ ${lambda_name} built successfully${NC}"
    cd ..
}

# Build Lambda Shared Layer
echo -e "\n${YELLOW}Building Lambda Shared Layer...${NC}"
cd lambda_shared

# Install dependencies
npm ci --production

# Build TypeScript
npm run build

# Create layer structure
mkdir -p layer/nodejs
cp -r node_modules layer/nodejs/
cp *.js layer/nodejs/
cp package.json layer/nodejs/

# Create zip
cd layer
zip -r ../lambda_shared_layer.zip nodejs/ > /dev/null
cd ..

# Move to builds directory
mv lambda_shared_layer.zip ../builds/

# Cleanup
rm -rf layer

echo -e "${GREEN}✓ Lambda Shared Layer built successfully${NC}"
cd ..

# Build individual lambdas
build_lambda "lambda_profiles" "Lambda Profiles" "lambda_profiles"
build_lambda "lambda_stories" "Lambda Stories" "lambda_stories"
build_lambda "lambda_child_stories" "Lambda Child Stories" "lambda_child_stories"

echo -e "\n${GREEN}All Lambda functions built successfully!${NC}"
echo -e "${GREEN}Build artifacts are in terraform/builds/${NC}"

