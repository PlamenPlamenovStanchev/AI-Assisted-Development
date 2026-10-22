using System.Windows.Media.Imaging;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MondrAIn.App.Services;
using MondrAIn.Core.Models;
using MondrAIn.Core.Transformations;

namespace MondrAIn.App.ViewModels;

public partial class MainViewModel : ObservableObject
{
    private readonly IFileDialogService _fileDialogService;
    private readonly IImageLoaderService _imageLoaderService;
    private readonly IPreviewImageFactory _previewImageFactory;
    private readonly IAsciiArtRenderer _asciiArtRenderer;

    [ObservableProperty]
    private BitmapSource? _previewImage;

    [ObservableProperty]
    [NotifyCanExecuteChangedFor(nameof(ApplyGrayscaleCommand))]
    [NotifyCanExecuteChangedFor(nameof(ApplyAsciiCommand))]
    [NotifyCanExecuteChangedFor(nameof(ApplyFlipHorizontalCommand))]
    [NotifyCanExecuteChangedFor(nameof(ApplyFlipVerticalCommand))]
    private bool _hasSourceImage;

    [ObservableProperty]
    [NotifyCanExecuteChangedFor(nameof(RevertCommand))]
    private bool _hasAppliedTransformation;

    public PixelGrid? SourceImage { get; private set; }

    public MainViewModel(
        IFileDialogService fileDialogService,
        IImageLoaderService imageLoaderService,
        IPreviewImageFactory previewImageFactory,
        IAsciiArtRenderer asciiArtRenderer)
    {
        _fileDialogService = fileDialogService;
        _imageLoaderService = imageLoaderService;
        _previewImageFactory = previewImageFactory;
        _asciiArtRenderer = asciiArtRenderer;
    }

    [RelayCommand]
    private void UploadImage()
    {
        var filePath = _fileDialogService.PickImageFile();
        if (filePath is null)
        {
            return;
        }

        var grid = _imageLoaderService.LoadFromFile(filePath);
        SourceImage = grid;
        HasSourceImage = true;
        HasAppliedTransformation = false;
        PreviewImage = _previewImageFactory.Create(grid);
    }

    [RelayCommand(CanExecute = nameof(CanApplyGrayscale))]
    private void ApplyGrayscale()
    {
        if (SourceImage is null)
        {
            return;
        }

        var grayscale = GrayscaleTransform.Apply(SourceImage);
        PreviewImage = _previewImageFactory.Create(grayscale);
        HasAppliedTransformation = true;
    }

    [RelayCommand(CanExecute = nameof(CanApplyAscii))]
    private void ApplyAscii()
    {
        if (SourceImage is null)
        {
            return;
        }

        var asciiArt = AsciiArtTransform.Apply(SourceImage);
        PreviewImage = _asciiArtRenderer.Render(asciiArt, SourceImage.Width, SourceImage.Height);
        HasAppliedTransformation = true;
    }

    [RelayCommand(CanExecute = nameof(CanApplyFlipHorizontal))]
    private void ApplyFlipHorizontal()
    {
        if (SourceImage is null)
        {
            return;
        }

        var flipped = FlipHorizontalTransform.Apply(SourceImage);
        PreviewImage = _previewImageFactory.Create(flipped);
        HasAppliedTransformation = true;
    }

    [RelayCommand(CanExecute = nameof(CanApplyFlipVertical))]
    private void ApplyFlipVertical()
    {
        if (SourceImage is null)
        {
            return;
        }

        var flipped = FlipVerticalTransform.Apply(SourceImage);
        PreviewImage = _previewImageFactory.Create(flipped);
        HasAppliedTransformation = true;
    }

    [RelayCommand(CanExecute = nameof(CanRevert))]
    private void Revert()
    {
        if (SourceImage is null)
        {
            return;
        }

        PreviewImage = _previewImageFactory.Create(SourceImage);
        HasAppliedTransformation = false;
    }

    private bool CanApplyGrayscale() => HasSourceImage;

    private bool CanApplyAscii() => HasSourceImage;

    private bool CanApplyFlipHorizontal() => HasSourceImage;

    private bool CanApplyFlipVertical() => HasSourceImage;

    private bool CanRevert() => HasAppliedTransformation;
}
