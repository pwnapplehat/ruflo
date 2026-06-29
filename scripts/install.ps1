<#
.SYNOPSIS
    Ruflo Installer for Windows (Cursor-native)
    PowerShell equivalent of scripts/install.sh.

.DESCRIPTION
    https://github.com/ruvnet/ruflo

    Native Windows installer that works in PowerShell and cmd without requiring
    Git-Bash, WSL, or MSYS. Mirrors install.sh's flag surface.

.PARAMETER Global
    Global install (npm install -g ruflo).

.PARAMETER Minimal
    Minimal install (no optional deps: --omit=optional).

.PARAMETER Full
    Full setup (global + init wizard).

.PARAMETER SetupMcp
    Write .cursor/mcp.json after install.

.PARAMETER Doctor
    Run `ruflo doctor` after install.

.PARAMETER NoInit
    Skip the init wizard.

.PARAMETER Version
    Specific version (default: latest).

.EXAMPLE
    irm https://cdn.jsdelivr.net/gh/ruvnet/ruflo@main/scripts/install.ps1 | iex
.EXAMPLE
    .\scripts\install.ps1 -Full
.EXAMPLE
    .\scripts\install.ps1 -Global -Minimal
#>

[CmdletBinding()]
param(
    [Alias('g')][switch]$Global,
    [Alias('m')][switch]$Minimal,
    [switch]$Full,
    [Alias('mcp')][switch]$SetupMcp,
    [Alias('d')][switch]$Doctor,
    [Alias('i')][switch]$Init,
    [switch]$NoInit,
    [string]$Version = 'latest',
    [string]$TargetDir = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# --- Helpers -----------------------------------------------------------------

function Write-Step { param([string]$msg) Write-Host "[ruflo] $msg" -ForegroundColor Cyan }
function Write-Ok { param([string]$msg) Write-Host "[ruflo] $msg" -ForegroundColor Green }
function Write-Warn { param([string]$msg) Write-Host "[ruflo] $msg" -ForegroundColor Yellow }
function Write-Err { param([string]$msg) Write-Host "[ruflo] $msg" -ForegroundColor Red }

function Test-Command { param([string]$cmd)
    try { Get-Command $cmd -ErrorAction Stop | Out-Null; return $true } catch { return $false }
}

# --- Pre-flight checks -------------------------------------------------------

Write-Step "Ruflo Installer for Windows (Cursor-native)"

if (-not (Test-Command 'node')) {
    Write-Err "Node.js is not installed or not on PATH. Install Node.js >= 20 from https://nodejs.org/"
    exit 1
}

$nodeVersion = (node --version 2>$null)
Write-Step "Node.js version: $nodeVersion"

if (-not (Test-Command 'npm')) {
    Write-Err "npm is not installed or not on PATH. npm ships with Node.js."
    exit 1
}

# Resolve -Full into its constituent flags
if ($Full) {
    $Global = $true
    $Init = $true
    $SetupMcp = $true
    $Doctor = $true
}

# Env-var overrides (mirror install.sh)
if ($env:RUFLO_VERSION) { $Version = $env:RUFLO_VERSION }
elseif ($env:CLAUDE_FLOW_VERSION) { $Version = $env:CLAUDE_FLOW_VERSION }
if ($env:CLAUDE_FLOW_GLOBAL -eq '1') { $Global = $true }
if ($env:CLAUDE_FLOW_MINIMAL -eq '1') { $Minimal = $true }
if ($env:CLAUDE_FLOW_SETUP_MCP -eq '1') { $SetupMcp = $true }
if ($env:CLAUDE_FLOW_DOCTOR -eq '1') { $Doctor = $true }
if ($env:CLAUDE_FLOW_INIT -eq '0') { $NoInit = $true }

$pkgSpec = if ($Version -eq 'latest') { 'ruflo@latest' } else { "ruflo@$Version" }

# --- Install -----------------------------------------------------------------

if ($Global) {
    Write-Step "Global install: npm install -g $pkgSpec"
    if ($Minimal) {
        npm install -g $pkgSpec --omit=optional
    } else {
        npm install -g $pkgSpec
    }
    if ($LASTEXITCODE -ne 0) { Write-Err "Global install failed."; exit $LASTEXITCODE }
    Write-Ok "Installed $pkgSpec globally."
} else {
    Write-Step "Local install in $TargetDir"
    Push-Location $TargetDir
    try {
        if (-not (Test-Path 'package.json')) {
            npm init -y *>$null
        }
        if ($Minimal) {
            npm install $pkgSpec --omit=optional
        } else {
            npm install $pkgSpec
        }
        if ($LASTEXITCODE -ne 0) { Write-Err "Local install failed."; exit $LASTEXITCODE }
        Write-Ok "Installed $pkgSpec locally."
    } finally { Pop-Location }
}

# --- Verify ------------------------------------------------------------------

$rufloCmd = if ($Global) { 'ruflo' } else { 'npx ruflo' }
Write-Step "Verifying install: $rufloCmd --version"
try {
    if ($Global) { $ver = ruflo --version 2>$null } else { $ver = npx ruflo --version 2>$null }
    Write-Ok "Ruflo version: $ver"
} catch {
    Write-Warn "Could not verify ruflo version (non-fatal)."
}

# --- MCP setup ---------------------------------------------------------------

if ($SetupMcp) {
    Write-Step "Writing .cursor/mcp.json"
    $cursorDir = Join-Path $TargetDir '.cursor'
    if (-not (Test-Path $cursorDir)) { New-Item -ItemType Directory -Path $cursorDir -Force | Out-Null }
    $mcpJson = Join-Path $cursorDir 'mcp.json'
    $mcpContent = @{
        mcpServers = @{
            ruflo = @{
                command = 'cmd'
                args = @('/c', 'npx', '-y', 'ruflo@latest', 'mcp', 'start')
                env = @{
                    RUFLO_MODE = 'v3'
                    RUFLO_HOST = 'cursor'
                    CLAUDE_FLOW_HOOKS_ENABLED = 'true'
                }
            }
        }
    } | ConvertTo-Json -Depth 10
    Set-Content -Path $mcpJson -Value $mcpContent -Encoding UTF8
    Write-Ok "Wrote $mcpJson â€” reload Cursor (Developer: Reload Window) to load the MCP server."
}

# --- Init wizard -------------------------------------------------------------

if (-not $NoInit) {
    Write-Step "Running init wizard (Cursor-native)..."
    try {
        if ($Global) { ruflo init wizard } else { npx ruflo init wizard }
        if ($LASTEXITCODE -ne 0) { Write-Warn "Init wizard exited with code $LASTEXITCODE (non-fatal)." }
    } catch {
        Write-Warn "Init wizard could not run (non-fatal): $($_.Exception.Message)"
    }
}

# --- Doctor ------------------------------------------------------------------

if ($Doctor) {
    Write-Step "Running doctor..."
    try {
        if ($Global) { ruflo doctor } else { npx ruflo doctor }
    } catch {
        Write-Warn "Doctor could not run (non-fatal): $($_.Exception.Message)"
    }
}

# --- Done --------------------------------------------------------------------

Write-Ok "Ruflo installation complete."
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Open this project in Cursor." -ForegroundColor Gray
Write-Host "  2. Reload the window (Developer: Reload Window) to load .cursor/mcp.json." -ForegroundColor Gray
Write-Host "  3. The ~330 ruflo MCP tools (mcp__ruflo__*) will appear in Cursor." -ForegroundColor Gray
Write-Host "  4. Agents are in .cursor/agents/, skills in .cursor/skills/." -ForegroundColor Gray
Write-Host "  5. Hooks in .cursor/hooks.json wire ruflo intelligence into Cursor events." -ForegroundColor Gray
if (-not $env:CURSOR_API_KEY) {
    Write-Host ""
    Write-Warn "CURSOR_API_KEY not set â€” headless background workers that spawn SDK agents will be disabled."
    Write-Warn "Set it via: `$env:CURSOR_API_KEY = 'cursor_...'  (Cursor Dashboard -> Integrations)"
}
Write-Host ""
Write-Ok "Done."
