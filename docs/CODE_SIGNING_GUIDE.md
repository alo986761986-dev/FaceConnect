# FaceConnect Code Signing Integration Guide

This guide explains how to integrate code signing into your GitHub Actions workflow to remove the "Unknown Publisher" warning from Windows SmartScreen.

---

## Option A: Azure Trusted Signing ($9.99/month) - RECOMMENDED

### Step 1: Set Up Azure Trusted Signing

1. **Create Azure Account**
   - Go to [Azure Portal](https://portal.azure.com)
   - Create a Pay-As-You-Go subscription

2. **Create Trusted Signing Account**
   - Search for "Trusted Signing" in Azure Portal
   - Click "Create"
   - Select your subscription and resource group
   - Choose **Basic** tier ($9.99/month)
   - Select a region (e.g., East US)

3. **Complete Identity Validation**
   - Go to your Trusted Signing Account → "Identity Validation"
   - Choose "Individual" or "Organization"
   - Submit required documents
   - Wait for Microsoft verification (1-3 days)

4. **Create Certificate Profile**
   - Go to "Certificate Profiles"
   - Click "Create"
   - Select "Public Trust" for code signing
   - Link your validated identity

5. **Get Credentials for GitHub Actions**
   You'll need:
   - `AZURE_TENANT_ID` - Your Azure AD tenant ID
   - `AZURE_CLIENT_ID` - App registration client ID
   - `AZURE_CLIENT_SECRET` - App registration secret
   - `AZURE_SUBSCRIPTION_ID` - Your Azure subscription ID
   - `TRUSTED_SIGNING_ACCOUNT_NAME` - Your signing account name
   - `TRUSTED_SIGNING_CERT_PROFILE_NAME` - Your certificate profile name

### Step 2: Add Secrets to GitHub Repository

Go to your GitHub repo → Settings → Secrets and Variables → Actions → New repository secret

Add these secrets:
```
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
AZURE_SUBSCRIPTION_ID=<your-subscription-id>
TRUSTED_SIGNING_ACCOUNT_NAME=<your-account-name>
TRUSTED_SIGNING_CERT_PROFILE_NAME=<your-profile-name>
```

### Step 3: Update GitHub Workflow

Replace your `.github/workflows/build-windows.yml` with the Azure Trusted Signing version below.

---

## Option B: Traditional Code Signing Certificate (~$200-300/year)

### Step 1: Purchase Certificate

Recommended providers:
- [CodeSignCert (Sectigo)](https://codesigncert.com) - ~$226/year
- [Certera](https://certera.com) - ~$200/year
- [ComodoSSLStore](https://comodosslstore.com) - ~$219/year

### Step 2: Export Certificate to PFX

After receiving your certificate, export it to a `.pfx` file with a password.

### Step 3: Encode Certificate for GitHub

```bash
# On your computer, encode the .pfx file to base64
base64 -i your-certificate.pfx -o certificate-base64.txt
```

### Step 4: Add Secrets to GitHub Repository

Go to your GitHub repo → Settings → Secrets and Variables → Actions → New repository secret

Add these secrets:
```
CERTIFICATE_BASE64=<contents of certificate-base64.txt>
CERTIFICATE_PASSWORD=<your-pfx-password>
```

---

## Updated Workflow Files

### Option A: Azure Trusted Signing Workflow

```yaml
# .github/workflows/build-windows.yml
name: Build Windows App (Signed)

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      publish_release:
        description: 'Publish as GitHub Release'
        required: false
        default: 'false'
        type: boolean

permissions:
  contents: write
  id-token: write

jobs:
  build:
    runs-on: windows-latest
    
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Get version from package.json
        id: version
        shell: powershell
        run: |
          $version = (Get-Content frontend/package.json | ConvertFrom-Json).version
          echo "VERSION=$version" >> $env:GITHUB_OUTPUT
          echo "Version: $version"

      - name: Install and Build
        shell: powershell
        run: |
          cd frontend
          npm install -g yarn
          yarn install --ignore-engines
          $env:CI="false"
          $env:DISABLE_ESLINT_PLUGIN="true"
          $env:REACT_APP_BACKEND_URL="https://profile-connector-3.preview.emergentagent.com"
          $env:GENERATE_SOURCEMAP="false"
          yarn build
        env:
          REACT_APP_BACKEND_URL: https://profile-connector-3.preview.emergentagent.com

      - name: Build Electron App (Unsigned)
        shell: powershell
        run: |
          cd frontend
          npx electron-builder --win --x64 --publish never
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Install Azure SignTool
        shell: powershell
        run: |
          dotnet tool install --global AzureSignTool

      - name: Sign Executable with Azure Trusted Signing
        shell: powershell
        run: |
          $exePath = Get-ChildItem -Path "frontend/dist/*.exe" | Select-Object -First 1
          
          AzureSignTool sign `
            --azure-key-vault-url "https://${{ secrets.TRUSTED_SIGNING_ACCOUNT_NAME }}.codesigning.azure.net" `
            --azure-key-vault-client-id "${{ secrets.AZURE_CLIENT_ID }}" `
            --azure-key-vault-client-secret "${{ secrets.AZURE_CLIENT_SECRET }}" `
            --azure-key-vault-tenant-id "${{ secrets.AZURE_TENANT_ID }}" `
            --azure-key-vault-certificate "${{ secrets.TRUSTED_SIGNING_CERT_PROFILE_NAME }}" `
            --timestamp-rfc3161 "http://timestamp.digicert.com" `
            --timestamp-digest sha256 `
            --file-digest sha256 `
            --description "FaceConnect Application" `
            --description-url "https://faceconnect.app" `
            "$($exePath.FullName)"
          
          Write-Host "Signed: $($exePath.FullName)"

      - name: Upload Installer Artifact
        uses: actions/upload-artifact@v4
        with:
          name: FaceConnect-Setup-v${{ steps.version.outputs.VERSION }}
          path: |
            frontend/dist/*.exe
            frontend/dist/*.exe.blockmap
            frontend/dist/latest.yml
          if-no-files-found: warn

      - name: Create GitHub Release
        if: startsWith(github.ref, 'refs/tags/v') || github.event.inputs.publish_release == 'true'
        uses: softprops/action-gh-release@v1
        with:
          tag_name: v${{ steps.version.outputs.VERSION }}
          name: FaceConnect v${{ steps.version.outputs.VERSION }}
          body: |
            ## FaceConnect v${{ steps.version.outputs.VERSION }}
            
            ✅ **This release is digitally signed** - No "Unknown Publisher" warning!
            
            ### Installation
            Download and run `FaceConnect-Setup-${{ steps.version.outputs.VERSION }}.exe` to install.
            
            ### Auto-Update
            If you already have FaceConnect installed, it will automatically update.
          draft: false
          prerelease: false
          fail_on_unmatched_files: false
          files: |
            frontend/dist/*.exe
            frontend/dist/*.exe.blockmap
            frontend/dist/latest.yml
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

### Option B: Traditional Certificate Workflow

```yaml
# .github/workflows/build-windows.yml
name: Build Windows App (Signed)

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      publish_release:
        description: 'Publish as GitHub Release'
        required: false
        default: 'false'
        type: boolean

permissions:
  contents: write

jobs:
  build:
    runs-on: windows-latest
    
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Get version from package.json
        id: version
        shell: powershell
        run: |
          $version = (Get-Content frontend/package.json | ConvertFrom-Json).version
          echo "VERSION=$version" >> $env:GITHUB_OUTPUT
          echo "Version: $version"

      - name: Decode Certificate
        shell: powershell
        run: |
          $certBytes = [Convert]::FromBase64String("${{ secrets.CERTIFICATE_BASE64 }}")
          [IO.File]::WriteAllBytes("$env:RUNNER_TEMP\certificate.pfx", $certBytes)
          echo "Certificate decoded to $env:RUNNER_TEMP\certificate.pfx"

      - name: Install and Build
        shell: powershell
        run: |
          cd frontend
          npm install -g yarn
          yarn install --ignore-engines
          $env:CI="false"
          $env:DISABLE_ESLINT_PLUGIN="true"
          $env:REACT_APP_BACKEND_URL="https://profile-connector-3.preview.emergentagent.com"
          $env:GENERATE_SOURCEMAP="false"
          yarn build
        env:
          REACT_APP_BACKEND_URL: https://profile-connector-3.preview.emergentagent.com

      - name: Build Electron App with Signing
        shell: powershell
        run: |
          cd frontend
          npx electron-builder --win --x64 --publish never
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CSC_LINK: ${{ runner.temp }}\certificate.pfx
          CSC_KEY_PASSWORD: ${{ secrets.CERTIFICATE_PASSWORD }}

      - name: Upload Installer Artifact
        uses: actions/upload-artifact@v4
        with:
          name: FaceConnect-Setup-v${{ steps.version.outputs.VERSION }}
          path: |
            frontend/dist/*.exe
            frontend/dist/*.exe.blockmap
            frontend/dist/latest.yml
          if-no-files-found: warn

      - name: Create GitHub Release
        if: startsWith(github.ref, 'refs/tags/v') || github.event.inputs.publish_release == 'true'
        uses: softprops/action-gh-release@v1
        with:
          tag_name: v${{ steps.version.outputs.VERSION }}
          name: FaceConnect v${{ steps.version.outputs.VERSION }}
          body: |
            ## FaceConnect v${{ steps.version.outputs.VERSION }}
            
            ✅ **This release is digitally signed** - No "Unknown Publisher" warning!
            
            ### Installation
            Download and run `FaceConnect-Setup-${{ steps.version.outputs.VERSION }}.exe` to install.
            
            ### Auto-Update
            If you already have FaceConnect installed, it will automatically update.
          draft: false
          prerelease: false
          fail_on_unmatched_files: false
          files: |
            frontend/dist/*.exe
            frontend/dist/*.exe.blockmap
            frontend/dist/latest.yml
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Cleanup Certificate
        if: always()
        shell: powershell
        run: |
          if (Test-Path "$env:RUNNER_TEMP\certificate.pfx") {
            Remove-Item "$env:RUNNER_TEMP\certificate.pfx" -Force
          }
```

---

## Update package.json for Signing

For **Option B (Traditional Certificate)**, update your `frontend/package.json` build config:

```json
{
  "build": {
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ],
      "icon": "public/icons/icon.ico",
      "publisherName": "FaceConnect Development Team",
      "signAndEditExecutable": true,
      "verifyUpdateCodeSignature": true
    }
  }
}
```

---

## Verification

After building with code signing:

1. Download the new `.exe` from GitHub Releases
2. Right-click → Properties → Digital Signatures tab
3. You should see your certificate listed
4. Windows SmartScreen should no longer show "Unknown Publisher"

---

## Cost Comparison

| Option | Setup Cost | Annual Cost | Complexity |
|--------|-----------|-------------|------------|
| Azure Trusted Signing | Free | ~$120/year | Medium |
| Sectigo/Comodo OV | ~$30 setup | ~$200-226/year | Low |
| EV Certificate | ~$50 setup | ~$270-400/year | Medium |

---

## Next Steps

1. Choose your signing option (Azure or Traditional)
2. Purchase/set up the signing service
3. Add the required secrets to your GitHub repository
4. Copy the appropriate workflow file
5. Create a new release tag (e.g., `v4.7.0`)
6. The build will automatically sign your application!

---

## Troubleshooting

### "Cannot find certificate" error
- Ensure the certificate is properly base64 encoded
- Verify the password is correct
- Check that secrets are properly set in GitHub

### Signing succeeds but SmartScreen still warns
- OV certificates need to build reputation (a few hundred downloads)
- EV certificates have instant reputation
- Azure Trusted Signing has good reputation from Microsoft

### Azure SignTool authentication fails
- Verify Azure CLI is logged in correctly
- Check that the service principal has the "Trusted Signing Certificate Profile Signer" role
- Confirm the certificate profile name matches exactly
