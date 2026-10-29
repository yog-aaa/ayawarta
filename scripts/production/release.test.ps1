# Hermetic command-order tests. No repository service or network is contacted.
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$source = Join-Path $PSScriptRoot "release.ps1"
$sha = "a" * 40
$fixture = Join-Path ([System.IO.Path]::GetTempPath()) ("ayawarta-release-test-" + [guid]::NewGuid().ToString("N"))
$scriptPath = Join-Path $fixture "scripts/production/release.ps1"
$originalLocation = Get-Location

function Assert-That([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}

function Invoke-Scenario {
    param([string]$Mode, [string]$State, [bool]$Resume = $false,
          [bool]$Attest = $true, [bool]$PreflightFails = $false,
          [bool]$SeedFails = $false,
          [bool]$ExpectSuccess = $true)
    $global:releaseEvents = [System.Collections.Generic.List[string]]::new()
    $global:releaseState = $State
    $global:releaseAttest = $Attest
    $global:releasePreflightFails = $PreflightFails
    $global:releaseSeedFails = $SeedFails
    $global:LASTEXITCODE = 0

    function git {
        $key = "$args"
        $global:releaseEvents.Add("git $key")
        $global:LASTEXITCODE = 0
        switch ($key) {
            "branch --show-current" { "main" }
            "rev-parse HEAD" { $sha }
            "remote get-url origin" { "https://github.com/yog-aaa/ayawarta.git" }
            "rev-parse origin/main" { "b" * 40 }
            "ls-remote origin refs/heads/main" { "$sha`trefs/heads/main" }
        }
    }
    function pnpm.cmd {
        $key = "$args"
        $global:releaseEvents.Add("pnpm $key")
        $global:LASTEXITCODE = 0
        if ($key -eq "--version") { "10.34.7" }
        if ($key -eq "prod:verify --release-state --execute") {
            if ($global:releasePreflightFails) { $global:LASTEXITCODE = 1; return }
            "[Prod Verify] Release state: $global:releaseState"
        }
        if ($key -eq "prod:seed --execute" -and $global:releaseSeedFails) {
            $global:LASTEXITCODE = 1
        }
    }
    function Read-Host {
        param([string]$Prompt)
        $global:releaseEvents.Add("attestation")
        if ($global:releaseAttest) { "VERCEL-TARGETS-VERIFIED:$sha" } else { "mismatch" }
    }

    $succeeded = $false
    try {
        $switches = @{ Mode = $Mode; ApprovedCommit = $sha; Execute = $true }
        if ($Resume) { $switches.ResumeBootstrap = $true }
        $output = @(& $scriptPath @switches 2>&1 6>&1) | Out-String
        $succeeded = $true
        Assert-That ($output.Contains("Vercel deployment trigger: unverified") -and
            $output.Contains("Vercel Ready for this SHA: unverified")) "Deploy status must remain unverified."
    } catch {
        if ($ExpectSuccess) { throw }
    } finally {
        Set-Location -LiteralPath $fixture
    }
    Assert-That ($succeeded -eq $ExpectSuccess) "Unexpected release result for $Mode/$State."

    $events = @($global:releaseEvents)
    $migrate = @($events | Where-Object { $_ -eq "pnpm prod:migrate --execute" }).Count
    $seed = @($events | Where-Object { $_ -eq "pnpm prod:seed --execute" }).Count
    $push = @($events | Where-Object { $_ -eq "git push origin main:main" }).Count
    if ($SeedFails) {
        Assert-That ($migrate -eq 1 -and $seed -eq 1 -and $push -eq 0) "Seed failure must stop before push."
    } elseif (-not $ExpectSuccess) {
        Assert-That ($migrate -eq 0 -and $seed -eq 0 -and $push -eq 0) "Mutation escaped a failed preflight."
    } elseif ($Mode -eq "Update") {
        Assert-That ($migrate -eq 1 -and $seed -eq 0 -and $push -eq 1) "Update command order/count is wrong."
    } elseif ($Resume) {
        Assert-That ($migrate -eq 0 -and $seed -eq 1 -and $push -eq 1) "Recovery command order/count is wrong."
    } else {
        Assert-That ($migrate -eq 1 -and $seed -eq 1 -and $push -eq 1) "Bootstrap command order/count is wrong."
    }
    if ($ExpectSuccess) {
        $attestIndex = [array]::IndexOf($events, "attestation")
        $stateIndex = [array]::IndexOf($events, "pnpm prod:verify --release-state --execute")
        $pushIndex = [array]::IndexOf($events, "git push origin main:main")
        Assert-That ($attestIndex -ge 0 -and $stateIndex -gt $attestIndex -and $pushIndex -gt $stateIndex) "Gate order is wrong."
    }
}

try {
    New-Item -ItemType Directory -Path (Split-Path $scriptPath) -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $scriptPath
    Set-Content -LiteralPath (Join-Path $fixture ".env.production") -Value "APPROVED_NEON_TARGET_FINGERPRINT=fixture-only" -NoNewline

    $dry = @(& $scriptPath -Mode Update -ApprovedCommit $sha 2>&1 6>&1) | Out-String
    Assert-That ($dry.Contains("Dry run")) "Default mode must remain dry-run."

    Invoke-Scenario -Mode Bootstrap -State uninitialized
    Invoke-Scenario -Mode Bootstrap -State seed-ready -Resume $true
    Invoke-Scenario -Mode Update -State seeded
    Invoke-Scenario -Mode Update -State uninitialized -ExpectSuccess $false
    Invoke-Scenario -Mode Update -State seed-ready -ExpectSuccess $false
    Invoke-Scenario -Mode Bootstrap -State seed-ready -ExpectSuccess $false
    Invoke-Scenario -Mode Bootstrap -State seeded -ExpectSuccess $false
    Invoke-Scenario -Mode Bootstrap -State seeded -Resume $true -ExpectSuccess $false
    Invoke-Scenario -Mode Update -State seeded -Attest $false -ExpectSuccess $false
    Invoke-Scenario -Mode Update -State seeded -PreflightFails $true -ExpectSuccess $false
    Invoke-Scenario -Mode Bootstrap -State uninitialized -SeedFails $true -ExpectSuccess $false
    Write-Host "PASS: 11 hermetic release scenarios and default dry-run."
} finally {
    Set-Location $originalLocation
    Remove-Item -LiteralPath $fixture -Recurse -Force
}
