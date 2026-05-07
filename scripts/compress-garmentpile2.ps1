param(
  [string]$InputPath = "assets\ GarmentPile++.mp4",
  [string]$OutputPath = "assets\GarmentPile++.mp4",
  [int]$Width = 1280,
  [int]$Crf = 30,
  [string]$Preset = "slow"
)

$ErrorActionPreference = "Stop"

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
  throw "ffmpeg was not found. Install FFmpeg, then rerun: powershell -ExecutionPolicy Bypass -File scripts\compress-garmentpile2.ps1"
}

if (-not (Test-Path -LiteralPath $InputPath)) {
  throw "Input video not found: $InputPath"
}

$outputDirectory = Split-Path -Path $OutputPath -Parent
if ($outputDirectory -and -not (Test-Path -LiteralPath $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory | Out-Null
}

& $ffmpeg.Source `
  -y `
  -i $InputPath `
  -vf "scale='min($Width,iw)':-2" `
  -c:v libx264 `
  -preset $Preset `
  -crf $Crf `
  -pix_fmt yuv420p `
  -movflags +faststart `
  -an `
  $OutputPath

$inputSize = (Get-Item -LiteralPath $InputPath).Length
$outputSize = (Get-Item -LiteralPath $OutputPath).Length
$ratio = [math]::Round(($outputSize / $inputSize) * 100, 1)

Write-Output "Compressed video written to $OutputPath"
Write-Output "Original: $([math]::Round($inputSize / 1MB, 2)) MB"
Write-Output "Compressed: $([math]::Round($outputSize / 1MB, 2)) MB ($ratio% of original)"
