Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\info\.gemini\antigravity-ide\brain\985c8562-3287-48ed-ab83-43153e357e82\.user_uploaded\media_1789458048198.png"
$img = [System.Drawing.Bitmap]::FromFile($srcPath)

# Right side is from x=624 to 1024 (width = 400)
$rect = New-Object System.Drawing.Rectangle(624, 0, 400, $img.Height)
$crop = $img.Clone($rect, $img.PixelFormat)

$outPath = "c:\Quickchex\Frontend\hrms-frontend\src\assets\img\manager-login-right-ref.png"
$crop.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$crop.Dispose()
$img.Dispose()

Write-Host "Saved right crop to $outPath"
