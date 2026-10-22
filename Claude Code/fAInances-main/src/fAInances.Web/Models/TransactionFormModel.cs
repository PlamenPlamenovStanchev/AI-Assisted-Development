using System.ComponentModel.DataAnnotations;
using fAInances.Services.Entities;
using fAInances.Services.Models;

namespace fAInances.Web.Models;

/// <summary>
/// Backs the transaction editor form. The service layer re-validates everything, so these attributes are only for instant feedback.
/// </summary>
public class TransactionFormModel
{
    public TransactionType Type { get; set; } = TransactionType.Expense;

    [Required(ErrorMessage = "Please enter an amount.")]
    [Range(0.01, (double)Transaction.MaxAmount, ErrorMessage = "Amount must be between 0.01 and 1,000,000,000.")]
    public decimal? Amount { get; set; }

    [Required(ErrorMessage = "Please pick a date.")]
    public DateOnly? Date { get; set; }

    [Required(ErrorMessage = "Please choose a category.")]
    public string? CategoryId { get; set; }

    [StringLength(Transaction.DescriptionMaxLength, ErrorMessage = "Description must be at most {1} characters.")]
    public string? Description { get; set; }

    public static TransactionFormModel FromTransaction(Transaction transaction) => new()
    {
        Type = transaction.Type,
        Amount = transaction.Amount,
        Date = transaction.Date,
        CategoryId = transaction.CategoryId,
        Description = transaction.Description,
    };

    public TransactionInput ToInput() => new()
    {
        Type = Type,
        Amount = Amount ?? 0,
        Date = Date ?? default,
        CategoryId = CategoryId ?? string.Empty,
        Description = Description,
    };
}
