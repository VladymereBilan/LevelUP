<#
.SYNOPSIS
  Restore-tests a GPG-encrypted production backup (see docs/PRODUCTION.md "Backups") against
  the LOCAL Supabase instance only, then prints row counts for a handful of key tables.

.DESCRIPTION
  1. Prompts for the backup's GPG passphrase securely (Read-Host -AsSecureString) - never as a
     command-line argument, never logged.
  2. Decrypts the given backup artifact with "gpg --batch --pinentry-mode loopback
     --passphrase-fd 0" (same mechanism as .github/workflows/backup.yml's encrypt/verify steps,
     for the same reason: --decrypt always negotiates the passphrase through gpg-agent, which
     rejects a bare --passphrase without --pinentry-mode loopback).
  3. Ensures the local Supabase stack is running (pnpm --filter @levelup/db db:start if not),
     and REFUSES to continue unless the resolved DB host is loopback (127.0.0.1/localhost/::1)
     - mirroring packages/db/src/host.ts's isLocalSupabaseHost. This script never touches the
     hosted production project.
  4. Restores into a freshly created scratch database on that local instance only, using the
     pg_restore/psql *inside* the local Supabase Postgres container (via docker exec) so the
     client version always matches the server (production is Postgres 17 - see
     .github/workflows/backup.yml's own version-matching fix for why that matters).
  5. Prints row COUNTS only (never row data) for profiles, quests, xp_events, titles, and
     challenges, then cleans up: the scratch database (unless -KeepDatabase), the container's
     copy of the dump, and the local decrypted temp file.

.PARAMETER BackupPath
  Path to the downloaded, still-encrypted backup artifact (a "backup-*.dump.gpg" file from a
  "Database backup" GitHub Actions run).

.PARAMETER KeepDatabase
  Skip dropping the scratch database at the end, so you can inspect it yourself (e.g. via
  Supabase Studio at the local instance's STUDIO_URL, or docker exec + psql) before dropping it
  manually.

.EXAMPLE
  pwsh packages/db/scripts/restore-test.ps1 -BackupPath C:\Users\me\Downloads\backup-20260101-070000.dump.gpg
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupPath,

    [switch]$KeepDatabase
)

# Deliberately no global $ErrorActionPreference = "Stop" and no Set-StrictMode here: both are
# inherited by every external .ps1 this script calls via "&" (e.g. nvm4w's npx.ps1 wrapper -
# with either set, it silently ends up calling npm with no target executable, failing as
# "npm error could not determine executable to run" - verified empirically). This script uses
# explicit -ErrorAction Stop / null checks / $LASTEXITCODE checks throughout instead; a bare
# `throw` or a real .NET exception always terminates regardless of preference, so this loses
# nothing.

$ScriptDir = $PSScriptRoot
$DbDir = (Resolve-Path (Join-Path $ScriptDir "..") -ErrorAction Stop).Path
$RepoRoot = (Resolve-Path (Join-Path $DbDir "..\..") -ErrorAction Stop).Path

# Production's Postgres major version - see docs/PRODUCTION.md and
# packages/db/supabase/config.toml's [db] major_version, which must match it. Local Supabase
# pins the same major, so the container's own pg_restore is always correct - this is just a
# sanity check in case that ever drifts.
$ExpectedPgMajor = 17

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

function Get-BashExecutable {
    # gpg.exe (bundled with Git for Windows under <root>\usr\bin) hangs indefinitely when
    # spawned directly from a non-MSYS2 process (this PowerShell host) for any operation that
    # needs gpg-agent - which --pinentry-mode loopback always does, even for a symmetric
    # passphrase. Running it through bash.exe instead (same Git for Windows install, proper
    # MSYS2 environment) avoids that hang entirely - verified empirically on Windows.
    $gitCmd = Get-Command git -ErrorAction SilentlyContinue
    if (-not $gitCmd) {
        throw ("Git for Windows was not found on PATH. This script needs its bundled bash.exe " +
            "(to run gpg in a working environment) - install Git for Windows and ensure " +
            "'git' is on PATH, then try again.")
    }
    # git.exe lives at <gitRoot>\cmd\git.exe
    $gitRoot = Split-Path (Split-Path $gitCmd.Source -Parent) -Parent
    $bashExe = Join-Path $gitRoot "bin\bash.exe"
    if (-not (Test-Path $bashExe -PathType Leaf)) {
        throw "Expected bash.exe at '$bashExe' (derived from git.exe at '$($gitCmd.Source)') but it's missing."
    }
    return $bashExe
}

function Invoke-BashWithEnv {
    # Runs a bash -c script, exposing extra values only via process environment variables
    # (never interpolated into the script text, never on an argv a sibling process could read)
    # so secrets and arbitrary paths never need shell-escaping.
    param(
        [Parameter(Mandatory = $true)][string]$BashExe,
        [Parameter(Mandatory = $true)][string]$Script,
        [hashtable]$EnvVars = @{}
    )

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $BashExe
    # ProcessStartInfo.ArgumentList doesn't exist on Windows PowerShell 5.1's .NET Framework -
    # use the single-string .Arguments property instead. The script text itself never contains
    # user-controlled values (those travel via EnvVars), so only one level of quoting is needed.
    $escaped = $Script -replace '"', '\"'
    $psi.Arguments = "-c `"$escaped`""
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    foreach ($key in $EnvVars.Keys) {
        $psi.EnvironmentVariables[$key] = $EnvVars[$key]
    }

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi
    [void]$proc.Start()
    # Drain both streams asynchronously before WaitForExit to avoid the classic
    # redirect-both-pipes-then-read-synchronously deadlock.
    $stdoutTask = $proc.StandardOutput.ReadToEndAsync()
    $stderrTask = $proc.StandardError.ReadToEndAsync()
    $proc.WaitForExit()

    return [PSCustomObject]@{
        ExitCode = $proc.ExitCode
        StdOut   = $stdoutTask.Result
        StdErr   = $stderrTask.Result
    }
}

function Read-PassphraseSecurely {
    param([string]$Prompt)
    $secure = Read-Host -AsSecureString -Prompt $Prompt
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($secure)
    try {
        return [System.Runtime.InteropServices.Marshal]::PtrToStringUni($bstr)
    } finally {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeGlobalAllocUnicode($bstr)
    }
}

function Test-LocalSupabaseHost {
    # Mirrors packages/db/src/host.ts's isLocalSupabaseHost exactly - keep both definitions in
    # sync if either ever changes.
    param([string]$HostName)
    return @("127.0.0.1", "localhost", "::1") -contains $HostName
}

function Get-SupabaseDbUrl {
    # Capturing "npx supabase status" output directly into a PowerShell variable (via "&" plus
    # pipeline/stream-merge operators) has been observed, on this npx.ps1-shimmed setup, to
    # intermittently report a non-zero exit and empty output even though the same command run
    # unredirected succeeds every time. Routing through a child powershell.exe with file-
    # redirected streams (the same reliable pattern used for gpg above) avoids that entirely.
    # "-o json" (rather than "-o env") also sidesteps a separate issue: "-o env" reports a
    # non-zero exit whenever any non-essential service (e.g. imgproxy, the pooler) isn't
    # running, even though the database itself is healthy - "-o json" doesn't.
    param([string]$DbDir)

    $outFile = [System.IO.Path]::GetTempFileName()
    $errFile = [System.IO.Path]::GetTempFileName()
    try {
        $startArgs = @{
            FilePath               = "powershell.exe"
            ArgumentList           = @("-NoProfile", "-Command", "npx supabase status -o json")
            WorkingDirectory       = $DbDir
            RedirectStandardOutput = $outFile
            RedirectStandardError  = $errFile
            PassThru               = $true
            NoNewWindow            = $true
        }
        $proc = Start-Process @startArgs
        [void]$proc.WaitForExit(30000)
        if (-not $proc.HasExited) {
            $proc.Kill()
            return $null
        }

        $jsonText = Get-Content $outFile -Raw -ErrorAction SilentlyContinue
        if ([string]::IsNullOrWhiteSpace($jsonText)) { return $null }
        try {
            $statusObj = $jsonText | ConvertFrom-Json -ErrorAction Stop
        } catch {
            return $null
        }
        if (-not $statusObj.DB_URL) { return $null }
        return $statusObj.DB_URL
    } finally {
        Remove-Item $outFile, $errFile -Force -ErrorAction SilentlyContinue
    }
}

function Wait-LocalSupabaseRunning {
    param([string]$DbDir, [string]$RepoRoot)

    $dbUrl = Get-SupabaseDbUrl -DbDir $DbDir
    if (-not $dbUrl) {
        Write-Host "Local Supabase isn't running - starting it (pnpm --filter @levelup/db db:start)..."
        Push-Location $RepoRoot
        try {
            & pnpm --filter @levelup/db db:start
            if ($LASTEXITCODE -ne 0) {
                throw "pnpm --filter @levelup/db db:start failed (exit $LASTEXITCODE)."
            }
        } finally {
            Pop-Location
        }
        $dbUrl = Get-SupabaseDbUrl -DbDir $DbDir
    }
    if (-not $dbUrl) {
        throw "Could not determine the local Supabase DB URL even after starting it."
    }
    return $dbUrl
}

function Get-SupabaseDbContainer {
    $name = (docker ps --filter "name=supabase_db_" --format "{{.Names}}" | Select-Object -First 1)
    if (-not $name) {
        throw "No running container matching 'supabase_db_*' was found - is the local Supabase stack actually up?"
    }
    return $name.Trim()
}

function Invoke-ContainerPsqlScalar {
    param([string]$Container, [string]$Database, [string]$Sql)
    $psqlArgs = @("exec", "-e", "PGPASSWORD=postgres", $Container,
        "psql", "-U", "postgres", "-h", "127.0.0.1", "-p", "5432", "-d", $Database, "-tAc", $Sql)
    $value = & docker @psqlArgs
    if ($LASTEXITCODE -ne 0) {
        throw "psql failed against database '$Database' (exit $LASTEXITCODE)."
    }
    return ($value | Out-String).Trim()
}

function Invoke-ContainerPsqlCommand {
    param([string]$Container, [string]$Database, [string]$Sql)
    $psqlArgs = @("exec", "-e", "PGPASSWORD=postgres", $Container,
        "psql", "-U", "postgres", "-h", "127.0.0.1", "-p", "5432", "-d", $Database, "-c", $Sql)
    & docker @psqlArgs | Out-Null
    return $LASTEXITCODE
}

# ---------------------------------------------------------------------------
# 1. Validate the backup file and locate a working gpg
# ---------------------------------------------------------------------------

Write-Host "== LEVEL UP backup restore test =="

if (-not (Test-Path $BackupPath -PathType Leaf)) {
    throw "Backup file not found: $BackupPath"
}
$backupItem = Get-Item $BackupPath
if ($backupItem.Length -le 0) {
    throw "Backup file is empty: $BackupPath"
}

$bashExe = Get-BashExecutable
Write-Host "Using bash (for gpg): $bashExe"

$preflight = Invoke-BashWithEnv -BashExe $bashExe -Script 'gpg --version | head -n1'
if ($preflight.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($preflight.StdOut)) {
    throw ("gpg was not found via bash. Install Gpg4win, or ensure Git for Windows' bundled " +
        "gpg (usr\bin\gpg.exe next to bash.exe) is present.")
}
Write-Host "gpg: $($preflight.StdOut.Trim())"

# ---------------------------------------------------------------------------
# 2. Decrypt
# ---------------------------------------------------------------------------

$passphrase = Read-PassphraseSecurely -Prompt "Enter the backup's GPG passphrase"
if ([string]::IsNullOrEmpty($passphrase)) {
    throw "No passphrase entered."
}

$decryptedPath = Join-Path ([System.IO.Path]::GetTempPath()) "restore-test-$(Get-Date -Format yyyyMMddHHmmss).dump"

try {
    $decryptScript = 'printf "%s" "$RESTORE_TEST_PASSPHRASE" | ' +
        'gpg --batch --yes --pinentry-mode loopback --passphrase-fd 0 ' +
        '--output "$RESTORE_TEST_OUTPUT" --decrypt "$RESTORE_TEST_INPUT"'
    $decryptResult = Invoke-BashWithEnv -BashExe $bashExe -Script $decryptScript -EnvVars @{
        RESTORE_TEST_PASSPHRASE = $passphrase
        RESTORE_TEST_INPUT      = $BackupPath
        RESTORE_TEST_OUTPUT     = $decryptedPath
    }
} finally {
    $passphrase = $null
}

if ($decryptResult.ExitCode -ne 0) {
    Write-Host "gpg failed to decrypt the backup (exit code $($decryptResult.ExitCode))."
    $versionCheck = Invoke-BashWithEnv -BashExe $bashExe -Script 'gpg --version | head -n1'
    Write-Host "gpg version: $($versionCheck.StdOut.Trim())"
    if (Test-Path $decryptedPath) { Remove-Item $decryptedPath -Force -ErrorAction SilentlyContinue }
    exit 1
}

if (-not (Test-Path $decryptedPath) -or (Get-Item $decryptedPath).Length -le 0) {
    Write-Host "Decrypted file is missing or empty."
    if (Test-Path $decryptedPath) { Remove-Item $decryptedPath -Force -ErrorAction SilentlyContinue }
    exit 1
}

# Check only the first 5 bytes (pg_dump custom-format's "PGDMP" magic) - never read or print
# the rest of the file's content.
$fileStream = [System.IO.File]::OpenRead($decryptedPath)
try {
    $headerBytes = New-Object byte[] 5
    [void]$fileStream.Read($headerBytes, 0, 5)
} finally {
    $fileStream.Close()
}
$header = [System.Text.Encoding]::ASCII.GetString($headerBytes)
if ($header -ne "PGDMP") {
    Write-Host "Decrypted file does not start with the expected pg_dump header."
    Remove-Item $decryptedPath -Force -ErrorAction SilentlyContinue
    exit 1
}
Write-Host "Decrypted OK: non-empty, starts with the expected pg_dump header."

# ---------------------------------------------------------------------------
# 3. Local-only guard
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "Ensuring local Supabase is running..."
$dbUrl = Wait-LocalSupabaseRunning -DbDir $DbDir -RepoRoot $RepoRoot
$dbUri = [System.Uri]$dbUrl
Write-Host "Local Postgres target: $($dbUri.Host):$($dbUri.Port) (full connection string never printed)"

if (-not (Test-LocalSupabaseHost -HostName $dbUri.Host)) {
    Remove-Item $decryptedPath -Force -ErrorAction SilentlyContinue
    throw ("Refusing to continue: resolved host '$($dbUri.Host)' is not localhost/127.0.0.1/::1. " +
        "This script only restores into the LOCAL Supabase instance - never production.")
}

$container = Get-SupabaseDbContainer
Write-Host "Local Postgres container: $container"

# ---------------------------------------------------------------------------
# 4. Version-matched restore into a scratch database
# ---------------------------------------------------------------------------

$pgRestoreVersionLine = & docker exec $container pg_restore --version
if ($LASTEXITCODE -ne 0) {
    Remove-Item $decryptedPath -Force -ErrorAction SilentlyContinue
    throw "Could not run pg_restore inside $container."
}
Write-Host "pg_restore (inside the container): $pgRestoreVersionLine"
if ($pgRestoreVersionLine -notmatch "\b$ExpectedPgMajor\.") {
    Remove-Item $decryptedPath -Force -ErrorAction SilentlyContinue
    throw "Container's pg_restore is not major version $ExpectedPgMajor (production's version) - got: $pgRestoreVersionLine"
}

$stamp = Get-Date -Format "yyyyMMddHHmmss"
$scratchDb = "restore_test_$stamp"
$containerDumpPath = "/tmp/restore-test-$stamp.dump"

& docker cp $decryptedPath "${container}:${containerDumpPath}"
if ($LASTEXITCODE -ne 0) {
    Remove-Item $decryptedPath -Force -ErrorAction SilentlyContinue
    throw "docker cp into the container failed."
}

$createExit = Invoke-ContainerPsqlCommand -Container $container -Database "postgres" -Sql "CREATE DATABASE $scratchDb;"
if ($createExit -ne 0) {
    & docker exec $container rm -f $containerDumpPath | Out-Null
    Remove-Item $decryptedPath -Force -ErrorAction SilentlyContinue
    throw "Could not create scratch database $scratchDb."
}

try {
    $restoreArgs = @("exec", "-e", "PGPASSWORD=postgres", $container,
        "pg_restore", "-U", "postgres", "-h", "127.0.0.1", "-p", "5432",
        "--no-owner", "--no-privileges", "--clean", "--if-exists",
        "--dbname", $scratchDb, $containerDumpPath)
    & docker @restoreArgs
    $restoreExit = $LASTEXITCODE
    if ($restoreExit -ne 0) {
        # A full production dump also contains Supabase's platform schemas (auth, storage,
        # realtime, vault, ...) - this scratch database, created bare via CREATE DATABASE,
        # doesn't have those extensions/schemas pre-provisioned the way a real Supabase
        # instance does, so pg_restore reports (and skips) those objects as errors. That's
        # expected noise, not a failure - what actually matters is whether this repo's own
        # application tables came back, checked immediately below.
        Write-Host "pg_restore reported errors (exit $restoreExit) - likely Supabase platform-schema objects this scratch database doesn't have; checking the application tables directly."
    }

    Write-Host ""
    Write-Host "Row counts in $scratchDb (COUNTS ONLY - row data is never read or printed):"
    $allTablesOk = $true
    foreach ($table in @("profiles", "quests", "xp_events", "titles", "challenges")) {
        try {
            $count = Invoke-ContainerPsqlScalar -Container $container -Database $scratchDb -Sql "select count(*) from public.$table;"
            Write-Host ("  {0,-12} {1}" -f $table, $count)
        } catch {
            Write-Host ("  {0,-12} FAILED - {1}" -f $table, $_.Exception.Message)
            $allTablesOk = $false
        }
    }

    Write-Host ""
    if ($allTablesOk) {
        Write-Host "RESTORE TEST PASSED."
    } else {
        throw "RESTORE TEST FAILED: one or more application tables could not be counted after restore."
    }
} finally {
    & docker exec $container rm -f $containerDumpPath | Out-Null

    if (-not $KeepDatabase) {
        $terminateSql = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$scratchDb' AND pid <> pg_backend_pid();"
        Invoke-ContainerPsqlCommand -Container $container -Database "postgres" -Sql $terminateSql | Out-Null
        Invoke-ContainerPsqlCommand -Container $container -Database "postgres" -Sql "DROP DATABASE IF EXISTS $scratchDb;" | Out-Null
        Write-Host "Dropped scratch database $scratchDb."
    } else {
        Write-Host "Kept scratch database $scratchDb for manual inspection (-KeepDatabase)."
    }

    Remove-Item $decryptedPath -Force -ErrorAction SilentlyContinue
    Write-Host "Removed local decrypted temp file."
}
