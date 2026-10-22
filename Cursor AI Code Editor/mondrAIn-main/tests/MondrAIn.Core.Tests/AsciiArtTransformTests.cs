using MondrAIn.Core.Models;
using MondrAIn.Core.Transformations;

namespace MondrAIn.Core.Tests;

public class AsciiArtTransformTests
{
    [Fact]
    public void Apply_16x16WithBlockSize4_Produces4x4Grid()
    {
        var source = CreateSolidGrid(16, 16, new PixelColor(128, 128, 128));

        var result = AsciiArtTransform.Apply(source, blockSize: 4);

        Assert.Equal(4, result.Columns);
        Assert.Equal(4, result.Rows);
        Assert.Equal(16, result.Columns * result.Rows);
    }

    [Fact]
    public void Apply_AllBlackBlock_MapsToLeastDenseCharacter()
    {
        var source = CreateSolidGrid(4, 4, new PixelColor(0, 0, 0));

        var result = AsciiArtTransform.Apply(source, blockSize: 4);

        Assert.Equal(AsciiArtTransform.DensityRamp[0], result[0, 0]);
    }

    [Fact]
    public void Apply_AllWhiteBlock_MapsToMostDenseCharacter()
    {
        var source = CreateSolidGrid(4, 4, new PixelColor(255, 255, 255));

        var result = AsciiArtTransform.Apply(source, blockSize: 4);

        Assert.Equal(AsciiArtTransform.DensityRamp[^1], result[0, 0]);
    }

    [Fact]
    public void Apply_MixedPixelsInBlock_SelectsRampIndexFromAverageDensity()
    {
        var source = new PixelGrid(2, 2,
        [
            new PixelColor(0, 0, 0),
            new PixelColor(255, 255, 255),
            new PixelColor(0, 0, 0),
            new PixelColor(255, 255, 255),
        ]);

        var result = AsciiArtTransform.Apply(source, blockSize: 2);

        var expectedIndex = (int)Math.Round(127.5 / 255.0 * (AsciiArtTransform.DensityRamp.Length - 1));
        Assert.Equal(AsciiArtTransform.DensityRamp[expectedIndex], result[0, 0]);
    }

    [Fact]
    public void Apply_NonDivisibleDimensions_UsesCeilingAndAveragesInBoundsPixelsOnly()
    {
        var pixels = new PixelColor[36];
        Array.Fill(pixels, new PixelColor(0, 0, 0));
        pixels[35] = new PixelColor(255, 255, 255);

        var source = new PixelGrid(6, 6, pixels);

        var result = AsciiArtTransform.Apply(source, blockSize: 4);

        Assert.Equal(2, result.Columns);
        Assert.Equal(2, result.Rows);
        Assert.Equal(AsciiArtTransform.DensityRamp[0], result[0, 0]);
        Assert.Equal(AsciiArtTransform.DensityRamp[0], result[1, 0]);
        Assert.Equal(AsciiArtTransform.DensityRamp[0], result[0, 1]);

        Assert.Equal(AsciiArtTransform.DensityRamp[^1], result[1, 1]);
    }

    [Fact]
    public void Apply_CompressedLuminanceRange_UsesFullRampViaContrastStretch()
    {
        var pixels = new PixelColor[64];
        for (var y = 0; y < 8; y++)
        {
            for (var x = 0; x < 8; x++)
            {
                var density = (byte)(x < 4 && y < 4 ? 100 : 200);
                pixels[(y * 8) + x] = new PixelColor(density, density, density);
            }
        }

        var source = new PixelGrid(8, 8, pixels);

        var result = AsciiArtTransform.Apply(source, blockSize: 4);

        Assert.Equal(AsciiArtTransform.DensityRamp[0], result[0, 0]);
        Assert.Equal(AsciiArtTransform.DensityRamp[^1], result[1, 1]);
    }

    [Fact]
    public void Apply_UsesDefaultBlockSize()
    {
        var source = CreateSolidGrid(8, 8, new PixelColor(100, 100, 100));

        var result = AsciiArtTransform.Apply(source);

        Assert.Equal(2, result.Columns);
        Assert.Equal(2, result.Rows);
    }

    [Fact]
    public void Apply_DoesNotMutateSourceGrid()
    {
        var pixels = new[] { new PixelColor(100, 50, 25) };
        var source = new PixelGrid(1, 1, pixels);

        _ = AsciiArtTransform.Apply(source);

        Assert.Equal(new PixelColor(100, 50, 25), source[0, 0]);
    }

    [Fact]
    public void Apply_NullSource_Throws()
    {
        Assert.Throws<ArgumentNullException>(() => AsciiArtTransform.Apply(null!));
    }

    [Fact]
    public void Apply_InvalidBlockSize_Throws()
    {
        var source = new PixelGrid(4, 4, Enumerable.Repeat(new PixelColor(0, 0, 0), 16).ToArray());

        Assert.Throws<ArgumentOutOfRangeException>(() => AsciiArtTransform.Apply(source, blockSize: 0));
    }

    private static PixelGrid CreateSolidGrid(int width, int height, PixelColor color)
    {
        var pixels = Enumerable.Repeat(color, width * height).ToArray();
        return new PixelGrid(width, height, pixels);
    }
}
