#!/bin/bash

# build-extension.sh
# Zips up the extension directory for Chrome Web Store publishing.
# Ignores git files, mac OS files, and other builds.

ZIP_NAME="sedi-extension-$(date +%Y%m%d).zip"

# Clean up previous build if it exists
rm -f "sedi-extension-*.zip"

echo "Packaging extension into ${ZIP_NAME}..."

# Zip the extension contents, excluding unneeded files
cd extension
zip -r "../${ZIP_NAME}" . -x "*.DS_Store" -x "*.git*" -x "*README.md" -x "build-extension.sh"

echo "Done! Created ${ZIP_NAME}"
