---
name: dotnet-desktop
description: >-
  WPF best practices: MVVM, UI threading, XAML, project layout, mandatory
  solution builds, and passing tests after every code change. Use when editing
  or creating WPF projects, .csproj/.sln files, XAML, code-behind, ViewModels,
  or resource dictionaries in this repository.
---

# WPF Development

## Before You Change Code

1. Locate the solution (`.sln`) or WPF project (`.csproj`). Prefer building the whole solution when a `.sln` exists.
2. Read surrounding files first: match naming, MVVM layout, DI setup, and target framework.
3. Follow existing project conventions—do not introduce alternate UI patterns.

## Mandatory: Build and Test After Every Change

**You MUST build the solution and ensure all tests pass after any change** to source, XAML, resources, project files, or app configuration—before considering the task complete or moving to the next edit.

This rule has no exceptions for "small" or "trivial" edits.

### Build and test workflow

1. **Discover build target**
   - If a `.sln` exists at or above the changed files, use it.
   - Otherwise build the affected `.csproj` (or the app's startup project in a multi-project solution).

2. **Run build** (from repo root or directory containing the solution):

   ```powershell
   dotnet build "path/to/Solution.sln" --no-restore
   ```

   If restore may be needed (new packages, fresh clone):

   ```powershell
   dotnet restore "path/to/Solution.sln"
   dotnet build "path/to/Solution.sln"
   ```

   For a single project:

   ```powershell
   dotnet build "path/to/App.csproj"
   ```

   Use `-c Release` only when the user asks for Release; default to Debug.

3. **Run tests** to validate the change:

   ```powershell
   dotnet test "path/to/Solution.sln" --no-build
   ```

   If testing a single project is appropriate:

   ```powershell
   dotnet test "path/to/Tests.csproj" --no-build
   ```

4. **On failure**: read errors, fix root cause, rebuild and rerun tests. Repeat until the build succeeds and all tests pass, or you report a blocker you cannot fix without user input.

5. **Report to the user**: briefly state build and test results (success or remaining errors). Do not claim the change is done if the build failed or tests failed.

### When multiple projects changed

Build the **solution**, not isolated projects, unless the solution is missing or the user scoped work to one project.

---

## Architecture (MVVM)

Use **MVVM**: Views (XAML) → ViewModels → Models/Services.

- Keep **code-behind thin**: constructors, `InitializeComponent`, view-only wiring only—no business logic.
- **One type per file**; namespace matches folder layout.
- Shared UI strings: `.resx` or resource dictionaries—not duplicated literals across views.
- ViewModels: `INotifyPropertyChanged` or `CommunityToolkit.Mvvm` (`ObservableObject`, `[RelayCommand]`).
- Commands: `ICommand` / `RelayCommand`—not click handlers with business logic.

## UI Thread and Async

- **Never block the UI thread**: no `.Result`, `.Wait()`, or `Thread.Sleep` on the dispatcher thread.
- Use `async`/`await` for I/O and long work; return to UI via `Application.Current.Dispatcher` or `Dispatcher.InvokeAsync`.
- `async void` only for event handlers; prefer `async Task` elsewhere.
- Cancel long operations with `CancellationToken` when the user navigates away or closes the window.

## XAML

- Use design-time `DataContext` where the project already does, for binding validation in the designer.
- Prefer **bindings** over named control manipulation from code-behind.
- Put shared styles in `App.xaml` or `Themes/` merged dictionaries—avoid copy-pasted setters per view.
- Use `x:Name` only when code-behind or focus automation requires it—not for logic that belongs in bindings.
- After XAML edits, the mandatory build and test steps catch parse, binding, resource, and behavioral errors.

## Dependency Injection and Services

- Register services in `App.xaml.cs` (or the project's host setup)—constructor-inject into ViewModels.
- ViewModels depend on **interfaces** (`INavigationService`, `IDialogService`), not concrete `Window` types.
- Scope ViewModels to window/view lifetime when state is view-specific; do not capture views in singletons.

## WPF-Specific Concerns

- **DPI**: prefer star sizing and scalable layout; test non-default DPI when layout is pixel-perfect.
- **Paths**: `Environment.SpecialFolder`, `AppContext.BaseDirectory`, or injected path services—not hardcoded `C:\` paths.
- **Settings**: `ApplicationSettingsBase`, `IOptions`, or user-scoped JSON in app data.
- **Secrets**: User Secrets in dev; never commit API keys.
- **Logging**: `ILogger` for diagnostics; avoid `MessageBox` for trace output.
- **Dialogs**: inject `IDialogService` or open `Window` with owner set from the main window context.

## Project Hygiene

- Use `net*-windows` target framework with `<UseWPF>true</UseWPF>` and `<OutputType>WinExe</OutputType>` for apps.
- Align `TargetFramework` across projects in the same solution.
- Enable **nullable reference types**; fix warnings that indicate real nullability bugs.
- Add NuGet packages only when needed; prefer existing project dependencies.

## Change Checklist

```
- [ ] Read existing WPF patterns in the target project
- [ ] Implement minimal scoped change
- [ ] dotnet build (solution or startup project) — REQUIRED
- [ ] dotnet test (solution or relevant test project) — REQUIRED
- [ ] Fix all build errors
- [ ] Fix all test failures
- [ ] Summarize build and test outcomes to the user
```

## Additional Resources

- MVVM, commands, dialogs, and common build errors: [reference.md](reference.md)
