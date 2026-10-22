using MondrAIn.Core.Models;

namespace MondrAIn.App.Services;

public interface IImageLoaderService
{
    PixelGrid LoadFromFile(string filePath);
}
