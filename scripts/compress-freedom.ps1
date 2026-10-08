param(
  [string]$InputPath = (Join-Path $PSScriptRoot "..\assets\freedom.mp4"),
  [string]$OutputPath = (Join-Path $PSScriptRoot "..\assets\freedom-web.mp4"),
  [string]$PosterPath = (Join-Path $PSScriptRoot "..\assets\freedom-poster.jpg"),
  [ValidateRange(2, 1920)]
  [ValidateScript({ $_ % 2 -eq 0 })]
  [int]$Width = 1920,
  [ValidateRange(0, 51)]
  [int]$Crf = 24,
  [ValidateSet("ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow")]
  [string]$Preset = "slow"
)

$ErrorActionPreference = "Stop"

$ffmpeg = Get-Command ffmpeg -CommandType Application -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
  throw "ffmpeg was not found. Install FFmpeg, then rerun: powershell -ExecutionPolicy Bypass -File scripts\compress-freedom.ps1"
}

if (-not (Test-Path -LiteralPath $InputPath -PathType Leaf)) {
  throw "Input video not found: $InputPath"
}

$inputFullPath = (Resolve-Path -LiteralPath $InputPath).ProviderPath
$outputFullPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)
$posterFullPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($PosterPath)

# Validate all destinations before FFmpeg can overwrite any existing file.
if ($inputFullPath -eq $outputFullPath -or $inputFullPath -eq $posterFullPath) {
  throw "Output and poster paths must differ from the original input video."
}
if ($outputFullPath -eq $posterFullPath) {
  throw "The compressed video and poster must have different output paths."
}

foreach ($destination in @($outputFullPath, $posterFullPath)) {
  if (Test-Path -LiteralPath $destination -PathType Container) {
    throw "Output path is a directory: $destination"
  }
  $outputDirectory = Split-Path -Path $destination -Parent
  if (-not (Test-Path -LiteralPath $outputDirectory -PathType Container)) {
    New-Item -ItemType Directory -Path $outputDirectory | Out-Null
  }
}

# 1080p / 30 fps, broad H.264 compatibility, no audio, and streaming metadata first.
& $ffmpeg.Source `
  -hide_banner -y `
  -i $inputFullPath `
  -vf "scale=${Width}:-2:flags=lanczos,fps=30" `
  -c:v libx264 `
  -preset $Preset `
  -crf $Crf `
  -profile:v high `
  -level:v 4.1 `
  -refs 4 `
  -pix_fmt yuv420p `
  -an `
  -movflags +faststart `
  $outputFullPath

if ($LASTEXITCODE -ne 0) {
  throw "Video compression failed with FFmpeg exit code $LASTEXITCODE."
}

# Use the bright meadow frame at one second as the loading and reduced-motion cover.
& $ffmpeg.Source `
  -hide_banner -y `
  -ss 1 `
  -i $inputFullPath `
  -frames:v 1 `
  -vf "scale=${Width}:-2:flags=lanczos" `
  -q:v 3 `
  $posterFullPath

if ($LASTEXITCODE -ne 0) {
  throw "Poster generation failed with FFmpeg exit code $LASTEXITCODE."
}

$inputSize = (Get-Item -LiteralPath $inputFullPath).Length
$outputSize = (Get-Item -LiteralPath $outputFullPath).Length
$reduction = [math]::Round((1 - $outputSize / $inputSize) * 100, 2)

Write-Output "Compressed video written to $outputFullPath"
Write-Output "Poster written to $posterFullPath"
Write-Output "Original: $([math]::Round($inputSize / 1000000, 2)) MB"
Write-Output "Compressed: $([math]::Round($outputSize / 1000000, 2)) MB ($reduction% smaller)"
