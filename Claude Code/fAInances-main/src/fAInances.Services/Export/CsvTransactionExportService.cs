using System.Globalization;
using System.Text;
using fAInances.Services.Models;
using fAInances.Services.Transactions;

namespace fAInances.Services.Export;

/// <summary>
/// Writes RFC 4180 CSV in UTF-8 with a BOM, so Excel shows non-ASCII text correctly.
/// </summary>
internal sealed class CsvTransactionExportService(ITransactionService transactionService)
    : TransactionExportService(transactionService)
{
    private static readonly char[] CharsNeedingQuotes = [',', '"', '\r', '\n'];

    private static readonly char[] FormulaPrefixes = ['=', '+', '-', '@', '\t', '\r'];

    protected override string Extension => ExportFormats.Csv;

    protected override string ContentType => "text/csv";

    protected override byte[] Write(IReadOnlyList<TransactionListItem> rows, DateOnly month)
    {
        var csv = new StringBuilder();
        AppendLine(csv, Headers);

        foreach (var row in rows)
        {
            AppendLine(csv,
            [
                row.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                TypeName(row.Type),
                ProtectFromFormula(row.CategoryName),
                ProtectFromFormula(row.Description ?? string.Empty),
                SignedAmount(row).ToString("0.00", CultureInfo.InvariantCulture),
            ]);
        }

        var encoding = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true);
        return [.. encoding.GetPreamble(), .. encoding.GetBytes(csv.ToString())];
    }

    private static void AppendLine(StringBuilder csv, IEnumerable<string> fields)
    {
        csv.AppendJoin(',', fields.Select(Escape));
        csv.Append("\r\n");
    }

    private static string Escape(string field) =>
        field.IndexOfAny(CharsNeedingQuotes) >= 0
            ? $"\"{field.Replace("\"", "\"\"")}\""
            : field;

    /// <summary>
    /// Stops spreadsheet apps from running user-entered text as a formula.
    /// </summary>
    private static string ProtectFromFormula(string field) =>
        field.Length > 0 && FormulaPrefixes.Contains(field[0]) ? "'" + field : field;
}
