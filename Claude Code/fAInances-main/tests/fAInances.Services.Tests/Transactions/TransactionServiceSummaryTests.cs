using fAInances.Services.Categories;
using fAInances.Services.Entities;
using fAInances.Services.Exceptions;
using fAInances.Services.Infrastructure;
using fAInances.Services.Models;
using fAInances.Services.Tests.Infrastructure;
using fAInances.Services.Transactions;
using Microsoft.Extensions.Time.Testing;
using MongoDB.Driver;

namespace fAInances.Services.Tests.Transactions;

[Collection(MongoDbCollection.Name)]
public sealed class TransactionServiceSummaryTests
{
    private static readonly DateTimeOffset Now = new(2026, 3, 15, 10, 30, 0, TimeSpan.Zero);

    private readonly CancellationToken cancellationToken = TestContext.Current.CancellationToken;
    private readonly FakeTimeProvider timeProvider = new(Now);
    private readonly CategoryService categoryService;
    private readonly TransactionService service;

    public TransactionServiceSummaryTests(MongoDbFixture mongo)
    {
        var database = mongo.CreateDatabase();
        categoryService = new CategoryService(database.GetCollection<Category>(CollectionNames.Categories), timeProvider);
        service = new TransactionService(database.GetCollection<Transaction>(CollectionNames.Transactions), categoryService, timeProvider);
    }

    [Theory]
    [InlineData(2026, 1, 31)]
    [InlineData(2026, 2, 28)]
    [InlineData(2026, 4, 30)]
    [InlineData(2024, 2, 29)]
    public async Task GetMonthlySummaryAsync_ReturnsEveryDayOfTheMonth(int year, int month, int expectedDays)
    {
        var category = await CreateCategoryAsync("Groceries");
        await service.CreateAsync(Input(category.Id, date: new DateOnly(year, month, 1)), cancellationToken);

        var summary = await service.GetMonthlySummaryAsync(year, month, cancellationToken);

        Assert.Equal(expectedDays, summary.Days.Count);
        Assert.Equal(new DateOnly(year, month, 1), summary.Days[0].Date);
        Assert.Equal(new DateOnly(year, month, expectedDays), summary.Days[^1].Date);
        Assert.Equal(
            Enumerable.Range(1, expectedDays).Select(d => new DateOnly(year, month, d)),
            summary.Days.Select(d => d.Date));
    }

    [Fact]
    public async Task GetMonthlySummaryAsync_GroupsAndSortsCategoriesPerType()
    {
        var salary = await CreateCategoryAsync("Salary");
        var freelance = await CreateCategoryAsync("Freelance");
        var rent = await CreateCategoryAsync("Rent");
        var groceries = await CreateCategoryAsync("Groceries");
        var transport = await CreateCategoryAsync("Transport");

        await service.CreateAsync(Input(salary.Id, TransactionType.Income, 3000m, new DateOnly(2026, 3, 1)), cancellationToken);
        await service.CreateAsync(Input(freelance.Id, TransactionType.Income, 200m, new DateOnly(2026, 3, 5)), cancellationToken);
        await service.CreateAsync(Input(freelance.Id, TransactionType.Income, 300m, new DateOnly(2026, 3, 20)), cancellationToken);
        await service.CreateAsync(Input(rent.Id, amount: 1200m, date: new DateOnly(2026, 3, 1)), cancellationToken);
        await service.CreateAsync(Input(groceries.Id, amount: 40m, date: new DateOnly(2026, 3, 3)), cancellationToken);
        await service.CreateAsync(Input(groceries.Id, amount: 60.5m, date: new DateOnly(2026, 3, 10)), cancellationToken);
        await service.CreateAsync(Input(transport.Id, amount: 100.5m, date: new DateOnly(2026, 3, 12)), cancellationToken);

        var summary = await service.GetMonthlySummaryAsync(2026, 3, cancellationToken);

        Assert.Collection(
            summary.IncomeByCategory,
            c => AssertCategoryTotal(c, salary, 3000m),
            c => AssertCategoryTotal(c, freelance, 500m));

        // Groceries and Transport tie on amount, so they are ordered by name.
        Assert.Collection(
            summary.ExpensesByCategory,
            c => AssertCategoryTotal(c, rent, 1200m),
            c => AssertCategoryTotal(c, groceries, 100.5m),
            c => AssertCategoryTotal(c, transport, 100.5m));

        Assert.Equal(3500m, summary.TotalIncome);
        Assert.Equal(1401m, summary.TotalExpenses);
    }

    [Fact]
    public async Task GetMonthlySummaryAsync_ComputesDailyTotalsAndRunningBalance()
    {
        var salary = await CreateCategoryAsync("Salary");
        var rent = await CreateCategoryAsync("Rent");
        var groceries = await CreateCategoryAsync("Groceries");

        await service.CreateAsync(Input(rent.Id, amount: 1200m, date: new DateOnly(2026, 3, 2)), cancellationToken);
        await service.CreateAsync(Input(groceries.Id, amount: 30m, date: new DateOnly(2026, 3, 2)), cancellationToken);
        await service.CreateAsync(Input(salary.Id, TransactionType.Income, 2000m, new DateOnly(2026, 3, 5)), cancellationToken);
        await service.CreateAsync(Input(groceries.Id, amount: 70m, date: new DateOnly(2026, 3, 5)), cancellationToken);

        var summary = await service.GetMonthlySummaryAsync(2026, 3, cancellationToken);

        AssertDay(summary.Days[0], income: 0m, expenses: 0m, balance: 0m);
        AssertDay(summary.Days[1], income: 0m, expenses: 1230m, balance: -1230m);
        AssertDay(summary.Days[2], income: 0m, expenses: 0m, balance: -1230m);
        AssertDay(summary.Days[3], income: 0m, expenses: 0m, balance: -1230m);
        AssertDay(summary.Days[4], income: 2000m, expenses: 70m, balance: 700m);
        Assert.All(summary.Days.Skip(5), d => AssertDay(d, income: 0m, expenses: 0m, balance: 700m));
        Assert.Equal(summary.TotalIncome - summary.TotalExpenses, summary.Days[^1].RunningBalance);
    }

    [Fact]
    public async Task GetMonthlySummaryAsync_IgnoresTransactionsOfOtherMonths()
    {
        var groceries = await CreateCategoryAsync("Groceries");
        var salary = await CreateCategoryAsync("Salary");

        await service.CreateAsync(Input(groceries.Id, amount: 10m, date: new DateOnly(2026, 2, 28)), cancellationToken);
        await service.CreateAsync(Input(salary.Id, TransactionType.Income, 99m, new DateOnly(2026, 4, 1)), cancellationToken);
        var inMonth = await service.CreateAsync(Input(groceries.Id, amount: 25m, date: new DateOnly(2026, 3, 31)), cancellationToken);

        var summary = await service.GetMonthlySummaryAsync(2026, 3, cancellationToken);

        Assert.Equal(inMonth.Id, Assert.Single(summary.Transactions).Id);
        Assert.Equal(0m, summary.TotalIncome);
        Assert.Equal(25m, summary.TotalExpenses);
        Assert.Empty(summary.IncomeByCategory);
        AssertCategoryTotal(Assert.Single(summary.ExpensesByCategory), groceries, 25m);
        Assert.Equal(-25m, summary.Days[^1].RunningBalance);
        Assert.All(summary.Days.SkipLast(1), d => AssertDay(d, income: 0m, expenses: 0m, balance: 0m));
    }

    [Fact]
    public async Task GetMonthlySummaryAsync_ReturnsTransactionsNewestFirst()
    {
        var groceries = await CreateCategoryAsync("Groceries");
        var older = await service.CreateAsync(Input(groceries.Id, date: new DateOnly(2026, 3, 3)), cancellationToken);
        var newer = await service.CreateAsync(Input(groceries.Id, date: new DateOnly(2026, 3, 20)), cancellationToken);

        var summary = await service.GetMonthlySummaryAsync(2026, 3, cancellationToken);

        Assert.Equal([newer.Id, older.Id], summary.Transactions.Select(t => t.Id));
    }

    [Fact]
    public async Task GetMonthlySummaryAsync_ReturnsEmptySummary_WhenMonthHasNoTransactions()
    {
        var category = await CreateCategoryAsync("Groceries");
        await service.CreateAsync(Input(category.Id, date: new DateOnly(2026, 3, 10)), cancellationToken);

        var summary = await service.GetMonthlySummaryAsync(2026, 2, cancellationToken);

        Assert.Empty(summary.Transactions);
        Assert.Equal(0m, summary.TotalIncome);
        Assert.Equal(0m, summary.TotalExpenses);
        Assert.Empty(summary.IncomeByCategory);
        Assert.Empty(summary.ExpensesByCategory);
        Assert.Equal(28, summary.Days.Count);
        Assert.All(summary.Days, d => AssertDay(d, income: 0m, expenses: 0m, balance: 0m));
    }

    [Theory]
    [InlineData(2026, 0)]
    [InlineData(2026, 13)]
    [InlineData(0, 6)]
    [InlineData(9999, 6)]
    public async Task GetMonthlySummaryAsync_RejectsInvalidMonth(int year, int month)
    {
        await Assert.ThrowsAsync<ServiceValidationException>(() => service.GetMonthlySummaryAsync(year, month, cancellationToken));
    }

    private static void AssertCategoryTotal(CategoryTotal actual, Category expected, decimal amount)
    {
        Assert.Equal(expected.Id, actual.CategoryId);
        Assert.Equal(expected.Name, actual.CategoryName);
        Assert.Equal(amount, actual.Amount);
    }

    private static void AssertDay(DailyTotal day, decimal income, decimal expenses, decimal balance)
    {
        Assert.Equal(income, day.Income);
        Assert.Equal(expenses, day.Expenses);
        Assert.Equal(balance, day.RunningBalance);
    }

    private Task<Category> CreateCategoryAsync(string name) =>
        categoryService.CreateAsync(new CategoryInput { Name = name }, cancellationToken);

    private static TransactionInput Input(
        string categoryId,
        TransactionType type = TransactionType.Expense,
        decimal amount = 25m,
        DateOnly? date = null) => new()
        {
            Type = type,
            Amount = amount,
            Date = date ?? new DateOnly(2026, 3, 10),
            CategoryId = categoryId,
        };
}
