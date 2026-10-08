Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap("assets/logo.png")
for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        $pixel = $bmp.GetPixel($x, $y)
        if ($pixel.A -gt 10) {
            $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($pixel.A, 255, 255, 255))
        } else {
            $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}
$bmp.Save("android/app/src/main/res/drawable/ic_notification.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
