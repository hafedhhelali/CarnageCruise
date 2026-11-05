# Generation des icones Android Motormageddon
Add-Type -AssemblyName System.Drawing

$resDir = "c:\Projects\Motormageddon\android\app\src\main\res"

$sizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

foreach ($entry in $sizes.GetEnumerator()) {
    $folder = Join-Path $resDir $entry.Key
    $size = $entry.Value
    
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
    }

    # 1. ic_launcher.png (Carre a coins arrondis)
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Fond degrade sombre arcade
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, 0)),
        (New-Object System.Drawing.Point($size, $size)),
        [System.Drawing.ColorTranslator]::FromHtml("#0f172a"),
        [System.Drawing.ColorTranslator]::FromHtml("#1e293b")
    )
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)
    $bgBrush.Dispose()

    # Bordure doree brillante
    $goldPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#f1c40f"), [Math]::Max(1.5, $size * 0.04))
    $inset = [Math]::Max(1, $size * 0.03)
    $g.DrawRectangle($goldPen, $inset, $inset, $size - 2 * $inset, $size - 2 * $inset)
    $goldPen.Dispose()

    # Ruban tricolore francais en haut
    $bBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#0984e3"))
    $wBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#ffffff"))
    $rBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#d63031"))
    
    $stripH = [Math]::Max(2, $size * 0.06)
    $wPart = $size / 3.0
    $g.FillRectangle($bBrush, 0, 0, [int]$wPart, [int]$stripH)
    $g.FillRectangle($wBrush, [int]$wPart, 0, [int]$wPart, [int]$stripH)
    $g.FillRectangle($rBrush, [int]($wPart * 2), 0, [int]$wPart, [int]$stripH)

    # Casque / Embleme Moto stylise rouge / or
    $center = $size / 2.0
    $helmetW = $size * 0.58
    $helmetH = $size * 0.52
    $helmetX = $center - ($helmetW / 2.0)
    $helmetY = $center - ($helmetH / 2.0) + ($size * 0.02)

    $redBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#ff4757"))
    $g.FillEllipse($redBrush, $helmetX, $helmetY, $helmetW, $helmetH)
    $redBrush.Dispose()

    # Visiere de casque doree / reflechissante
    $visorW = $helmetW * 0.72
    $visorH = $helmetH * 0.32
    $visorX = $center - ($visorW / 2.0)
    $visorY = $helmetY + ($helmetH * 0.32)

    $visorBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point([int]$visorX, [int]$visorY)),
        (New-Object System.Drawing.Point([int]($visorX + $visorW), [int]($visorY + $visorH))),
        [System.Drawing.ColorTranslator]::FromHtml("#ffd32a"),
        [System.Drawing.ColorTranslator]::FromHtml("#ff9f1a")
    )
    $g.FillEllipse($visorBrush, $visorX, $visorY, $visorW, $visorH)
    $visorBrush.Dispose()

    # Lettre 'M' arcade bold au bas du casque
    $fontSize = [Math]::Max(8, $size * 0.22)
    $font = New-Object System.Drawing.Font("Arial Black", $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#ffffff"))
    $strFormat = New-Object System.Drawing.StringFormat
    $strFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $strFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString("M", $font, $textBrush, [float]$center, [float]($helmetY + $helmetH * 0.48), $strFormat)

    $font.Dispose()
    $textBrush.Dispose()
    $strFormat.Dispose()
    $bBrush.Dispose()
    $wBrush.Dispose()
    $rBrush.Dispose()

    $launcherPath = Join-Path $folder "ic_launcher.png"
    $bmp.Save($launcherPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # 2. ic_launcher_round.png (Circulaire)
    $roundBmp = New-Object System.Drawing.Bitmap($size, $size)
    $rg = [System.Drawing.Graphics]::FromImage($roundBmp)
    $rg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $rg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(1, 1, $size - 2, $size - 2)
    $rg.SetClip($path)
    $rg.DrawImage($bmp, 0, 0, $size, $size)
    $path.Dispose()

    # Cercle or fin
    $goldCirclePen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#f1c40f"), [Math]::Max(1.5, $size * 0.04))
    $rg.ResetClip()
    $rg.DrawEllipse($goldCirclePen, 1, 1, $size - 3, $size - 3)
    $goldCirclePen.Dispose()

    $roundPath = Join-Path $folder "ic_launcher_round.png"
    $roundBmp.Save($roundPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # 3. ic_launcher_foreground.png (Fond transparent)
    $fgBmp = New-Object System.Drawing.Bitmap($size, $size)
    $fg = [System.Drawing.Graphics]::FromImage($fgBmp)
    $fg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $fg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # Dessin du casque et M sur fond transparent
    $redBrushFg = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#ff4757"))
    $fg.FillEllipse($redBrushFg, $helmetX, $helmetY, $helmetW, $helmetH)
    $redBrushFg.Dispose()

    $visorBrushFg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point([int]$visorX, [int]$visorY)),
        (New-Object System.Drawing.Point([int]($visorX + $visorW), [int]($visorY + $visorH))),
        [System.Drawing.ColorTranslator]::FromHtml("#ffd32a"),
        [System.Drawing.ColorTranslator]::FromHtml("#ff9f1a")
    )
    $fg.FillEllipse($visorBrushFg, $visorX, $visorY, $visorW, $visorH)
    $visorBrushFg.Dispose()

    $fontFg = New-Object System.Drawing.Font("Arial Black", $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrushFg = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#ffffff"))
    $strFormatFg = New-Object System.Drawing.StringFormat
    $strFormatFg.Alignment = [System.Drawing.StringAlignment]::Center
    $strFormatFg.LineAlignment = [System.Drawing.StringAlignment]::Center
    $fg.DrawString("M", $fontFg, $textBrushFg, [float]$center, [float]($helmetY + $helmetH * 0.48), $strFormatFg)

    $fontFg.Dispose()
    $textBrushFg.Dispose()
    $strFormatFg.Dispose()

    $fgPath = Join-Path $folder "ic_launcher_foreground.png"
    $fgBmp.Save($fgPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose()
    $bmp.Dispose()
    $rg.Dispose()
    $roundBmp.Dispose()
    $fg.Dispose()
    $fgBmp.Dispose()

    Write-Output "Generated icons in $folder ($size x $size)"
}
