---
name: dotnet-snapshot-testing
description: Guides .NET snapshot test work that uses Samples and Snapshots folders. Use when creating, updating, or reviewing snapshot tests, golden-file tests, approval tests, or expected-output files in a .NET test project.
---

# .NET Snapshot Testing

## Core Rules

Within a test project, snapshot tests use two special folders:

- `Samples/` contains input files or fixtures used by tests.
- `Snapshots/` contains expected output files committed with the tests.

The test project must copy all files from both special directories to the output directory at build time. When adding or reviewing snapshot tests, verify the `.csproj` includes `Samples/**/*` and `Snapshots/**/*` as content copied to the build output.

If the agent has to create a new snapshot test, only then it must create manually the expected snapshot. For this purpose, it is acceptable to run the tests and let them fail once; but after the snapshot is created, the tests must be re-run and the agent should validate they pass.

The tests themselves MUST NEVER include snapshot ensuring logic or logic for automated modification of a snapshot.

## Shared test parameters

Reuse `TestParameters` in the test project for snapshot theory data. It discovers image files under `Samples/` (resolved via `AppContext.BaseDirectory`) and exposes `SampleImageFilePaths()` for `[MemberData]`. Each theory case receives the **full sample file path**; derive display or snapshot names with `Path.GetFileName` when needed (for example, `Path.ChangeExtension(Path.GetFileName(sampleFilePath), ".txt")` for the matching snapshot).

```csharp
[Theory]
[MemberData(nameof(TestParameters.SampleImageFilePaths), MemberType = typeof(TestParameters))]
public void Apply_MatchesSnapshot(string sampleFilePath) { ... }
```

Add new `MemberData` helpers to `TestParameters` when other snapshot tests need different sample sets or extensions.

## Workflow

1. Locate the affected test project and inspect existing snapshot tests before adding new patterns.
2. Keep sample inputs under `Samples/` and expected outputs under `Snapshots/`, following the project's existing naming convention.
3. For a new snapshot test, wire `[MemberData]` to `TestParameters` (or a new helper there) and write normal assertion logic that reads the expected snapshot and compares it with the actual output.
4. If the expected snapshot does not exist yet, manually create it in `Snapshots/`. Running the test once to capture the failure or actual output is allowed.
5. Re-run the affected tests after creating or updating the snapshot. Do not finish until the relevant tests pass, or report the remaining failure.

## Test Code Boundaries

Snapshot test code may:

- Read sample input from `Samples/`.
- Read expected output from `Snapshots/`.
- Compare actual output to expected output with ordinary assertions.

Snapshot test code must not:

- Create missing snapshot files.
- Overwrite existing snapshot files.
- Include an "accept", "approve", "bless", or "update snapshots" mode.
- Change behavior based on environment variables, command-line flags, or local machine state to modify snapshots.
- Hide missing or changed snapshots by regenerating expected output.

## Verification

After any snapshot test or snapshot file change:

```powershell
dotnet test "path/to/TestProject.csproj"
```

For solution-wide changes, run the solution tests instead. Report whether the tests passed and mention any failing snapshot comparison that still needs attention.
