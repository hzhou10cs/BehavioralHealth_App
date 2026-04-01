param(
    [switch]$Phone,
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$args = @("scripts/run-app.mjs", "--port", $Port)
if ($Phone) {
    $args += "--phone"
}

& node @args
