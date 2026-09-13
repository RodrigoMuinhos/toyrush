$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$configFile = Join-Path $PSScriptRoot '.env'
if (Test-Path -LiteralPath $configFile) {
    foreach ($line in Get-Content -LiteralPath $configFile -Encoding utf8) {
        if ($line -match '^\s*([A-Z][A-Z0-9_]*)=(.*)$') {
            [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
        }
    }
}
$jar = Join-Path $PSScriptRoot 'target/payments-1.0.0.jar'
if (-not (Test-Path -LiteralPath $jar)) {
    throw 'Execute mvn package na pasta backend antes de iniciar.'
}
& java -jar $jar --debug=false
exit $LASTEXITCODE
