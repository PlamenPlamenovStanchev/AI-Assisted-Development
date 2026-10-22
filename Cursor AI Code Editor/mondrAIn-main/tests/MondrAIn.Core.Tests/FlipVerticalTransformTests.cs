using MondrAIn.Core.Models;
using MondrAIn.Core.Transformations;

namespace MondrAIn.Core.Tests;

public class FlipVerticalTransformTests
{
    [Fact]
    public void Apply_MirrorsPixelsVertically()
    {
        var source = new PixelGrid(1, 3,
        [
            new PixelColor(1, 0, 0),
            new PixelColor(2, 0, 0),
            new PixelColor(3, 0, 0),
        ]);

        var result = FlipVerticalTransform.Apply(source);

        Assert.Equal(new PixelColor(3, 0, 0), result[0, 0]);
        Assert.Equal(new PixelColor(2, 0, 0), result[0, 1]);
        Assert.Equal(new PixelColor(1, 0, 0), result[0, 2]);
    }

    [Fact]
    public void Apply_PreservesHorizontalOrder()
    {
        var source = new PixelGrid(2, 2,
        [
            new PixelColor(10, 0, 0),
            new PixelColor(20, 0, 0),
            new PixelColor(30, 0, 0),
            new PixelColor(40, 0, 0),
        ]);

        var result = FlipVerticalTransform.Apply(source);

        Assert.Equal(new PixelColor(30, 0, 0), result[0, 0]);
        Assert.Equal(new PixelColor(40, 0, 0), result[1, 0]);
        Assert.Equal(new PixelColor(10, 0, 0), result[0, 1]);
        Assert.Equal(new PixelColor(20, 0, 0), result[1, 1]);
    }

    [Fact]
    public void Apply_DoesNotMutateSourceGrid()
    {
        var pixels = new[] { new PixelColor(100, 50, 25, 200) };
        var source = new PixelGrid(1, 1, pixels);

        _ = FlipVerticalTransform.Apply(source);

        Assert.Equal(new PixelColor(100, 50, 25, 200), source[0, 0]);
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

        var result = FlipVerticalTransform.Apply(source);

        Assert.Equal(2, result.Width);
        Assert.Equal(3, result.Height);
        Assert.NotSame(source, result);
    }

    [Fact]
    public void Apply_ThrowsWhenSourceIsNull()
    {
        Assert.Throws<ArgumentNullException>(() => FlipVerticalTransform.Apply(null!));
    }
}
