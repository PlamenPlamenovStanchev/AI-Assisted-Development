using System.Globalization;
using fAInances.Services.Entities;
using fAInances.Services.Models;
using fAInances.Services.Transactions;

namespace fAInances.Services.Export;

/// <summary>
/// Loads the month's transactions and names the file; each format only writes the rows.
/// </summary>
internal abstract class TransactionExportService(ITransactionService transactionService) : ITransactionExportService
{
    protected static readonly string[] Headers = ["Date", "Type", "Category", "Description", "Amount"];

    protected abstract string Extension { get; }

    protected abstract string ContentType { get; }

    public async Task<ExportFile> ExportMonthAsync(int year, int month, CancellationToken cancellationToken = default)
    {
        var items = await transactionService.GetForMonthAsync(year, month, cancellationToken);

        // The service returns newest first by (Date, CreatedAt); reversing keeps the same tie-break.
        var rows = items.Reverse().ToList();
        var firstOfMonth = new DateOnly(year, month, 1);

        var fileName = $"fainances-transactions-{firstOfMonth.ToString("yyyy-MM", CultureInfo.InvariantCulture)}.{Extension}";
        return new ExportFile(fileName, ContentType, Write(rows, firstOfMonth));
    }

    protected abstract byte[] Write(IReadOnlyList<TransactionListItem> rows, DateOnly month);

    protected static string TypeName(TransactionType type) =>
        type == TransactionType.Income ? "Income" : "Expense";

    /// <summary>
    /// Income is positive and expense negative, so the column sums to the month's balance.
    /// </summary>
    protected static decimal SignedAmount(TransactionListItem item) =>
        item.Type == TransactionType.Income ? item.Amount : -item.Amount;
}
