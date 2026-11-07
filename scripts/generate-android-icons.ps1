$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$candidates = @(
    (Join-Path $root "web\build\icon.png"),
    (Join-Path $root "android-tv\branding\folia-icon.png")
)
$srcPath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $srcPath) {
    Write-Error "Folia icon not found. Clone folia-major into web/ or place android-tv/branding/folia-icon.png"
}

Add-Type -AssemblyName System.Drawing
$res = Join-Path $root "android-tv\app\src\main\res"
$src = [System.Drawing.Image]::FromFile($srcPath)

function Save-Png([System.Drawing.Image]$img, [string]$path) {
    $dir = Split-Path $path
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    $img.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Resize-Square([System.Drawing.Image]$src, [int]$size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $size, $size)
    $g.Dispose()
    return $bmp
}

$sizes = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}
foreach ($kv in $sizes.GetEnumerator()) {
    $img = Resize-Square $src $kv.Value
    Save-Png $img (Join-Path $res "$($kv.Key)\ic_launcher.png")
    $img.Dispose()
}

$hi = Resize-Square $src 512
Save-Png $hi (Join-Path $res "drawable-nodpi\ic_launcher_fg.png")
$hi.Dispose()

$banner = New-Object System.Drawing.Bitmap 320, 180
$bg = [System.Drawing.Graphics]::FromImage($banner)
$bg.Clear([System.Drawing.Color]::FromArgb(255, 11, 26, 20))
$bg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$iconSize = 110
$x = [int]((320 - $iconSize) / 2)
$y = [int]((180 - $iconSize) / 2) - 6
$bg.DrawImage($src, $x, $y, $iconSize, $iconSize)
$bg.Dispose()

Save-Png $banner (Join-Path $res "drawable\tv_banner.png")
Save-Png $banner (Join-Path $res "drawable-xhdpi\tv_banner.png")
foreach ($pair in @(
        @("drawable-mdpi", 160, 90),
        @("drawable-hdpi", 240, 135),
        @("drawable-xxhdpi", 480, 270)
    )) {
    $w = $pair[1]; $h = $pair[2]
    $b = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($b)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($banner, 0, 0, $w, $h)
    $g.Dispose()
    Save-Png $b (Join-Path $res "$($pair[0])\tv_banner.png")
    $b.Dispose()
}

$branding = Join-Path $root "android-tv\branding"
New-Item -ItemType Directory -Force -Path $branding | Out-Null
Copy-Item $srcPath (Join-Path $branding "folia-icon.png") -Force

$banner.Dispose()
$src.Dispose()
Write-Host "Generated launcher + TV banner from $srcPath"
