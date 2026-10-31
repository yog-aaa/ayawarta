# Read-only Neon dump encrypted for the current Windows user before disk write.
[CmdletBinding()]
param([switch]$Execute, [switch]$Preflight)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$backupRoot = Join-Path (Split-Path -Parent $repoRoot) 'backups\production-neon'
$dumpProgram = 'C:\src\laragon\bin\postgresql\postgresql\bin\pg_dump.exe'
$expectedFingerprint = 'ep-mute-water-azaf9oyl:ayawarta:neondb_owner'

if (-not $Execute -and -not $Preflight) {
    Write-Output 'Dry run: no database connection or file write.'
    Write-Output "Planned target: $expectedFingerprint"
    Write-Output "Encrypted destination: $backupRoot"
    Write-Output 'Method: pg_dump custom archive -> memory -> DPAPI CurrentUser -> local file.'
    return
}

if (-not (Test-Path -LiteralPath $dumpProgram -PathType Leaf)) {
    throw 'Pinned pg_dump executable is unavailable.'
}

function Get-ConfigValue([string]$name) {
    $envPath = Join-Path $repoRoot '.env.production'
    if (-not (Test-Path -LiteralPath $envPath -PathType Leaf)) {
        throw 'Production configuration is missing.'
    }
    $matches = @(Get-Content -LiteralPath $envPath | Where-Object { $_ -match "^\s*$name\s*=" })
    if ($matches.Count -ne 1) { throw "Expected exactly one $name entry." }
    $value = ($matches[0] -split '=', 2)[1].Trim()
    if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'")))) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    if (-not $value) { throw "$name is empty." }
    return $value
}

$direct = Get-ConfigValue 'DATABASE_URL'
$pooled = Get-ConfigValue 'DATABASE_URL_POOLED'
$approved = Get-ConfigValue 'APPROVED_NEON_TARGET_FINGERPRINT'
if ($approved -cne $expectedFingerprint) { throw 'Approved Neon target changed.' }
try {
    $directUri = [Uri]::new($direct)
    $pooledUri = [Uri]::new($pooled)
} catch { throw 'Neon URL parsing failed.' }

$parts = $expectedFingerprint.Split(':')
$endpoint = $parts[0]
$database = $parts[1]
$role = $parts[2]
$directHost = $directUri.Host.ToLowerInvariant()
$pooledHost = $pooledUri.Host.ToLowerInvariant()
$directPrefix = "$endpoint."
$pooledPrefix = "$endpoint-pooler."
if ($directUri.Scheme -notin @('postgres', 'postgresql') -or
    $pooledUri.Scheme -notin @('postgres', 'postgresql') -or
    $directUri.Port -notin @(-1, 5432) -or $pooledUri.Port -notin @(-1, 5432) -or
    -not $directHost.StartsWith($directPrefix) -or
    -not $pooledHost.StartsWith($pooledPrefix) -or
    -not $directHost.EndsWith('.neon.tech') -or
    -not $pooledHost.EndsWith('.neon.tech') -or
    $directHost.Substring($directPrefix.Length) -cne $pooledHost.Substring($pooledPrefix.Length) -or
    [Uri]::UnescapeDataString($directUri.AbsolutePath.TrimStart('/')) -cne $database -or
    [Uri]::UnescapeDataString($pooledUri.AbsolutePath.TrimStart('/')) -cne $database) {
    throw 'Neon direct/pooled target mismatch.'
}

$directUserInfo = $directUri.UserInfo.Split(':', 2)
$pooledUserInfo = $pooledUri.UserInfo.Split(':', 2)
if ($directUserInfo.Count -ne 2 -or $pooledUserInfo.Count -ne 2 -or
    [Uri]::UnescapeDataString($directUserInfo[0]) -cne $role -or
    [Uri]::UnescapeDataString($pooledUserInfo[0]) -cne $role) {
    throw 'Neon role mismatch.'
}
if ($directUri.Query -notmatch '(?:^\?|&)sslmode=(?:require|verify-full)(?:&|$)' -or
    $pooledUri.Query -notmatch '(?:^\?|&)sslmode=(?:require|verify-full)(?:&|$)') {
    throw 'TLS enforcement is absent.'
}
if ($directHost -notmatch '^[a-z0-9.-]+$' -or $database -notmatch '^[a-z0-9_]+$' -or
    $role -notmatch '^[a-z0-9_]+$') { throw 'Unsupported target characters.' }

# Laragon's libpq does not reliably load Windows roots via sslrootcert=system.
$rootCert = Get-ChildItem Cert:\CurrentUser\Root, Cert:\LocalMachine\Root -ErrorAction SilentlyContinue |
    Where-Object { $_.Subject -eq 'CN=ISRG Root X1, O=Internet Security Research Group, C=US' -and
        $_.NotAfter.ToUniversalTime() -gt [DateTime]::UtcNow -and
        $_.GetCertHashString([Security.Cryptography.HashAlgorithmName]::SHA256) -ceq
            '96BCEC06264976F37460779ACF28C5A7CFE8A3C0AAE11A8FFCEE05C0BDDF08C6' } |
    Select-Object -First 1
if (-not $rootCert) { throw 'Trusted ISRG Root X1 certificate is unavailable.' }
$caFile = Join-Path ([IO.Path]::GetTempPath()) ("ayawarta-neon-ca-" + [Guid]::NewGuid().ToString('N') + '.pem')

$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = $dumpProgram
$startInfo.Arguments = "--format=custom --no-password --host=$directHost --port=5432 --username=$role --dbname=$database"
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
# libpq gives several PG* variables precedence over CLI parameters (notably
# PGHOSTADDR). Never allow the caller's environment to redirect this connection.
foreach ($key in @($startInfo.EnvironmentVariables.Keys)) {
    if ([string]$key -match '^PG[A-Z0-9_]+$') {
        $startInfo.EnvironmentVariables.Remove([string]$key)
    }
}
$startInfo.EnvironmentVariables['PGPASSWORD'] = [Uri]::UnescapeDataString($directUserInfo[1])
$startInfo.EnvironmentVariables['PGSSLMODE'] = 'verify-full'
$startInfo.EnvironmentVariables['PGSSLROOTCERT'] = $caFile
$startInfo.EnvironmentVariables['PGCHANNELBINDING'] = 'require'
if ($Preflight -and -not $Execute) {
    $otherPg = @($startInfo.EnvironmentVariables.Keys | Where-Object {
        $_ -match '^PG[A-Z0-9_]+$' -and $_ -notin @('PGPASSWORD', 'PGSSLMODE', 'PGSSLROOTCERT', 'PGCHANNELBINDING')
    })
    if ($otherPg.Count -gt 0) { throw 'libpq environment isolation failed.' }
    Write-Output "PASS: production target $expectedFingerprint and libpq environment verified without a connection."
    return
}

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $startInfo
$memory = New-Object System.IO.MemoryStream
$started = $false
$plain = $null
$encrypted = $null
$chunk = $null
$publishedFile = $null
$verifiedFile = $false
try {
    $pem = "-----BEGIN CERTIFICATE-----`n" +
        [Convert]::ToBase64String($rootCert.RawData, [Base64FormattingOptions]::InsertLineBreaks) +
        "`n-----END CERTIFICATE-----`n"
    [IO.File]::WriteAllText($caFile, $pem, [Text.Encoding]::ASCII)
    if (-not $process.Start()) { throw 'pg_dump could not start.' }
    $started = $true
    $stderrTask = $process.StandardError.ReadToEndAsync() # never display raw driver errors
    $chunk = New-Object byte[] (1024 * 1024)
    $maxBytes = 256 * 1024 * 1024
    $timer = [Diagnostics.Stopwatch]::StartNew()
    while ($true) {
        $remainingMs = [int][Math]::Max(1, 120000 - $timer.ElapsedMilliseconds)
        $readTask = $process.StandardOutput.BaseStream.ReadAsync($chunk, 0, $chunk.Length)
        if (-not $readTask.Wait($remainingMs)) {
            $process.Kill()
            throw 'pg_dump exceeded the two-minute safety timeout.'
        }
        $read = $readTask.Result
        if ($read -eq 0) { break }
        if ($memory.Length + $read -gt $maxBytes) {
            $process.Kill()
            throw 'Dump exceeds the 256 MiB in-memory safety cap.'
        }
        $memory.Write($chunk, 0, $read)
    }
    $remainingMs = [int][Math]::Max(1, 120000 - $timer.ElapsedMilliseconds)
    if (-not $process.WaitForExit($remainingMs)) {
        $process.Kill()
        throw 'pg_dump exceeded the two-minute safety timeout.'
    }
    if ($process.ExitCode -ne 0) {
        $diagnostic = if ($stderrTask.Wait(5000)) { $stderrTask.Result } else { '' }
        $reason = if ($diagnostic -match 'root certificate|certificate verify') { 'certificate trust' }
            elseif ($diagnostic -match 'channel binding') { 'channel binding' }
            elseif ($diagnostic -match 'password authentication') { 'authentication' }
            elseif ($diagnostic -match 'could not translate host|could not resolve') { 'DNS' }
            elseif ($diagnostic -match 'server version mismatch') { 'version mismatch' }
            elseif ($diagnostic -match 'permission denied') { 'database permission' }
            else { 'unclassified' }
        throw "pg_dump failed ($reason); raw diagnostics suppressed."
    }
    $plain = $memory.ToArray()
    if ($plain.Length -lt 5 -or [Text.Encoding]::ASCII.GetString($plain, 0, 5) -cne 'PGDMP') {
        throw 'Archive header is invalid.'
    }
    Add-Type -AssemblyName System.Security
    $encrypted = [Security.Cryptography.ProtectedData]::Protect(
        $plain, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
    $roundTrip = [Security.Cryptography.ProtectedData]::Unprotect(
        $encrypted, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
    try {
        $sha = [Security.Cryptography.SHA256]::Create()
        try {
            $plainHash = [BitConverter]::ToString($sha.ComputeHash($plain))
            $restoredHash = [BitConverter]::ToString($sha.ComputeHash($roundTrip))
        } finally { $sha.Dispose() }
        if ($plainHash -cne $restoredHash) {
            throw 'DPAPI round-trip verification failed.'
        }
    } finally { [Array]::Clear($roundTrip, 0, $roundTrip.Length) }

    $null = New-Item -ItemType Directory -Path $backupRoot -Force
    $stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssfffZ')
    $nonce = [Guid]::NewGuid().ToString('N').Substring(0, 8)
    $file = Join-Path $backupRoot "ayawarta-neon-$stamp-$nonce.pgdump.dpapi"
    if (Test-Path -LiteralPath $file) { throw 'Backup filename collision.' }
    $temp = "$file.partial"
    try {
        $writer = [IO.File]::Open($temp, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
        try {
            $writer.Write($encrypted, 0, $encrypted.Length)
            $writer.Flush($true)
        } finally { $writer.Dispose() }
        Move-Item -LiteralPath $temp -Destination $file
        $publishedFile = $file
    } finally {
        if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Force }
    }
    $saved = [IO.File]::ReadAllBytes($file)
    try {
        $savedPlain = [Security.Cryptography.ProtectedData]::Unprotect(
            $saved, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
        try {
            if ($savedPlain.Length -ne $plain.Length -or
                [Text.Encoding]::ASCII.GetString($savedPlain, 0, 5) -cne 'PGDMP') {
                throw 'Saved encrypted archive failed verification.'
            }
            $sha = [Security.Cryptography.SHA256]::Create()
            try {
                if ([BitConverter]::ToString($sha.ComputeHash($savedPlain)) -cne $plainHash) {
                    throw 'Saved encrypted archive content mismatch.'
                }
            } finally { $sha.Dispose() }
        } finally { [Array]::Clear($savedPlain, 0, $savedPlain.Length) }
    } finally { [Array]::Clear($saved, 0, $saved.Length) }
    $hash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
    $verifiedFile = $true
    Write-Output "Backup complete: $file"
    Write-Output "Encrypted bytes: $($encrypted.Length); SHA-256: $hash"
    Write-Output 'Restore compatibility: current Windows user profile only.'
} finally {
    if ($publishedFile -and -not $verifiedFile -and (Test-Path -LiteralPath $publishedFile)) {
        Remove-Item -LiteralPath $publishedFile -Force
    }
    if ($started -and -not $process.HasExited) { $process.Kill() }
    $process.Dispose()
    $startInfo.EnvironmentVariables.Remove('PGPASSWORD')
    $backing = $memory.GetBuffer()
    [Array]::Clear($backing, 0, $backing.Length)
    $memory.Dispose()
    if ($chunk) { [Array]::Clear($chunk, 0, $chunk.Length) }
    if ($plain) { [Array]::Clear($plain, 0, $plain.Length) }
    if ($encrypted) { [Array]::Clear($encrypted, 0, $encrypted.Length) }
    if (Test-Path -LiteralPath $caFile) { Remove-Item -LiteralPath $caFile -Force }
}
