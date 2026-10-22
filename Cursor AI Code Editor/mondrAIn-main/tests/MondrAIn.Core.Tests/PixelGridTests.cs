using MondrAIn.Core.Models;

namespace MondrAIn.Core.Tests;

public class PixelGridTests
{
    [Fact]
    public void Constructor_PreservesWidthAndHeight()
    {
        var pixels = new[]
        {
            new PixelColor(255, 0, 0),
            new PixelColor(0, 255, 0),
            new PixelColor(0, 0, 255),
            new PixelColor(255, 255, 255),
        };

        var grid = new PixelGrid(2, 2, pixels);

        Assert.Equal(2, grid.Width);
        Assert.Equal(2, grid.Height);
    }

    [Fact]
    public void FromBgra32_LoadsPixelsInRowMajorOrder()
    {
        var bgra = new byte[]
        {
            10, 20, 30, 255,
            40, 50, 60, 128,
            70, 80, 90, 64,
            100, 110, 120, 32,
        };

        var grid = PixelGrid.FromBgra32(2, 2, bgra, stride: 8);

        Assert.Equal(new PixelColor(30, 20, 10, 255), grid[0, 0]);
        Assert.Equal(new PixelColor(60, 50, 40, 128), grid[1, 0]);
        Assert.Equal(new PixelColor(90, 80, 70, 64), grid[0, 1]);
        Assert.Equal(new PixelColor(120, 110, 100, 32), grid[1, 1]);
    }

    [Fact]
    public void Constructor_ClonesPixelArray_SoExternalMutationDoesNotAffectGrid()
    {
        var pixels = new[] { new PixelColor(1, 2, 3) };
        var grid = new PixelGrid(1, 1, pixels);

        pixels[0] = new PixelColor(9, 9, 9);

        Assert.Equal(new PixelColor(1, 2, 3), grid[0, 0]);
    }

    [Fact]
    public void SourceGrid_IsIndependentInstancePerUpload()
    {
        var first = new PixelGrid(1, 1, [new PixelColor(1, 1, 1)]);
        var second = new PixelGrid(1, 1, [new PixelColor(2, 2, 2)]);

        Assert.NotSame(first, second);
        Assert.NotEqual(first[0, 0], second[0, 0]);
    }
}
