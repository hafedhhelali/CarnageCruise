# Generation des icones Android Futuristes Cyber-Arcade — Carnage Cruise
Add-Type -AssemblyName System.Drawing

$projectDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$resDir = Join-Path $projectDir "android\app\src\main\res"

$sizes = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

function Draw-Hexagon([System.Drawing.Graphics]$g, [float]$cx, [float]$cy, [float]$radius, [System.Drawing.Brush]$fillBrush, [System.Drawing.Pen]$borderPen) {
    $pts = New-Object 'System.Drawing.PointF[]' 6
    for ($i = 0; $i -lt 6; $i++) {
        $angle = [Math]::PI / 6.0 + ($i * [Math]::PI / 3.0)
        $pts[$i] = New-Object System.Drawing.PointF(
            [float]($cx + $radius * [Math]::Cos($angle)),
            [float]($cy + $radius * [Math]::Sin($angle))
        )
    }
    if ($null -ne $fillBrush) {
        $g.FillPolygon($fillBrush, $pts)
    }
    if ($null -ne $borderPen) {
        $g.DrawPolygon($borderPen, $pts)
    }
}

foreach ($entry in $sizes.GetEnumerator()) {
    $folder = Join-Path $resDir $entry.Key
    $size = $entry.Value

    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
    }

    $center = [float]($size / 2.0)

    # =========================================================================
    # 1. ic_launcher.png (Icone Futuriste Cyber-Arcade)
    # =========================================================================
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Fond Cyber-Obsidienne profond et confortable
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, 0)),
        (New-Object System.Drawing.Point($size, $size)),
        [System.Drawing.ColorTranslator]::FromHtml("#060b16"),
        [System.Drawing.ColorTranslator]::FromHtml("#132238")
    )
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)
    $bgBrush.Dispose()

    # Halo Plasma Cyan & Magenta
    $cyanGlow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(55, 0, 242, 254))
    $g.FillEllipse($cyanGlow, [float]($size * 0.08), [float]($size * 0.08), [float]($size * 0.84), [float]($size * 0.84))
    $cyanGlow.Dispose()

    $pinkGlow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(45, 255, 46, 99))
    $g.FillEllipse($pinkGlow, [float]($size * 0.18), [float]($size * 0.18), [float]($size * 0.64), [float]($size * 0.64))
    $pinkGlow.Dispose()

    # Bouclier Hexagonal Futuriste Externe (Cyan Néon)
    $hexBgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#0b1325"))
    $hexOuterPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#00f2fe"), [Math]::Max(1.6, $size * 0.042))
    Draw-Hexagon $g $center $center ([float]($size * 0.42)) $hexBgBrush $hexOuterPen
    $hexBgBrush.Dispose()
    $hexOuterPen.Dispose()

    # Anneau Hexagonal Interne (Or Solaire / Crimson)
    $hexInnerPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#ff2e63"), [Math]::Max(1.0, $size * 0.02))
    Draw-Hexagon $g $center $center ([float]($size * 0.35)) $null $hexInnerPen
    $hexInnerPen.Dispose()

    # Visière Laser Cyan Horizontale Supérieure
    $visorBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(210, 0, 242, 254))
    $visorW = [float]($size * 0.44)
    $visorH = [float]([Math]::Max(2.0, $size * 0.045))
    $g.FillRectangle($visorBrush, [float]($center - $visorW / 2.0), [float]($size * 0.25), $visorW, $visorH)
    $visorBrush.Dispose()

    # Monogramme Futuriste "CC" en Or Solaire / Cyan
    $fontSize = [Math]::Max(9, $size * 0.29)
    $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, ([System.Drawing.FontStyle]::Bold -bor [System.Drawing.FontStyle]::Italic))
    $strFormat = New-Object System.Drawing.StringFormat
    $strFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $strFormat.LineAlignment = [System.Drawing.StringAlignment]::Center

    $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 0, 0, 0))
    $g.DrawString("CC", $font, $shadowBrush, [float]($center + $size * 0.02), [float]($center + $size * 0.05), $strFormat)
    $shadowBrush.Dispose()

    $textBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, [int]($size * 0.25))),
        (New-Object System.Drawing.Point(0, [int]($size * 0.78))),
        [System.Drawing.ColorTranslator]::FromHtml("#ffffff"),
        [System.Drawing.ColorTranslator]::FromHtml("#ffd32a")
    )
    $g.DrawString("CC", $font, $textBrush, [float]$center, [float]($center + $size * 0.03), $strFormat)
    $textBrush.Dispose()

    # Sillage Laser Magenta Inférieur
    $bottomTrailBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#ff2e63"))
    $trailW = [float]($size * 0.34)
    $trailH = [float]([Math]::Max(2.0, $size * 0.038))
    $g.FillRectangle($bottomTrailBrush, [float]($center - $trailW / 2.0), [float]($size * 0.73), $trailW, $trailH)
    $bottomTrailBrush.Dispose()

    $font.Dispose()
    $strFormat.Dispose()

    $launcherPath = Join-Path $folder "ic_launcher.png"
    $bmp.Save($launcherPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # =========================================================================
    # 2. ic_launcher_round.png (Circulaire Android avec Anneau Cyber-Cyan)
    # =========================================================================
    $roundBmp = New-Object System.Drawing.Bitmap($size, $size)
    $rg = [System.Drawing.Graphics]::FromImage($roundBmp)
    $rg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $rg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(1, 1, $size - 2, $size - 2)
    $rg.SetClip($path)
    $rg.DrawImage($bmp, 0, 0, $size, $size)
    $path.Dispose()

    $outerRingPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#00f2fe"), [Math]::Max(1.6, $size * 0.042))
    $rg.ResetClip()
    $rg.DrawEllipse($outerRingPen, 1, 1, $size - 3, $size - 3)
    $outerRingPen.Dispose()

    $roundPath = Join-Path $folder "ic_launcher_round.png"
    $roundBmp.Save($roundPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # =========================================================================
    # 3. ic_launcher_foreground.png (Adaptive Icon - Fond transparent)
    # =========================================================================
    $fgBmp = New-Object System.Drawing.Bitmap($size, $size)
    $fg = [System.Drawing.Graphics]::FromImage($fgBmp)
    $fg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $fg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $fg.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $hexBgFg = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#0b1325"))
    $hexPenFg = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#00f2fe"), [Math]::Max(1.5, $size * 0.036))
    Draw-Hexagon $fg $center $center ([float]($size * 0.34)) $hexBgFg $hexPenFg
    $hexBgFg.Dispose()
    $hexPenFg.Dispose()

    $fontSizeFg = [Math]::Max(8, $size * 0.24)
    $fontFg = New-Object System.Drawing.Font("Segoe UI", $fontSizeFg, ([System.Drawing.FontStyle]::Bold -bor [System.Drawing.FontStyle]::Italic))
    $strFormatFg = New-Object System.Drawing.StringFormat
    $strFormatFg.Alignment = [System.Drawing.StringAlignment]::Center
    $strFormatFg.LineAlignment = [System.Drawing.StringAlignment]::Center

    $textBrushFg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, [int]($size * 0.28))),
        (New-Object System.Drawing.Point(0, [int]($size * 0.72))),
        [System.Drawing.ColorTranslator]::FromHtml("#00f2fe"),
        [System.Drawing.ColorTranslator]::FromHtml("#ffd32a")
    )
    $fg.DrawString("CC", $fontFg, $textBrushFg, [float]$center, [float]($center + $size * 0.02), $strFormatFg)
    $textBrushFg.Dispose()

    $fontFg.Dispose()
    $strFormatFg.Dispose()

    $fgPath = Join-Path $folder "ic_launcher_foreground.png"
    $fgBmp.Save($fgPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose()
    $bmp.Dispose()
    $rg.Dispose()
    $roundBmp.Dispose()
    $fg.Dispose()
    $fgBmp.Dispose()

    Write-Output "Generated Futuristic Cyber-Arcade icons in $folder ($size x $size)"
}
