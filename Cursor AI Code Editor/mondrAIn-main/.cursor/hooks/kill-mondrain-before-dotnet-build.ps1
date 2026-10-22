# Runs only for dotnet build (matcher in .cursor/hooks.json).
# Stops running mondrAIn desktop instances so the build can replace locked binaries.
$ErrorActionPreference = 'SilentlyContinue'

$killed = $false
foreach ($name in @('mondrAIn', 'MondrAIn.App')) {
    $running = Get-Process -Name $name -ErrorAction SilentlyContinue
    if ($running) {
        $running | Stop-Process -Force -ErrorAction SilentlyContinue
        $killed = $true
    }
}

@{ permission = 'allow'; killed = $killed } | ConvertTo-Json -Compress | Write-Output
exit 0
