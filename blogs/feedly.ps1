# Feedly CLI - Export and manage Feedly boards and articles
#
# Usage:
#   .\feedly.ps1              # Export all boards
#   .\feedly.ps1 -Untagged    # Export untagged articles from All feed
#   .\feedly.ps1 -Tag         # Tag articles from tagged.json/untagged.json
#   .\feedly.ps1 -Summary     # Generate summary from existing data
#   .\feedly.ps1 -Reset       # Clear saved login session
#   .\feedly.ps1 -Help        # Show help

param(
    [switch]$Help,
    [switch]$Summary,
    [switch]$Reset,
    [switch]$Untagged,
    [switch]$Tag
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SrcDir = Join-Path $ScriptDir "src"
Set-Location $SrcDir

function Show-Help {
    Write-Host ""
    Write-Host "Feedly CLI"
    Write-Host "=========="
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\feedly.ps1              Export all boards"
    Write-Host "  .\feedly.ps1 -Untagged    Export untagged articles from All feed"
    Write-Host "  .\feedly.ps1 -Tag         Tag articles from tagged.json/untagged.json"
    Write-Host "  .\feedly.ps1 -Summary     Generate summary from existing data"
    Write-Host "  .\feedly.ps1 -Reset       Clear saved login session"
    Write-Host "  .\feedly.ps1 -Help        Show this help"
    Write-Host ""
    Write-Host "Workflows:"
    Write-Host "  1. Export Boards: Exports all boards (excludes _tagged/_untagged)"
    Write-Host "  2. Untagged Feed: Exports articles not yet categorized"
    Write-Host "     - Creates: data/articles/raw.json"
    Write-Host "     - Manually create: data/articles/tagged.json, untagged.json"
    Write-Host "  3. Tag Articles: Adds articles to _tagged or _untagged boards"
    Write-Host ""
    Write-Host "Prerequisites:"
    Write-Host "  Run Edge with remote debugging:"
    Write-Host '  & "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222'
    Write-Host ""
}

function Install-Deps {
    $nodeModulesPath = Join-Path $SrcDir "node_modules"
    if (-not (Test-Path $nodeModulesPath)) {
        Write-Host "📦 Installing dependencies..."
        npm install
    }
}

if ($Help) {
    Show-Help
}
elseif ($Summary) {
    node workflow.js --summary
}
elseif ($Reset) {
    Write-Host "🗑️  Clearing saved session..."
    $browserDataPath = Join-Path $SrcDir ".browser-data"
    if (Test-Path $browserDataPath) {
        Remove-Item -Recurse -Force $browserDataPath
    }
    Write-Host "✓ Session cleared. You'll need to log in again next run."
}
elseif ($Untagged) {
    Install-Deps
    Write-Host ""
    Write-Host "📰 Exporting untagged articles from All feed..."
    Write-Host ""
    Write-Host "Removing files from previous runs..."
    Remove-Item -Recurse -Force (Join-Path $SrcDir "..\data\articles\*") -ErrorAction SilentlyContinue
    node export_untagged.js
}
elseif ($Tag) {
    Install-Deps
    Write-Host ""
    Write-Host "🏷️  Tagging articles..."
    Write-Host ""
    node tag_articles.js
}
else {
    Install-Deps
    Write-Host "Removing files from previous runs..."
    Get-ChildItem -Path (Join-Path $SrcDir "..\data") -File | Remove-Item -Force -ErrorAction SilentlyContinue
    node export_boards.js
}
