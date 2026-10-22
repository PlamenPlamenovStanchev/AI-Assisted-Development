using System.Windows.Media;
using System.Windows.Media.Imaging;
using MondrAIn.Core.Models;

namespace MondrAIn.App.Services;

public sealed class PreviewImageFactory : IPreviewImageFactory
{
    public BitmapSource Create(PixelGrid source)
    {
        ArgumentNullException.ThrowIfNull(source);

        var stride = source.Width * 4;
        var pixels = new byte[source.Height * stride];

        for (var y = 0; y < source.Height; y++)
        {
            var rowOffset = y * stride;

            for (var x = 0; x < source.Width; x++)
            {
                var color = source[x, y];
                var i = rowOffset + (x * 4);
                pixels[i] = color.B;
                pixels[i + 1] = color.G;
                pixels[i + 2] = color.R;
                pixels[i + 3] = color.A;
            }
        }

        var bitmap = BitmapSource.Create(
            source.Width,
            source.Height,
            96,
            96,
            PixelFormats.Bgra32,
            null,
            pixels,
            stride);

        bitmap.Freeze();
        return bitmap;
    }
}
