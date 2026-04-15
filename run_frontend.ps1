param(
    [switch]$Phone
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$args = @("scripts/run-frontend.mjs")
if ($Phone) {
    $args += "--phone"
}

& node @args
