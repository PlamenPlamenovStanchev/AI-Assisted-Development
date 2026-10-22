using System.Globalization;
using fAInances.Services.Entities;
using fAInances.Services.Models;
using fAInances.Services.Transactions;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace fAInances.Services.Export;

internal sealed class PdfTransactionExportService(ITransactionService transactionService, TimeProvider timeProvider)
    : TransactionExportService(transactionService)
{
    static PdfTransactionExportService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    protected override string Extension => ExportFormats.Pdf;

    protected override string ContentType => "application/pdf";

    protected override byte[] Write(IReadOnlyList<TransactionListItem> rows, DateOnly month)
    {
        var title = $"Transactions · {month.ToString("MMMM yyyy", CultureInfo.InvariantCulture)}";
        var generatedAt = timeProvider.GetLocalNow().ToString("dd MMM yyyy, HH:mm", CultureInfo.InvariantCulture);

        return Document.Create(document => document.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(1.5f, Unit.Centimetre);
            page.DefaultTextStyle(text => text.FontSize(9));

            page.Header().PaddingBottom(12).Column(header =>
            {
                header.Item().Text(title).FontSize(16).SemiBold();
                header.Item().Text($"Generated {generatedAt}").FontColor(Colors.Grey.Darken1);
            });

            page.Content().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.ConstantColumn(62);
                    columns.ConstantColumn(52);
                    columns.RelativeColumn(2);
                    columns.RelativeColumn(4);
                    columns.ConstantColumn(72);
                });

                table.Header(header =>
                {
                    foreach (var name in Headers)
                    {
                        var cell = header.Cell().BorderBottom(1).BorderColor(Colors.Grey.Darken1).PaddingVertical(4).PaddingRight(6);
                        (name == "Amount" ? cell.AlignRight() : cell).Text(name).SemiBold();
                    }
                });

                foreach (var row in rows)
                {
                    table.Cell().Element(BodyCell).Text(row.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
                    table.Cell().Element(BodyCell).Text(TypeName(row.Type));
                    table.Cell().Element(BodyCell).Text(row.CategoryName);
                    table.Cell().Element(BodyCell).Text(row.Description ?? string.Empty);
                    table.Cell().Element(BodyCell).AlignRight()
                        .Text(SignedAmount(row).ToString("#,##0.00", CultureInfo.InvariantCulture))
                        .FontColor(row.Type == TransactionType.Income ? Colors.Green.Darken2 : Colors.Red.Darken2);
                }
            });

            page.Footer().AlignCenter().Text(text =>
            {
                text.DefaultTextStyle(style => style.FontColor(Colors.Grey.Darken1));
                text.Span("Page ");
                text.CurrentPageNumber();
                text.Span(" of ");
                text.TotalPages();
            });
        })).GeneratePdf();
    }

    private static IContainer BodyCell(IContainer cell) =>
        cell.BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).PaddingVertical(4).PaddingRight(6);
}
