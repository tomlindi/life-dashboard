# Erzeugt die App-Icons in public/ aus icon.png (1024 x 1024) im Projektordner.
# Aufruf: npm run icons   (nur unter Windows, nutzt das eingebaute System.Drawing)
# Ergebnis: icon-512.png, icon-192.png (Web-Manifest) und apple-touch-icon.png (180, iPhone-Homescreen)
Add-Type -AssemblyName System.Drawing
$ordner = Split-Path -Parent $PSScriptRoot
$quelle = [System.Drawing.Bitmap]::FromFile((Join-Path $ordner 'icon.png'))
$b = New-Object System.Drawing.Bitmap 1024, 1024, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($b)
$g.DrawImage($quelle, 0, 0, 1024, 1024)
$g.Dispose(); $quelle.Dispose()

# icon.png hat unten einen weissen Streifen (ab Zeile 937): mit der letzten Zeile des Verlaufs auffuellen
$weiss = $b.GetPixel(10, 1023)
if ($weiss.R -eq 255 -and $weiss.G -eq 255 -and $weiss.B -eq 255) {
  $y0 = 1023
  while ($y0 -gt 0 -and $b.GetPixel(10, $y0 - 1).R -eq 255) { $y0-- }
  for ($y = $y0; $y -lt 1024; $y++) { for ($x = 0; $x -lt 1024; $x++) { $b.SetPixel($x, $y, $b.GetPixel($x, $y0 - 1)) } }
}

foreach ($ziel in @(@{ n = 'icon-512.png'; s = 512 }, @{ n = 'icon-192.png'; s = 192 }, @{ n = 'apple-touch-icon.png'; s = 180 })) {
  $k = New-Object System.Drawing.Bitmap $ziel.s, $ziel.s, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $gk = [System.Drawing.Graphics]::FromImage($k)
  $gk.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gk.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $gk.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $att = New-Object System.Drawing.Imaging.ImageAttributes
  $att.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
  $gk.DrawImage($b, (New-Object System.Drawing.Rectangle 0, 0, $ziel.s, $ziel.s), 0, 0, 1024, 1024, [System.Drawing.GraphicsUnit]::Pixel, $att)
  $gk.Dispose()
  $k.Save((Join-Path $ordner "public\$($ziel.n)"), [System.Drawing.Imaging.ImageFormat]::Png)
  $k.Dispose()
}
$b.Dispose()
Write-Output 'Icons erzeugt in /public'
