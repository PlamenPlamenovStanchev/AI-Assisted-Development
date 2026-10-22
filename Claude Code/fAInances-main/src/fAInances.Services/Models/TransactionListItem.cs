using fAInances.Services.Entities;

namespace fAInances.Services.Models;

public class TransactionListItem
{
    public string Id { get; set; } = string.Empty;

    public TransactionType Type { get; set; }

    public decimal Amount { get; set; }

    public DateOnly Date { get; set; }

    public string CategoryId { get; set; } = string.Empty;

    public string CategoryName { get; set; } = string.Empty;

    public string? Description { get; set; }
}
