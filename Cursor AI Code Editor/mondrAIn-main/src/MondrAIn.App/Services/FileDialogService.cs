using Microsoft.Win32;

namespace MondrAIn.App.Services;

public sealed class FileDialogService : IFileDialogService
{
    public string? PickImageFile()
    {
        var dialog = new OpenFileDialog
        {
            Title = "Upload Image",
            Filter = "Image files (*.png;*.jpg;*.jpeg;*.bmp;*.gif)|*.png;*.jpg;*.jpeg;*.bmp;*.gif|All files (*.*)|*.*",
            CheckFileExists = true,
            Multiselect = false,
        };

        return dialog.ShowDialog() == true ? dialog.FileName : null;
    }
}
