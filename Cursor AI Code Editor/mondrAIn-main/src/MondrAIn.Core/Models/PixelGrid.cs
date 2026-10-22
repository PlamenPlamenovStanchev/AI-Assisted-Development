namespace MondrAIn.Core.Models;

/// <summary>
/// Immutable in-memory grid of pixels (the canonical source image).
/// </summary>
public sealed class PixelGrid
{
    private readonly PixelColor[] _pixels;

    public int Width { get; }
    public int Height { get; }

    public PixelGrid(int width, int height, PixelColor[] pixels)
    {
        if (width <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(width), "Width must be positive.");
        }

        if (height <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(height), "Height must be positive.");
        }

        ArgumentNullException.ThrowIfNull(pixels);

        if (pixels.Length != width * height)
        {
            throw new ArgumentException(
                $"Expected {width * height} pixels, but received {pixels.Length}.",
                nameof(pixels));
        }

        Width = width;
        Height = height;
        _pixels = (PixelColor[])pixels.Clone();
    }

    public PixelColor this[int x, int y]
    {
        get
        {
            if (x < 0 || x >= Width)
            {
                throw new ArgumentOutOfRangeException(nameof(x));
            }

            if (y < 0 || y >= Height)
            {
                throw new ArgumentOutOfRangeException(nameof(y));
            }

            return _pixels[(y * Width) + x];
        }
    }

    public ReadOnlySpan<PixelColor> Pixels => _pixels;

    public static PixelGrid FromBgra32(int width, int height, byte[] bgraPixels, int stride)
    {
        ArgumentNullException.ThrowIfNull(bgraPixels);

        if (stride < width * 4)
        {
            throw new ArgumentException("Stride is too small for the given width.", nameof(stride));
        }

        var pixels = new PixelColor[width * height];

        for (var y = 0; y < height; y++)
        {
            var rowOffset = y * stride;

            for (var x = 0; x < width; x++)
            {
                var i = rowOffset + (x * 4);
                pixels[(y * width) + x] = new PixelColor(
                    bgraPixels[i + 2],
                    bgraPixels[i + 1],
                    bgraPixels[i],
                    bgraPixels[i + 3]);
            }
        }

        return new PixelGrid(width, height, pixels);
    }
}
