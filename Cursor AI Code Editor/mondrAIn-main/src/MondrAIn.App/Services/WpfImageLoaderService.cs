using System.IO;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using MondrAIn.Core.Models;

namespace MondrAIn.App.Services;

public sealed class WpfImageLoaderService : IImageLoaderService
{
    public PixelGrid LoadFromFile(string filePath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(filePath);

        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException("The selected image file does not exist.", filePath);
        }

        using var stream = File.OpenRead(filePath);
        var decoder = BitmapDecoder.Create(
            stream,
            BitmapCreateOptions.PreservePixelFormat,
            BitmapCacheOption.OnLoad);

        var frame = decoder.Frames[0];
        var converted = new FormatConvertedBitmap(frame, PixelFormats.Bgra32, null, 0);
        converted.Freeze();

        var width = converted.PixelWidth;
        var height = converted.PixelHeight;
        var stride = width * 4;
        var pixels = new byte[height * stride];
        converted.CopyPixels(pixels, stride, 0);

        return PixelGrid.FromBgra32(width, height, pixels, stride);
    }
}
