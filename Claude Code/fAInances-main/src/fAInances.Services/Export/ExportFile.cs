namespace fAInances.Services.Export;

/// <summary>
/// A generated export, held in memory, ready to be sent to the browser as a download.
/// </summary>
public sealed record ExportFile(string FileName, string ContentType, byte[] Content);
