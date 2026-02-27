#!/bin/bash
# Test npm installation workflow (simulates Harbor install script)
set -euo pipefail

echo "=== Testing npm-based installation workflow ==="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Must run from repository root"
    exit 1
fi

# Step 1: Build packages
echo "Step 1: Building packages..."
cd packages/core
bun run build
cd ../..
echo "✓ Core package built"
echo ""

# Step 2: Pack packages (simulate npm publish)
echo "Step 2: Creating package tarballs..."
cd packages/core
npm pack
CORE_TARBALL=$(ls open-agent-sdk-*.tgz)
echo "✓ Core package: $CORE_TARBALL"
cd ../..

cd packages/cli
npm pack
CLI_TARBALL=$(ls open-agent-sdk-cli-*.tgz)
echo "✓ CLI package: $CLI_TARBALL"
cd ../..
echo ""

# Step 3: Test installation in temp directory
TEST_DIR="/tmp/open-agent-sdk-install-test-$$"
echo "Step 3: Testing installation in $TEST_DIR..."
mkdir -p "$TEST_DIR"

# Copy tarballs
cp "packages/core/$CORE_TARBALL" "$TEST_DIR/"
cp "packages/cli/$CLI_TARBALL" "$TEST_DIR/"

cd "$TEST_DIR"

# Install core package first
echo "Installing core package..."
tar -xzf "$CORE_TARBALL"
CORE_DIR=$(basename "$CORE_TARBALL" .tgz)
cd "$CORE_DIR"
bun install --production
cd ..
echo "✓ Core package installed"

# Install CLI package
echo "Installing CLI package..."
tar -xzf "$CLI_TARBALL"
CLI_DIR=$(basename "$CLI_TARBALL" .tgz)
cd "$CLI_DIR"

# Link to local core package for testing
mkdir -p node_modules
ln -s "../../$CORE_DIR" "node_modules/open-agent-sdk"

echo "✓ CLI package installed"
echo ""

# Step 4: Test CLI command
echo "Step 4: Testing CLI command..."
export PATH="$HOME/.bun/bin:$PATH"

# Test help command
if bun run src/index.ts --help > /dev/null 2>&1; then
    echo "✓ CLI help command works"
else
    echo "✗ CLI help command failed"
    exit 1
fi

# Test version info
echo ""
echo "CLI version info:"
bun run src/index.ts --help | head -5

cd -
echo ""

# Cleanup
echo "Step 5: Cleanup..."
rm -rf "$TEST_DIR"
rm -f "packages/core/$CORE_TARBALL"
rm -f "packages/cli/$CLI_TARBALL"
echo "✓ Cleaned up test files"
echo ""

echo "=== All tests passed! ==="
echo ""
echo "Next steps:"
echo "1. Review changes: git log -1 --stat"
echo "2. Push to GitHub: git push -u origin feat/npm-publish-and-harbor-optimization"
echo "3. Publish to npm: Follow docs/dev/PUBLISHING.md"
echo "4. Test Harbor adapter: harbor jobs start ..."
