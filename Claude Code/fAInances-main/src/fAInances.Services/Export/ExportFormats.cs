namespace fAInances.Services.Export;

/// <summary>
/// The supported export formats. Each value is the file extension, the URL value
/// and the key the matching <see cref="ITransactionExportService"/> is registered under.
/// </summary>
public static class ExportFormats
{
    public const string Csv = "csv";

    public const string Excel = "xlsx";

    public const string Pdf = "pdf";
}
