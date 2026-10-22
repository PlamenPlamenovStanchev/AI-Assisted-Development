namespace fAInances.Services.Models;

public class MonthlySummary
{
    /// <summary>
    /// The month's transactions, newest first.
    /// </summary>
    public IReadOnlyList<TransactionListItem> Transactions { get; set; } = [];

    public decimal TotalIncome { get; set; }

    public decimal TotalExpenses { get; set; }

    /// <summary>
    /// Income per category, largest first.
    /// </summary>
    public IReadOnlyList<CategoryTotal> IncomeByCategory { get; set; } = [];

    /// <summary>
    /// Expenses per category, largest first.
    /// </summary>
    public IReadOnlyList<CategoryTotal> ExpensesByCategory { get; set; } = [];

    /// <summary>
    /// One entry for every calendar day of the month, including days without transactions.
    /// </summary>
    public IReadOnlyList<DailyTotal> Days { get; set; } = [];
}
