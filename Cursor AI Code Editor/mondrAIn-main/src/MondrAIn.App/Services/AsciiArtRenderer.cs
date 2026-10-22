using System.Globalization;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using MondrAIn.Core.Models;

namespace MondrAIn.App.Services;

public sealed class AsciiArtRenderer : IAsciiArtRenderer
{
    private const string FontFamilyName = "Consolas";
    private static readonly Brush BackgroundBrush = Brushes.White;
    private static readonly Brush ForegroundBrush = Brushes.Black;
    private static readonly Typeface GlyphTypeface = new(
        new FontFamily(FontFamilyName),
        FontStyles.Normal,
        FontWeights.Bold,
        FontStretches.Normal);

    public BitmapSource Render(AsciiArt art, int targetWidth, int targetHeight)
    {
        ArgumentNullException.ThrowIfNull(art);

        if (targetWidth <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(targetWidth), "Target width must be positive.");
        }

        if (targetHeight <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(targetHeight), "Target height must be positive.");
        }

        var cellWidth = (double)targetWidth / art.Columns;
        var cellHeight = (double)targetHeight / art.Rows;
        var fontSize = Math.Max(1.0, cellHeight * 0.95);

        // Consolas is monospace, so every ramp glyph shares one advance width and height.
        // Measure once and stretch each glyph to fill its cell, removing the white gutters
        // between columns/rows that otherwise read as a regular grid.
        var probe = CreateGlyph("@", fontSize);
        var glyphScaleX = probe.Width > 0 ? cellWidth / probe.Width : 1.0;
        var glyphScaleY = probe.Height > 0 ? cellHeight / probe.Height : 1.0;

        var visual = new DrawingVisual();
        using (var context = visual.RenderOpen())
        {
            context.DrawRectangle(BackgroundBrush, null, new Rect(0, 0, targetWidth, targetHeight));

            for (var row = 0; row < art.Rows; row++)
            {
                for (var column = 0; column < art.Columns; column++)
                {
                    var character = art[column, row].ToString();
                    var formattedText = CreateGlyph(character, fontSize);

                    var cellOrigin = new Point(column * cellWidth, row * cellHeight);
                    context.PushTransform(new TranslateTransform(cellOrigin.X, cellOrigin.Y));
                    context.PushTransform(new ScaleTransform(glyphScaleX, glyphScaleY));
                    context.DrawText(formattedText, new Point(0, 0));
                    context.Pop();
                    context.Pop();
                }
            }
        }

        var bitmap = new RenderTargetBitmap(targetWidth, targetHeight, 96, 96, PixelFormats.Pbgra32);
        bitmap.Render(visual);
        bitmap.Freeze();
        return bitmap;
    }

    private static FormattedText CreateGlyph(string character, double fontSize) => new(
        character,
        CultureInfo.InvariantCulture,
        FlowDirection.LeftToRight,
        GlyphTypeface,
        fontSize,
        ForegroundBrush,
        1.0);
}
