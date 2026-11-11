# Generation des icones Android Carnage Cruise
Add-Type -AssemblyName System.Drawing

$projectDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$resDir = Join-Path $projectDir "android\app\src\main\res"

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

    # =========================================================================
    # 1. ic_launcher.png (Carre a coins arrondis)
    # =========================================================================
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Fond degrade sombre arcade furtif
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, 0)),
        (New-Object System.Drawing.Point($size, $size)),
        [System.Drawing.ColorTranslator]::FromHtml("#0a0f1d"),
        [System.Drawing.ColorTranslator]::FromHtml("#161f33")
    )
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)
    $bgBrush.Dispose()

    # Onde de flamme / lueur d'arriere-plan
    $glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 255, 71, 87))
    $g.FillEllipse($glowBrush, [float]($size * 0.1), [float]($size * 0.1), [float]($size * 0.8), [float]($size * 0.8))
    $glowBrush.Dispose()

    # Bordure néon bicolore (Rouge Carnage & Or Arcade)
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#ff4757"), [Math]::Max(1.5, $size * 0.045))
    $inset = [Math]::Max(1, $size * 0.035)
    $g.DrawRectangle($borderPen, $inset, $inset, $size - 2 * $inset, $size - 2 * $inset)
    $borderPen.Dispose()

    # Ruban sport racing discret en haut
    $cyanBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#00cec9"))
    $goldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#ffd32a"))
    $stripH = [Math]::Max(2, $size * 0.04)
    $g.FillRectangle($cyanBrush, 0, 0, [int]($size * 0.5), [int]$stripH)
    $g.FillRectangle($goldBrush, [int]($size * 0.5), 0, [int]($size * 0.5), [int]$stripH)
    $cyanBrush.Dispose()
    $goldBrush.Dispose()

    # Motif central : Bouclier de combat + Lettres "CC" (Carnage Cruise)
    $center = $size / 2.0
    $shieldW = $size * 0.68
    $shieldH = $size * 0.62
    $shieldX = $center - ($shieldW / 2.0)
    $shieldY = $center - ($shieldH / 2.0) + ($size * 0.02)

    # Disque / Visière de protection sombre
    $visorBg = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#1e272e"))
    $g.FillEllipse($visorBg, [float]$shieldX, [float]$shieldY, [float]$shieldW, [float]$shieldH)
    $visorBg.Dispose()

    # Anneau de visière néon doré
    $ringPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#fffa65"), [Math]::Max(1.2, $size * 0.035))
    $g.DrawEllipse($ringPen, [float]$shieldX, [float]$shieldY, [float]$shieldW, [float]$shieldH)
    $ringPen.Dispose()

    # "CC" Monogramme Carnage Cruise stylisé arcade
    $fontSize = [Math]::Max(9, $size * 0.32)
    $font = New-Object System.Drawing.Font("Impact", $fontSize, [System.Drawing.FontStyle]::Bold)
    $strFormat = New-Object System.Drawing.StringFormat
    $strFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $strFormat.LineAlignment = [System.Drawing.StringAlignment]::Center

    # Ombre portée du texte
    $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 0, 0, 0))
    $g.DrawString("CC", $font, $shadowBrush, [float]($center + $size * 0.02), [float]($center + $size * 0.03), $strFormat)
    $shadowBrush.Dispose()

    # Texte CC Dégradé Rouge/Or
    $textBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point([int]$shieldX, [int]$shieldY)),
        (New-Object System.Drawing.Point([int]($shieldX + $shieldW), [int]($shieldY + $shieldH))),
        [System.Drawing.ColorTranslator]::FromHtml("#fffa65"),
        [System.Drawing.ColorTranslator]::FromHtml("#ff4757")
    )
    $g.DrawString("CC", $font, $textBrush, [float]$center, [float]$center, $strFormat)
    $textBrush.Dispose()

    $font.Dispose()
    $strFormat.Dispose()

    $launcherPath = Join-Path $folder "ic_launcher.png"
    $bmp.Save($launcherPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # =========================================================================
    # 2. ic_launcher_round.png (Circulaire Android)
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

    # Anneau extérieur rouge vif
    $outerRingPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#ff4757"), [Math]::Max(1.5, $size * 0.045))
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

    # Disque / Visière sur fond transparent
    $visorBgFg = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#161f33"))
    $fg.FillEllipse($visorBgFg, [float]$shieldX, [float]$shieldY, [float]$shieldW, [float]$shieldH)
    $visorBgFg.Dispose()

    $ringPenFg = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#fffa65"), [Math]::Max(1.2, $size * 0.035))
    $fg.DrawEllipse($ringPenFg, [float]$shieldX, [float]$shieldY, [float]$shieldW, [float]$shieldH)
    $ringPenFg.Dispose()

    $fontFg = New-Object System.Drawing.Font("Impact", $fontSize, [System.Drawing.FontStyle]::Bold)
    $strFormatFg = New-Object System.Drawing.StringFormat
    $strFormatFg.Alignment = [System.Drawing.StringAlignment]::Center
    $strFormatFg.LineAlignment = [System.Drawing.StringAlignment]::Center

    $shadowBrushFg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 0, 0, 0))
    $fg.DrawString("CC", $fontFg, $shadowBrushFg, [float]($center + $size * 0.02), [float]($center + $size * 0.03), $strFormatFg)
    $shadowBrushFg.Dispose()

    $textBrushFg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point([int]$shieldX, [int]$shieldY)),
        (New-Object System.Drawing.Point([int]($shieldX + $shieldW), [int]($shieldY + $shieldH))),
        [System.Drawing.ColorTranslator]::FromHtml("#fffa65"),
        [System.Drawing.ColorTranslator]::FromHtml("#ff4757")
    )
    $fg.DrawString("CC", $fontFg, $textBrushFg, [float]$center, [float]$center, $strFormatFg)
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

    Write-Output "Generated Carnage Cruise icons in $folder ($size x $size)"
}
