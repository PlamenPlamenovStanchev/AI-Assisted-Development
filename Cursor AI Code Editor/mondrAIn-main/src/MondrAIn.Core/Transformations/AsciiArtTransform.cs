using MondrAIn.Core.Models;

namespace MondrAIn.Core.Transformations;

/// <summary>
/// Converts a pixel grid into a grid of ASCII characters by averaging density per block.
/// </summary>
public static class AsciiArtTransform
{
    public const int DefaultBlockSize = 4;

    /// <summary>
    /// Characters ordered from least to most visual density.
    /// </summary>
    public const string DensityRamp = "@#+=-:.";

    public static AsciiArt Apply(PixelGrid source, int blockSize = DefaultBlockSize)
    {
        ArgumentNullException.ThrowIfNull(source);

        if (blockSize <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(blockSize), "Block size must be positive.");
        }

        var columns = (source.Width + blockSize - 1) / blockSize;
        var rows = (source.Height + blockSize - 1) / blockSize;
        var blockCount = columns * rows;
        var blockDensities = new double[blockCount];
        var maxRampIndex = DensityRamp.Length - 1;

        for (var blockIndex = 0; blockIndex < blockCount; blockIndex++)
        {
            var column = blockIndex % columns;
            var row = blockIndex / columns;
            var blockStartX = column * blockSize;
            var blockStartY = row * blockSize;
            var blockEndX = Math.Min(blockStartX + blockSize, source.Width);
            var blockEndY = Math.Min(blockStartY + blockSize, source.Height);

            var densitySum = 0.0;
            var pixelCount = 0;

            for (var y = blockStartY; y < blockEndY; y++)
            {
                for (var x = blockStartX; x < blockEndX; x++)
                {
                    var color = source[x, y];
                    densitySum += (color.R + color.G + color.B) / 3.0;
                    pixelCount++;
                }
            }

            blockDensities[blockIndex] = pixelCount > 0 ? densitySum / pixelCount : 0.0;
        }

        var minDensity = blockDensities.Min();
        var maxDensity = blockDensities.Max();
        var densityRange = maxDensity - minDensity;
        var characters = new char[blockCount];

        for (var blockIndex = 0; blockIndex < blockCount; blockIndex++)
        {
            var averageDensity = blockDensities[blockIndex];
            var normalized = densityRange > 0
                ? (averageDensity - minDensity) / densityRange
                : averageDensity / 255.0;

            var rampIndex = (int)Math.Round(normalized * maxRampIndex);
            rampIndex = Math.Clamp(rampIndex, 0, maxRampIndex);
            characters[blockIndex] = DensityRamp[rampIndex];
        }

        return new AsciiArt(columns, rows, characters);
    }
}
