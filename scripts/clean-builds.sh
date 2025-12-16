#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Cleaning build artifacts...${NC}"

# Navigate to project root
cd "$(dirname "$0")/.."

# Clean Lambda builds
echo -e "\n${YELLOW}Cleaning Lambda builds...${NC}"
rm -rf terraform/builds/*.zip
rm -rf terraform/lambda_*/node_modules
rm -rf terraform/lambda_*/layer
rm -f terraform/lambda_*/*.js
rm -f terraform/lambda_*/*.js.map
rm -f terraform/lambda_shared/*.js
rm -f terraform/lambda_shared/*.js.map

# Clean static site builds
echo -e "\n${YELLOW}Cleaning static site builds...${NC}"
rm -rf static_site/build
rm -rf static_site/node_modules

# Clean iOS builds
echo -e "\n${YELLOW}Cleaning iOS builds...${NC}"
rm -rf mobile/build
rm -rf mobile/DerivedData

echo -e "\n${GREEN}All build artifacts cleaned!${NC}"

