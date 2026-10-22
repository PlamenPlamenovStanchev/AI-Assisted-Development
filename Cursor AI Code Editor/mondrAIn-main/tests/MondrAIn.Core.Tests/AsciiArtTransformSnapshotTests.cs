using MondrAIn.Core.Transformations;

namespace MondrAIn.Core.Tests;

public class AsciiArtTransformSnapshotTests
{
    [Theory]
    [MemberData(nameof(TestParameters.SampleImageFilePaths), MemberType = typeof(TestParameters))]
    public void Apply_MatchesSnapshot(string sampleFilePath)
    {
        var snapshotPath = Path.Combine(
            AppContext.BaseDirectory,
            "Snapshots",
            Path.ChangeExtension(Path.GetFileName(sampleFilePath), ".txt"));

        var source = TestImageLoader.Load(sampleFilePath);
        var actual = AsciiArtTransform.Apply(source);
        var actualText = AsciiArtText.Serialize(actual);
        var expectedText = File.ReadAllText(snapshotPath);

        Assert.Equal(expectedText, actualText);
    }
}
