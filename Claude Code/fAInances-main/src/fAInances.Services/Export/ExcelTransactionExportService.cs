using System.Globalization;
using ClosedXML.Excel;
using fAInances.Services.Models;
using fAInances.Services.Transactions;

namespace fAInances.Services.Export;

internal sealed class ExcelTransactionExportService(ITransactionService transactionService)
    : TransactionExportService(transactionService)
{
    protected override string Extension => ExportFormats.Excel;

    protected override string ContentType => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    protected override byte[] Write(IReadOnlyList<TransactionListItem> rows, DateOnly month)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add(month.ToString("yyyy-MM", CultureInfo.InvariantCulture));

        for (var column = 0; column < Headers.Length; column++)
        {
            sheet.Cell(1, column + 1).Value = Headers[column];
        }

        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var line = i + 2;
            sheet.Cell(line, 1).Value = row.Date.ToDateTime(TimeOnly.MinValue);
            sheet.Cell(line, 2).Value = TypeName(row.Type);
            sheet.Cell(line, 3).Value = row.CategoryName;
            sheet.Cell(line, 4).Value = row.Description ?? string.Empty;
            sheet.Cell(line, 5).Value = SignedAmount(row);
        }

        sheet.Row(1).Style.Font.Bold = true;
        sheet.Column(1).Style.DateFormat.Format = "yyyy-mm-dd";
        sheet.Column(5).Style.NumberFormat.Format = "#,##0.00";

        sheet.SheetView.FreezeRows(1);
        sheet.Range(1, 1, rows.Count + 1, Headers.Length).SetAutoFilter();
        sheet.Columns(1, Headers.Length).AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }
}
