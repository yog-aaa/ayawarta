# Runs database preparation and triggers the Vercel Production Git deployment.
# Bootstrap is for an uninitialized Neon database only. Update never re-runs the seed.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("Bootstrap", "Update")]
    [string]$Mode,

    [Parameter(Mandatory = $true)]
    [ValidatePattern("^[0-9a-fA-F]{40}$")]
    [string]$ApprovedCommit,

    [switch]$ResumeBootstrap,
    [switch]$Execute
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if ($ResumeBootstrap -and $Mode -ne "Bootstrap") {
    throw "ResumeBootstrap is available only in Bootstrap mode."
}

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path
Set-Location -LiteralPath $repoRoot

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][string]$Program,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    # Suppress raw child output: a driver or CLI error may contain credentials.
    $null = @(& $Program @Arguments 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed. Release stopped."
    }
    Write-Host "PASS: $Label"
}

function Get-ReleaseState {
    $output = @(& pnpm.cmd prod:verify --release-state --execute 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw "Neon release-state check failed. Release stopped; inspect Neon state before retrying."
    }
    $markers = @($output | Where-Object { $_ -cmatch '^\[Prod Verify\] Release state: (uninitialized|seed-ready|seeded)$' })
    if ($markers.Count -ne 1) {
        throw "Neon release-state check was ambiguous. Release stopped; inspect Neon state before retrying."
    }
    return ([regex]::Match([string]$markers[0], '^\[Prod Verify\] Release state: (uninitialized|seed-ready|seeded)$')).Groups[1].Value
}

if (-not $Execute) {
    Write-Host "Dry run: no external commands, Neon connection, or Git push."
    Write-Host "Mode: $Mode; resume bootstrap: $([bool]$ResumeBootstrap); approved commit: $ApprovedCommit"
    Write-Host "Planned gates: Git identity and clean tree, project checks, Vercel Production target attestation, read-only Neon state."
    if ($Mode -eq "Update") {
        Write-Host "Update requires a proven prior bootstrap, then migrates and pushes. Seed is never repeated."
    } elseif ($ResumeBootstrap) {
        Write-Host "Recovery requires a fully migrated, empty application schema; it skips migration and runs the one-time seed."
    } else {
        Write-Host "Bootstrap requires an uninitialized schema, then migrates and runs the one-time seed."
    }
    Write-Host "After push, verify deployment for this exact commit in Vercel; Ready is not inferred."
    return
}

$migrationStarted = $false
try {
    $branch = (& git branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or $branch -cne "main") {
        throw "Release requires the local main branch."
    }

    $head = (& git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0 -or $head -cne $ApprovedCommit.ToLowerInvariant()) {
        throw "HEAD differs from the explicitly approved 40-character commit."
    }

    $remoteUrl = (& git remote get-url origin).Trim()
    if ($LASTEXITCODE -ne 0 -or $remoteUrl -notmatch "^(https://github\.com/yog-aaa/ayawarta(\.git)?|git@github\.com:yog-aaa/ayawarta(\.git)?)$") {
        throw "Git origin is not the approved AyaWarta repository."
    }

    if (@(& git status --porcelain --untracked-files=all).Count -ne 0) {
        throw "The worktree must be clean before a production release."
    }

    if (-not (Test-Path -LiteralPath ".env.production")) {
        throw "The ignored .env.production file is required for production database commands."
    }
    if (-not (Select-String -LiteralPath ".env.production" -Pattern '^\s*APPROVED_NEON_TARGET_FINGERPRINT\s*=\s*\S+' -Quiet)) {
        throw "The approved Neon endpoint/database/role fingerprint is missing."
    }

    Invoke-Checked "refresh origin/main" "git" @("fetch", "origin", "main")
    & git merge-base --is-ancestor origin/main HEAD
    if ($LASTEXITCODE -ne 0) {
        throw "Local main does not contain the current origin/main. Resolve branch divergence before release."
    }
    $remoteHead = (& git rev-parse origin/main).Trim()
    if ($LASTEXITCODE -ne 0 -or $remoteHead -ceq $head) {
        throw "origin/main already points to this commit; a Git push would not trigger a new deployment."
    }

    $versionOutput = @(& pnpm.cmd --version)
    if ($LASTEXITCODE -ne 0 -or ($versionOutput | Select-Object -Last 1).Trim() -cne "10.34.7") {
        throw "The repository requires pnpm 10.34.7."
    }

    Invoke-Checked "frozen dependency install" "pnpm.cmd" @("install", "--frozen-lockfile")
    Invoke-Checked "unit tests" "pnpm.cmd" @("test")
    Invoke-Checked "TypeScript check" "pnpm.cmd" @("typecheck")
    Invoke-Checked "ESLint" "pnpm.cmd" @("lint")
    Invoke-Checked "Prisma schema validation" "pnpm.cmd" @("prisma:validate")
    Invoke-Checked "production build" "pnpm.cmd" @("build")

    if (@(& git status --porcelain --untracked-files=all).Count -ne 0) {
        throw "Verification changed tracked or untracked files. Review them before release."
    }

    Write-Host "Inspect the linked Vercel project and Production scope. Confirm DATABASE_URL is direct Neon and DATABASE_URL_POOLED is the matching pooled target; both must match the approved local target."
    Write-Host "If a sensitive value cannot be independently checked against the approved secret source, stop. Names or an old deployment are insufficient evidence."
    $approvedSha = $ApprovedCommit.ToLowerInvariant()
    $attestation = Read-Host "After checking both values and the Production Git branch, type VERCEL-TARGETS-VERIFIED:$approvedSha"
    if ($attestation -cne "VERCEL-TARGETS-VERIFIED:$approvedSha") {
        throw "Vercel Production target attestation was not provided. No Neon mutation or push was started."
    }

    $state = Get-ReleaseState
    Write-Host "PASS: read-only Neon release state is $state."
    if ($Mode -eq "Update" -and $state -cne "seeded") {
        throw "Update requires a proven prior bootstrap. No migration, seed, or push was started."
    }
    if ($Mode -eq "Bootstrap" -and -not $ResumeBootstrap -and $state -cne "uninitialized") {
        throw "Initial Bootstrap requires an uninitialized schema. Inspect state before retrying."
    }
    if ($ResumeBootstrap -and $state -cne "seed-ready") {
        throw "ResumeBootstrap requires a complete migrated schema with zero application rows."
    }

    if (-not $ResumeBootstrap) {
        $migrationStarted = $true
        Invoke-Checked "guarded Neon migration" "pnpm.cmd" @("prod:migrate", "--execute")
    }

    if ($Mode -eq "Bootstrap") {
        $migrationStarted = $true
        Invoke-Checked "one-time canonical seed" "pnpm.cmd" @("prod:seed", "--execute")
        Invoke-Checked "exact bootstrap verification" "pnpm.cmd" @("prod:verify", "--execute")
    } else {
        Write-Host "Seed skipped: update releases preserve database content managed after bootstrap."
    }

    $postState = Get-ReleaseState
    if ($postState -cne "seeded") {
        throw "Post-migration Neon release state is not seeded. No Git push was started."
    }
    Write-Host "PASS: post-migration Neon release state is seeded."

    Invoke-Checked "push approved commit to origin/main" "git" @("push", "origin", "main:main")

    $remoteLine = @(& git ls-remote origin refs/heads/main)
    if ($LASTEXITCODE -ne 0 -or $remoteLine.Count -ne 1) {
        throw "Could not confirm origin/main after push. Check GitHub and Vercel before retrying."
    }
    $publishedCommit = ($remoteLine[0] -split "\s+")[0]
    if ($publishedCommit -cne $head) {
        throw "origin/main does not point to the approved commit after push."
    }

    Write-Host "Git push: succeeded; origin/main points to approved commit $approvedSha."
    Write-Host "Vercel deployment trigger: unverified. Check the linked project's Production deployments for this SHA."
    Write-Host "Vercel Ready for this SHA: unverified. Confirm Ready in Vercel, then smoke-test production routes, admin login, and Firestore wishes."
} catch {
    if ($migrationStarted) {
        Write-Warning "Neon may have been changed. Do not roll back automatically or rerun bootstrap. Inspect migration and seed state before retrying."
    }
    throw
}
