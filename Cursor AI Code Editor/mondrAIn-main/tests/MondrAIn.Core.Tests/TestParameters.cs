namespace MondrAIn.Core.Tests;

internal static class TestParameters
{
    private static readonly string[] SupportedImageExtensions = [".jpg", ".jpeg", ".png", ".bmp"];

    public static IEnumerable<object[]> SampleImageFilePaths()
    {
        var samplesDirectory = Path.Combine(AppContext.BaseDirectory, "Samples");

        if (!Directory.Exists(samplesDirectory))
        {
            yield break;
        }

        foreach (var path in Directory.EnumerateFiles(samplesDirectory))
        {
            if (SupportedImageExtensions.Contains(
                Path.GetExtension(path),
                StringComparer.OrdinalIgnoreCase))
            {
                yield return [path];
            }
        }
    }
}
