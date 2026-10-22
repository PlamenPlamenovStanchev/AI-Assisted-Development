using fAInances.Services.Categories;
using fAInances.Services.Entities;
using fAInances.Services.Exceptions;
using fAInances.Services.Models;
using MongoDB.Bson;
using MongoDB.Driver;

namespace fAInances.Services.Transactions;

internal sealed class TransactionService(
    IMongoCollection<Transaction> transactions,
    ICategoryService categoryService,
    TimeProvider timeProvider) : ITransactionService
{
    private const string UnknownCategoryName = "Unknown";

    public async Task<IReadOnlyList<TransactionListItem>> GetForMonthAsync(int year, int month, CancellationToken cancellationToken = default)
    {
        if (month is < 1 or > 12 || year is < 1 or > 9998)
        {
            throw new ServiceValidationException("Please choose a valid month.");
        }

        var from = new DateOnly(year, month, 1);
        var to = from.AddMonths(1);

        var filter = Builders<Transaction>.Filter.Gte(t => t.Date, from)
            & Builders<Transaction>.Filter.Lt(t => t.Date, to);

        var items = await transactions
            .Find(filter)
            .Sort(Builders<Transaction>.Sort.Descending(t => t.Date).Descending(t => t.CreatedAt))
            .ToListAsync(cancellationToken);

        var categories = await categoryService.GetByIdsAsync(items.Select(t => t.CategoryId), cancellationToken);
        var categoryNames = categories.ToDictionary(c => c.Id, c => c.Name);

        return items
            .Select(t => new TransactionListItem
            {
                Id = t.Id,
                Type = t.Type,
                Amount = t.Amount,
                Date = t.Date,
                CategoryId = t.CategoryId,
                CategoryName = categoryNames.GetValueOrDefault(t.CategoryId, UnknownCategoryName),
                Description = t.Description,
            })
            .ToList();
    }

    public async Task<MonthlySummary> GetMonthlySummaryAsync(int year, int month, CancellationToken cancellationToken = default)
    {
        var items = await GetForMonthAsync(year, month, cancellationToken);

        var incomes = items.Where(i => i.Type == TransactionType.Income).ToList();
        var expenses = items.Where(i => i.Type == TransactionType.Expense).ToList();

        var first = new DateOnly(year, month, 1);
        var days = new List<DailyTotal>(DateTime.DaysInMonth(year, month));
        var runningBalance = 0m;
        for (var date = first; date < first.AddMonths(1); date = date.AddDays(1))
        {
            var income = incomes.Where(i => i.Date == date).Sum(i => i.Amount);
            var expense = expenses.Where(i => i.Date == date).Sum(i => i.Amount);
            runningBalance += income - expense;
            days.Add(new DailyTotal { Date = date, Income = income, Expenses = expense, RunningBalance = runningBalance });
        }

        return new MonthlySummary
        {
            Transactions = items,
            TotalIncome = incomes.Sum(i => i.Amount),
            TotalExpenses = expenses.Sum(i => i.Amount),
            IncomeByCategory = TotalsByCategory(incomes),
            ExpensesByCategory = TotalsByCategory(expenses),
            Days = days,
        };
    }

    public async Task<Transaction?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            return null;
        }

        return await transactions.Find(t => t.Id == id).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<Transaction> CreateAsync(TransactionInput input, CancellationToken cancellationToken = default)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var transaction = new Transaction { CreatedAt = now, UpdatedAt = now };

        await ApplyInputAsync(transaction, input, cancellationToken);
        await transactions.InsertOneAsync(transaction, cancellationToken: cancellationToken);

        return transaction;
    }

    public async Task<Transaction> UpdateAsync(string id, TransactionInput input, CancellationToken cancellationToken = default)
    {
        var transaction = await GetByIdAsync(id, cancellationToken) ?? throw TransactionNotFound();

        await ApplyInputAsync(transaction, input, cancellationToken);
        transaction.UpdatedAt = timeProvider.GetUtcNow().UtcDateTime;

        var result = await transactions.ReplaceOneAsync(t => t.Id == id, transaction, cancellationToken: cancellationToken);
        if (result.MatchedCount == 0)
        {
            throw TransactionNotFound();
        }

        return transaction;
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            throw TransactionNotFound();
        }

        var result = await transactions.DeleteOneAsync(t => t.Id == id, cancellationToken);
        if (result.DeletedCount == 0)
        {
            throw TransactionNotFound();
        }
    }

    private async Task ApplyInputAsync(Transaction transaction, TransactionInput input, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(input);

        if (!Enum.IsDefined(input.Type))
        {
            throw new ServiceValidationException("Please choose whether this is an income or an expense.");
        }

        var amount = Math.Round(input.Amount, 2, MidpointRounding.AwayFromZero);
        if (amount <= 0)
        {
            throw new ServiceValidationException("Amount must be greater than zero.");
        }

        if (amount > Transaction.MaxAmount)
        {
            throw new ServiceValidationException($"Amount must not exceed {Transaction.MaxAmount:N0}.");
        }

        if (input.Date == default)
        {
            throw new ServiceValidationException("Date is required.");
        }

        var latestAllowedDate = DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime).AddYears(1);
        if (input.Date > latestAllowedDate)
        {
            throw new ServiceValidationException("Date cannot be more than a year in the future.");
        }

        var description = string.IsNullOrWhiteSpace(input.Description) ? null : input.Description.Trim();
        if (description?.Length > Transaction.DescriptionMaxLength)
        {
            throw new ServiceValidationException($"Description must be at most {Transaction.DescriptionMaxLength} characters.");
        }

        if (string.IsNullOrWhiteSpace(input.CategoryId))
        {
            throw new ServiceValidationException("Please choose a category.");
        }

        var category = await categoryService.GetByIdAsync(input.CategoryId, cancellationToken)
            ?? throw new ServiceValidationException("The selected category no longer exists. Please choose another one.");

        transaction.Type = input.Type;
        transaction.Amount = amount;
        transaction.Date = input.Date;
        transaction.CategoryId = category.Id;
        transaction.Description = description;
    }

    private static List<CategoryTotal> TotalsByCategory(IEnumerable<TransactionListItem> items) =>
        items
            .GroupBy(i => i.CategoryId)
            .Select(g => new CategoryTotal
            {
                CategoryId = g.Key,
                CategoryName = g.First().CategoryName,
                Amount = g.Sum(i => i.Amount),
            })
            .OrderByDescending(c => c.Amount)
            .ThenBy(c => c.CategoryName, StringComparer.OrdinalIgnoreCase)
            .ToList();

    private static NotFoundException TransactionNotFound() => new("The transaction could not be found.");
}
