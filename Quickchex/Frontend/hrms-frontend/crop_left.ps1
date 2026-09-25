Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\info\.gemini\antigravity-ide\brain\985c8562-3287-48ed-ab83-43153e357e82\.user_uploaded\media_1789458048198.png"
$img = [System.Drawing.Bitmap]::FromFile($srcPath)

Write-Host "Source Width: $($img.Width) Height: $($img.Height)"

# Crop the left side (0 to ~624px)
$leftWidth = 624
$rect = New-Object System.Drawing.Rectangle(0, 0, $leftWidth, $img.Height)
$crop = $img.Clone($rect, $img.PixelFormat)

$outPath = "c:\Quickchex\Frontend\hrms-frontend\src\assets\img\manager-login-left-mock.png"
$crop.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$crop.Dispose()
$img.Dispose()

Write-Host "Saved left crop to $outPath"
