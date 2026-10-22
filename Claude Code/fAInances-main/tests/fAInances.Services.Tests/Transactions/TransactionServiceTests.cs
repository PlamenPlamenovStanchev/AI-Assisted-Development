using System.Globalization;
using fAInances.Services.Categories;
using fAInances.Services.Entities;
using fAInances.Services.Exceptions;
using fAInances.Services.Infrastructure;
using fAInances.Services.Models;
using fAInances.Services.Tests.Infrastructure;
using fAInances.Services.Transactions;
using Microsoft.Extensions.Time.Testing;
using MongoDB.Bson;
using MongoDB.Driver;

namespace fAInances.Services.Tests.Transactions;

[Collection(MongoDbCollection.Name)]
public sealed class TransactionServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 3, 15, 10, 30, 0, TimeSpan.Zero);
    private static readonly DateOnly Today = DateOnly.FromDateTime(Now.UtcDateTime);

    private readonly CancellationToken cancellationToken = TestContext.Current.CancellationToken;
    private readonly FakeTimeProvider timeProvider = new(Now);
    private readonly IMongoCollection<Category> categories;
    private readonly IMongoCollection<Transaction> transactions;
    private readonly CategoryService categoryService;
    private readonly TransactionService service;

    public TransactionServiceTests(MongoDbFixture mongo)
    {
        var database = mongo.CreateDatabase();
        categories = database.GetCollection<Category>(CollectionNames.Categories);
        transactions = database.GetCollection<Transaction>(CollectionNames.Transactions);
        categoryService = new CategoryService(categories, timeProvider);
        service = new TransactionService(transactions, categoryService, timeProvider);
    }

    [Fact]
    public async Task CreateAsync_PersistsTransaction()
    {
        var category = await CreateCategoryAsync("Groceries");

        var created = await service.CreateAsync(
            Input(category.Id, amount: 12.345m, date: new DateOnly(2026, 3, 10), description: "  Weekly shop  "),
            cancellationToken);

        Assert.True(ObjectId.TryParse(created.Id, out _));
        Assert.Equal(TransactionType.Expense, created.Type);
        Assert.Equal(12.35m, created.Amount);
        Assert.Equal(new DateOnly(2026, 3, 10), created.Date);
        Assert.Equal(category.Id, created.CategoryId);
        Assert.Equal("Weekly shop", created.Description);
        Assert.Equal(Now.UtcDateTime, created.CreatedAt);
        Assert.Equal(Now.UtcDateTime, created.UpdatedAt);

        var stored = await transactions.Find(t => t.Id == created.Id).SingleAsync(cancellationToken);
        Assert.Equal(TransactionType.Expense, stored.Type);
        Assert.Equal(12.35m, stored.Amount);
        Assert.Equal(new DateOnly(2026, 3, 10), stored.Date);
        Assert.Equal(category.Id, stored.CategoryId);
        Assert.Equal("Weekly shop", stored.Description);
        Assert.Equal(Now.UtcDateTime, stored.CreatedAt);
        Assert.Equal(Now.UtcDateTime, stored.UpdatedAt);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateAsync_StoresBlankDescriptionAsNull(string? description)
    {
        var category = await CreateCategoryAsync("Groceries");

        var created = await service.CreateAsync(Input(category.Id, description: description), cancellationToken);

        Assert.Null(created.Description);
    }

    [Fact]
    public async Task CreateAsync_AcceptsBoundaryValues()
    {
        var category = await CreateCategoryAsync("Salary");
        var description = new string('a', Transaction.DescriptionMaxLength);

        var created = await service.CreateAsync(
            Input(category.Id, TransactionType.Income, Transaction.MaxAmount, Today.AddYears(1), description),
            cancellationToken);

        Assert.Equal(TransactionType.Income, created.Type);
        Assert.Equal(Transaction.MaxAmount, created.Amount);
        Assert.Equal(Today.AddYears(1), created.Date);
        Assert.Equal(description, created.Description);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-10")]
    [InlineData("0.004")]
    [InlineData("1000000000.01")]
    public async Task CreateAsync_RejectsAmountOutOfRange(string amount)
    {
        var category = await CreateCategoryAsync("Groceries");

        await AssertCreateRejectedAsync(Input(category.Id, amount: decimal.Parse(amount, CultureInfo.InvariantCulture)));
    }

    [Fact]
    public async Task CreateAsync_RejectsUndefinedType()
    {
        var category = await CreateCategoryAsync("Groceries");

        await AssertCreateRejectedAsync(Input(category.Id, type: (TransactionType)42));
    }

    [Fact]
    public async Task CreateAsync_RejectsMissingDate()
    {
        var category = await CreateCategoryAsync("Groceries");

        await AssertCreateRejectedAsync(Input(category.Id, date: default(DateOnly)));
    }

    [Fact]
    public async Task CreateAsync_RejectsDateMoreThanAYearInTheFuture()
    {
        var category = await CreateCategoryAsync("Groceries");

        await AssertCreateRejectedAsync(Input(category.Id, date: Today.AddYears(1).AddDays(1)));
    }

    [Fact]
    public async Task CreateAsync_RejectsTooLongDescription()
    {
        var category = await CreateCategoryAsync("Groceries");

        await AssertCreateRejectedAsync(Input(category.Id, description: new string('a', Transaction.DescriptionMaxLength + 1)));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("not-an-object-id")]
    [InlineData("507f1f77bcf86cd799439011")]
    public async Task CreateAsync_RejectsMissingOrUnknownCategory(string categoryId)
    {
        await CreateCategoryAsync("Groceries");

        await AssertCreateRejectedAsync(Input(categoryId));
    }

    [Fact]
    public async Task CreateAsync_ThrowsArgumentNullException_WhenInputIsNull()
    {
        await Assert.ThrowsAsync<ArgumentNullException>(() => service.CreateAsync(null!, cancellationToken));
    }

    [Fact]
    public async Task GetForMonthAsync_ReturnsTransactionsOfTheMonth_NewestFirst_WithCategoryNames()
    {
        var groceries = await CreateCategoryAsync("Groceries");
        var salary = await CreateCategoryAsync("Salary");

        await service.CreateAsync(Input(groceries.Id, date: new DateOnly(2026, 2, 28)), cancellationToken);
        var firstOfMonth = await service.CreateAsync(
            Input(salary.Id, TransactionType.Income, 3000m, new DateOnly(2026, 3, 1), "March salary"),
            cancellationToken);
        var lastOfMonth = await service.CreateAsync(Input(groceries.Id, date: new DateOnly(2026, 3, 31)), cancellationToken);
        var midMonthEarlier = await service.CreateAsync(Input(groceries.Id, date: new DateOnly(2026, 3, 15)), cancellationToken);
        timeProvider.Advance(TimeSpan.FromMinutes(5));
        var midMonthLater = await service.CreateAsync(Input(groceries.Id, date: new DateOnly(2026, 3, 15)), cancellationToken);
        await service.CreateAsync(Input(groceries.Id, date: new DateOnly(2026, 4, 1)), cancellationToken);

        var items = await service.GetForMonthAsync(2026, 3, cancellationToken);

        Assert.Equal(
            new[] { lastOfMonth.Id, midMonthLater.Id, midMonthEarlier.Id, firstOfMonth.Id },
            items.Select(i => i.Id));
        Assert.All(items.Take(3), i => Assert.Equal("Groceries", i.CategoryName));

        var salaryItem = items[^1];
        Assert.Equal(TransactionType.Income, salaryItem.Type);
        Assert.Equal(3000m, salaryItem.Amount);
        Assert.Equal(new DateOnly(2026, 3, 1), salaryItem.Date);
        Assert.Equal(salary.Id, salaryItem.CategoryId);
        Assert.Equal("Salary", salaryItem.CategoryName);
        Assert.Equal("March salary", salaryItem.Description);
    }

    [Fact]
    public async Task GetForMonthAsync_UsesUnknownCategoryName_WhenCategoryNoLongerExists()
    {
        var category = await CreateCategoryAsync("Groceries");
        var created = await service.CreateAsync(Input(category.Id), cancellationToken);
        await categories.DeleteOneAsync(c => c.Id == category.Id, cancellationToken);

        var items = await service.GetForMonthAsync(2026, 3, cancellationToken);

        var item = Assert.Single(items);
        Assert.Equal(created.Id, item.Id);
        Assert.Equal(category.Id, item.CategoryId);
        Assert.Equal("Unknown", item.CategoryName);
    }

    [Fact]
    public async Task GetForMonthAsync_ReturnsEmptyList_WhenMonthHasNoTransactions()
    {
        var category = await CreateCategoryAsync("Groceries");
        await service.CreateAsync(Input(category.Id, date: new DateOnly(2026, 3, 10)), cancellationToken);

        var items = await service.GetForMonthAsync(2026, 2, cancellationToken);

        Assert.Empty(items);
    }

    [Theory]
    [InlineData(2026, 0)]
    [InlineData(2026, 13)]
    [InlineData(0, 1)]
    [InlineData(9999, 1)]
    public async Task GetForMonthAsync_RejectsInvalidMonth(int year, int month)
    {
        await Assert.ThrowsAsync<ServiceValidationException>(() => service.GetForMonthAsync(year, month, cancellationToken));
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsTransaction_WhenItExists()
    {
        var category = await CreateCategoryAsync("Groceries");
        var created = await service.CreateAsync(Input(category.Id, amount: 42m, description: "Market"), cancellationToken);

        var found = await service.GetByIdAsync(created.Id, cancellationToken);

        Assert.NotNull(found);
        Assert.Equal(created.Id, found.Id);
        Assert.Equal(42m, found.Amount);
        Assert.Equal("Market", found.Description);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-an-object-id")]
    [InlineData("507f1f77bcf86cd799439011")]
    public async Task GetByIdAsync_ReturnsNull_WhenIdIsInvalidOrUnknown(string id)
    {
        var category = await CreateCategoryAsync("Groceries");
        await service.CreateAsync(Input(category.Id), cancellationToken);

        var found = await service.GetByIdAsync(id, cancellationToken);

        Assert.Null(found);
    }

    [Fact]
    public async Task UpdateAsync_ReplacesValues_AndKeepsCreationTime()
    {
        var groceries = await CreateCategoryAsync("Groceries");
        var salary = await CreateCategoryAsync("Salary");
        var created = await service.CreateAsync(Input(groceries.Id, description: "Old"), cancellationToken);
        timeProvider.Advance(TimeSpan.FromHours(2));

        var updated = await service.UpdateAsync(
            created.Id,
            Input(salary.Id, TransactionType.Income, 1500.50m, new DateOnly(2026, 3, 1), " Bonus "),
            cancellationToken);

        Assert.Equal(created.Id, updated.Id);

        var stored = await transactions.Find(t => t.Id == created.Id).SingleAsync(cancellationToken);
        Assert.Equal(TransactionType.Income, stored.Type);
        Assert.Equal(1500.50m, stored.Amount);
        Assert.Equal(new DateOnly(2026, 3, 1), stored.Date);
        Assert.Equal(salary.Id, stored.CategoryId);
        Assert.Equal("Bonus", stored.Description);
        Assert.Equal(Now.UtcDateTime, stored.CreatedAt);
        Assert.Equal(Now.AddHours(2).UtcDateTime, stored.UpdatedAt);
    }

    [Fact]
    public async Task UpdateAsync_RejectsInvalidInput_AndLeavesTransactionUnchanged()
    {
        var category = await CreateCategoryAsync("Groceries");
        var created = await service.CreateAsync(Input(category.Id, amount: 10m), cancellationToken);

        await Assert.ThrowsAsync<ServiceValidationException>(
            () => service.UpdateAsync(created.Id, Input(category.Id, amount: 0m), cancellationToken));

        var stored = await transactions.Find(t => t.Id == created.Id).SingleAsync(cancellationToken);
        Assert.Equal(10m, stored.Amount);
    }

    [Theory]
    [InlineData("not-an-object-id")]
    [InlineData("507f1f77bcf86cd799439011")]
    public async Task UpdateAsync_ThrowsNotFound_WhenTransactionDoesNotExist(string id)
    {
        var category = await CreateCategoryAsync("Groceries");

        await Assert.ThrowsAsync<NotFoundException>(() => service.UpdateAsync(id, Input(category.Id), cancellationToken));
    }

    [Fact]
    public async Task DeleteAsync_RemovesOnlyTheGivenTransaction()
    {
        var category = await CreateCategoryAsync("Groceries");
        var toDelete = await service.CreateAsync(Input(category.Id), cancellationToken);
        var toKeep = await service.CreateAsync(Input(category.Id), cancellationToken);

        await service.DeleteAsync(toDelete.Id, cancellationToken);

        var remaining = await transactions.Find(FilterDefinition<Transaction>.Empty).ToListAsync(cancellationToken);
        Assert.Equal(toKeep.Id, Assert.Single(remaining).Id);
    }

    [Fact]
    public async Task DeleteAsync_ThrowsNotFound_WhenTransactionWasAlreadyDeleted()
    {
        var category = await CreateCategoryAsync("Groceries");
        var created = await service.CreateAsync(Input(category.Id), cancellationToken);
        await service.DeleteAsync(created.Id, cancellationToken);

        await Assert.ThrowsAsync<NotFoundException>(() => service.DeleteAsync(created.Id, cancellationToken));
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-an-object-id")]
    [InlineData("507f1f77bcf86cd799439011")]
    public async Task DeleteAsync_ThrowsNotFound_WhenIdIsInvalidOrUnknown(string id)
    {
        await Assert.ThrowsAsync<NotFoundException>(() => service.DeleteAsync(id, cancellationToken));
    }

    private Task<Category> CreateCategoryAsync(string name) =>
        categoryService.CreateAsync(new CategoryInput { Name = name }, cancellationToken);

    private async Task AssertCreateRejectedAsync(TransactionInput input)
    {
        await Assert.ThrowsAsync<ServiceValidationException>(() => service.CreateAsync(input, cancellationToken));

        Assert.Equal(0L, await transactions.CountDocumentsAsync(FilterDefinition<Transaction>.Empty, cancellationToken: cancellationToken));
    }

    private static TransactionInput Input(
        string categoryId,
        TransactionType type = TransactionType.Expense,
        decimal amount = 25m,
        DateOnly? date = null,
        string? description = null) => new()
        {
            Type = type,
            Amount = amount,
            Date = date ?? new DateOnly(2026, 3, 10),
            CategoryId = categoryId,
            Description = description,
        };
}
