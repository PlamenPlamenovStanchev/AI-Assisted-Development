using MondrAIn.Core.Models;

namespace MondrAIn.Core.Transformations;

/// <summary>
/// Replaces each pixel's R, G, and B channels with their integer average; alpha is unchanged.
/// </summary>
public static class GrayscaleTransform
{
    public static PixelGrid Apply(PixelGrid source)
    {
        ArgumentNullException.ThrowIfNull(source);

        var pixels = new PixelColor[source.Width * source.Height];

        for (var y = 0; y < source.Height; y++)
        {
            for (var x = 0; x < source.Width; x++)
            {
                var color = source[x, y];
                var gray = (byte)((color.R + color.G + color.B) / 3);
                pixels[(y * source.Width) + x] = new PixelColor(gray, gray, gray, color.A);
            }
        }

        return new PixelGrid(source.Width, source.Height, pixels);
    }
}
