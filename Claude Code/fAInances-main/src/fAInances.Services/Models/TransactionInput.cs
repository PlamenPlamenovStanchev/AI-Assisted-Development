using fAInances.Services.Entities;

namespace fAInances.Services.Models;

public class TransactionInput
{
    public TransactionType Type { get; set; }

    public decimal Amount { get; set; }

    public DateOnly Date { get; set; }

    public string CategoryId { get; set; } = string.Empty;

    public string? Description { get; set; }
}
