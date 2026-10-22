using System.Windows.Media.Imaging;
using MondrAIn.Core.Models;

namespace MondrAIn.App.Services;

public interface IAsciiArtRenderer
{
    BitmapSource Render(AsciiArt art, int targetWidth, int targetHeight);
}
