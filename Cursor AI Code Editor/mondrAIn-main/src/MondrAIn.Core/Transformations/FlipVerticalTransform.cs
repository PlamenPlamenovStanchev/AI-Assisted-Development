using MondrAIn.Core.Models;

namespace MondrAIn.Core.Transformations;

/// <summary>
/// Mirrors the image vertically (top/bottom).
/// </summary>
public static class FlipVerticalTransform
{
    public static PixelGrid Apply(PixelGrid source)
    {
        ArgumentNullException.ThrowIfNull(source);

        var pixels = new PixelColor[source.Width * source.Height];

        for (var y = 0; y < source.Height; y++)
        {
            for (var x = 0; x < source.Width; x++)
            {
                pixels[(y * source.Width) + x] = source[x, source.Height - 1 - y];
            }
        }

        return new PixelGrid(source.Width, source.Height, pixels);
    }
}
