namespace fAInances.Services.Export;

public interface ITransactionExportService
{
    /// <summary>
    /// Exports every transaction dated within the given month, oldest first.
    /// </summary>
    Task<ExportFile> ExportMonthAsync(int year, int month, CancellationToken cancellationToken = default);
}
