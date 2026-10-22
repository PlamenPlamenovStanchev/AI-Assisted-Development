using System.Windows.Media.Imaging;
using MondrAIn.Core.Models;

namespace MondrAIn.App.Services;

public interface IPreviewImageFactory
{
    BitmapSource Create(PixelGrid source);
}
