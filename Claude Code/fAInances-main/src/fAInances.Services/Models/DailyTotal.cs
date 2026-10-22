namespace fAInances.Services.Models;

public class DailyTotal
{
    public DateOnly Date { get; set; }

    public decimal Income { get; set; }

    public decimal Expenses { get; set; }

    /// <summary>
    /// Income minus expenses from the first day of the month up to and including <see cref="Date"/>.
    /// </summary>
    public decimal RunningBalance { get; set; }
}
