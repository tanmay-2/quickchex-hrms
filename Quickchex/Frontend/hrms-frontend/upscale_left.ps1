Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Quickchex\Frontend\hrms-frontend\src\assets\img\manager-login-left-mock.png"
$src = [System.Drawing.Bitmap]::FromFile($srcPath)

$targetW = $src.Width * 2
$targetH = $src.Height * 2

$dest = New-Object System.Drawing.Bitmap($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($dest)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$g.DrawImage($src, 0, 0, $targetW, $targetH)

$outPath = "c:\Quickchex\Frontend\hrms-frontend\src\assets\img\manager-login-left-hd.png"
$dest.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$dest.Dispose()
$src.Dispose()

Write-Host "Created HD crop at $outPath ($targetW x $targetH)"
