using MondrAIn.App.Services;
using MondrAIn.App.ViewModels;
using System.Windows;

namespace MondrAIn.App;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        DataContext = new MainViewModel(
            new FileDialogService(),
            new WpfImageLoaderService(),
            new PreviewImageFactory(),
            new AsciiArtRenderer());
    }
}
