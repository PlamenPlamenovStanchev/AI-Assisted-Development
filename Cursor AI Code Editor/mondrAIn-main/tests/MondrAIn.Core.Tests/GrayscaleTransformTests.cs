using MondrAIn.Core.Models;
using MondrAIn.Core.Transformations;

namespace MondrAIn.Core.Tests;

public class GrayscaleTransformTests
{
    [Fact]
    public void Apply_ReplacesRgbWithIntegerAverage()
    {
        var source = new PixelGrid(1, 1, [new PixelColor(10, 20, 22)]);

        var result = GrayscaleTransform.Apply(source);

        Assert.Equal(new PixelColor(17, 17, 17), result[0, 0]);
    }

    [Fact]
    public void Apply_PreservesAlpha()
    {
        var source = new PixelGrid(1, 1, [new PixelColor(30, 60, 90, 128)]);

        var result = GrayscaleTransform.Apply(source);

        Assert.Equal((byte)128, result[0, 0].A);
        Assert.Equal(result[0, 0].R, result[0, 0].G);
        Assert.Equal(result[0, 0].G, result[0, 0].B);
    }

    [Fact]
    public void Apply_DoesNotMutateSourceGrid()
    {
        var pixels = new[] { new PixelColor(100, 50, 25, 200) };
        var source = new PixelGrid(1, 1, pixels);

        _ = GrayscaleTransform.Apply(source);

        Assert.Equal(new PixelColor(100, 50, 25, 200), source[0, 0]);
    }

    [Fact]
    public void Apply_ProcessesAllPixelsInRowMajorOrder()
    {
        var source = new PixelGrid(2, 2,
        [
            new PixelColor(0, 0, 0),
            new PixelColor(255, 0, 0),
            new PixelColor(0, 255, 0),
            new PixelColor(0, 0, 255),
        ]);

        var result = GrayscaleTransform.Apply(source);

        Assert.Equal(new PixelColor(0, 0, 0), result[0, 0]);
        Assert.Equal(new PixelColor(85, 85, 85), result[1, 0]);
        Assert.Equal(new PixelColor(85, 85, 85), result[0, 1]);
        Assert.Equal(new PixelColor(85, 85, 85), result[1, 1]);
    }

    [Fact]
    public void Apply_ReturnsNewGridWithSameDimensions()
    {
        var source = new PixelGrid(2, 3,
        [
            new PixelColor(1, 2, 3),
            new PixelColor(4, 5, 6),
            new PixelColor(7, 8, 9),
            new PixelColor(10, 11, 12),
            new PixelColor(13, 14, 15),
            new PixelColor(16, 17, 18),
        ]);

        var result = GrayscaleTransform.Apply(source);

        Assert.Equal(2, result.Width);
        Assert.Equal(3, result.Height);
        Assert.NotSame(source, result);
    }
}
