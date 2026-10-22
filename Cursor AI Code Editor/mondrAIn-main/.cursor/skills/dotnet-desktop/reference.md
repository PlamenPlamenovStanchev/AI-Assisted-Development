# WPF Reference

## Application structure

- Entry: `App.xaml` / `App.xaml.cs`
- Main shell: `MainWindow.xaml` (+ optional additional `Window` types)
- Typical folders: `Views/`, `ViewModels/`, `Models/`, `Services/`, `Themes/`
- Global resources: merged dictionaries in `App.xaml`

## MVVM patterns

| Piece | Responsibility |
|-------|----------------|
| View | XAML + thin code-behind |
| ViewModel | State, commands, orchestration |
| Model / Service | Data and external I/O |

- `DataContext` on view or via DI; bindings use `Path` and `UpdateSourceTrigger` consistently with the project.
- `RelativeSource` / `ElementName` only when relative binding is required—prefer ViewModel properties.
- Validation: `IDataErrorInfo`, `INotifyDataErrorInfo`, or validation attached properties—match what the project already uses.

## Commands and navigation

- User actions → `ICommand` (often `RelayCommand` from CommunityToolkit.Mvvm).
- Navigation between views: project’s existing pattern (`ContentControl` + DataTemplates, region adapter, or separate windows)—do not invent a second navigation style.

## Common build issues

| Error | Typical fix |
|-------|-------------|
| MC3000 / XAML parse | Mismatched tags, wrong `xmlns`, invalid resource key |
| CS7064 / icon/manifest | Fix path in `.csproj` or add missing file |
| Platform not supported | Use `net*-windows` TFM and `<UseWPF>true</UseWPF>` |
| Duplicate types | `x:Class` namespace must match folder and project root namespace |
| Binding errors at runtime | Broken `Path`, wrong `DataContext`, or missing `INotifyPropertyChanged` |
