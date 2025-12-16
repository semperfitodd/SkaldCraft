#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building static site...${NC}"

# Navigate to static site directory
cd "$(dirname "$0")/../static_site"

# Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
npm ci

# Run tests
echo -e "\n${YELLOW}Running tests...${NC}"
npm test -- --passWithNoTests --watchAll=false

# Build
echo -e "\n${YELLOW}Building production bundle...${NC}"
npm run build

echo -e "\n${GREEN}Static site built successfully!${NC}"
echo -e "${GREEN}Build output is in static_site/build/${NC}"

