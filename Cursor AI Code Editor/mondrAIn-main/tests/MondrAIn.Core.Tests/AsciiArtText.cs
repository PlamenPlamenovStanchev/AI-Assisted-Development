using MondrAIn.Core.Models;

namespace MondrAIn.Core.Tests;

internal static class AsciiArtText
{
    public static string Serialize(AsciiArt art) =>
        string.Join('\n', art.GetRows());
}
