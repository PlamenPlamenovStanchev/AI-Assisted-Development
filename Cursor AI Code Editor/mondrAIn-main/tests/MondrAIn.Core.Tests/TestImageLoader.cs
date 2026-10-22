using MondrAIn.Core.Models;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

namespace MondrAIn.Core.Tests;

internal static class TestImageLoader
{
    public static PixelGrid Load(string filePath)
    {
        using var image = Image.Load<Rgb24>(filePath);
        var pixels = new PixelColor[image.Width * image.Height];

        image.ProcessPixelRows(accessor =>
        {
            for (var y = 0; y < accessor.Height; y++)
            {
                var row = accessor.GetRowSpan(y);

                for (var x = 0; x < row.Length; x++)
                {
                    ref var pixel = ref row[x];
                    pixels[(y * image.Width) + x] = new PixelColor(pixel.R, pixel.G, pixel.B);
                }
            }
        });

        return new PixelGrid(image.Width, image.Height, pixels);
    }
}
