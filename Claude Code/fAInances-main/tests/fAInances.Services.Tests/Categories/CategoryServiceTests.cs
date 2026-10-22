using fAInances.Services.Categories;
using fAInances.Services.Entities;
using fAInances.Services.Exceptions;
using fAInances.Services.Infrastructure;
using fAInances.Services.Models;
using fAInances.Services.Tests.Infrastructure;
using Microsoft.Extensions.Time.Testing;
using MongoDB.Bson;
using MongoDB.Driver;

namespace fAInances.Services.Tests.Categories;

[Collection(MongoDbCollection.Name)]
public sealed class CategoryServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 3, 15, 10, 30, 0, TimeSpan.Zero);

    private readonly CancellationToken cancellationToken = TestContext.Current.CancellationToken;
    private readonly FakeTimeProvider timeProvider = new(Now);
    private readonly IMongoCollection<Category> categories;
    private readonly CategoryService service;

    public CategoryServiceTests(MongoDbFixture mongo)
    {
        categories = mongo.CreateDatabase().GetCollection<Category>(CollectionNames.Categories);
        service = new CategoryService(categories, timeProvider);
    }

    [Fact]
    public async Task CreateAsync_PersistsTrimmedCategory()
    {
        var created = await service.CreateAsync(new CategoryInput { Name = "  Groceries ", Description = "  Food  " }, cancellationToken);

        Assert.True(ObjectId.TryParse(created.Id, out _));
        Assert.Equal("Groceries", created.Name);
        Assert.Equal("GROCERIES", created.NormalizedName);
        Assert.Equal("Food", created.Description);
        Assert.Equal(Now.UtcDateTime, created.CreatedAt);

        var stored = await categories.Find(c => c.Id == created.Id).SingleAsync(cancellationToken);
        Assert.Equal("Groceries", stored.Name);
        Assert.Equal("GROCERIES", stored.NormalizedName);
        Assert.Equal("Food", stored.Description);
        Assert.Equal(Now.UtcDateTime, stored.CreatedAt);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateAsync_StoresBlankDescriptionAsNull(string? description)
    {
        var created = await service.CreateAsync(new CategoryInput { Name = "Rent", Description = description }, cancellationToken);

        Assert.Null(created.Description);
    }

    [Fact]
    public async Task CreateAsync_ReturnsExistingCategory_WhenNameDiffersOnlyByCase()
    {
        var first = await service.CreateAsync(new CategoryInput { Name = "Transport" }, cancellationToken);

        var second = await service.CreateAsync(new CategoryInput { Name = " TRANSPORT ", Description = "Ignored" }, cancellationToken);

        Assert.Equal(first.Id, second.Id);
        Assert.Equal("Transport", second.Name);
        Assert.Null(second.Description);
        Assert.Equal(1L, await categories.CountDocumentsAsync(FilterDefinition<Category>.Empty, cancellationToken: cancellationToken));
    }

    [Theory]
    [MemberData(nameof(InvalidInputs))]
    public async Task CreateAsync_RejectsInvalidInput(string name, string? description)
    {
        await Assert.ThrowsAsync<ServiceValidationException>(
            () => service.CreateAsync(new CategoryInput { Name = name, Description = description }, cancellationToken));

        Assert.Equal(0L, await categories.CountDocumentsAsync(FilterDefinition<Category>.Empty, cancellationToken: cancellationToken));
    }

    public static TheoryData<string, string?> InvalidInputs() => new()
    {
        { "", null },
        { "   ", null },
        { new string('a', Category.NameMaxLength + 1), null },
        { "Health", new string('a', Category.DescriptionMaxLength + 1) },
    };

    [Fact]
    public async Task CreateAsync_AcceptsValuesAtMaxLength()
    {
        var name = new string('a', Category.NameMaxLength);
        var description = new string('b', Category.DescriptionMaxLength);

        var created = await service.CreateAsync(new CategoryInput { Name = name, Description = description }, cancellationToken);

        Assert.Equal(name, created.Name);
        Assert.Equal(description, created.Description);
    }

    [Fact]
    public async Task CreateAsync_ThrowsArgumentNullException_WhenInputIsNull()
    {
        await Assert.ThrowsAsync<ArgumentNullException>(() => service.CreateAsync(null!, cancellationToken));
    }

    [Fact]
    public async Task GetAllAsync_ReturnsEmptyList_WhenThereAreNoCategories()
    {
        var all = await service.GetAllAsync(cancellationToken);

        Assert.Empty(all);
    }

    [Fact]
    public async Task GetAllAsync_ReturnsCategoriesSortedByName()
    {
        await service.CreateAsync(new CategoryInput { Name = "Utilities" }, cancellationToken);
        await service.CreateAsync(new CategoryInput { Name = "Entertainment" }, cancellationToken);
        await service.CreateAsync(new CategoryInput { Name = "Salary" }, cancellationToken);

        var all = await service.GetAllAsync(cancellationToken);

        Assert.Equal(new[] { "Entertainment", "Salary", "Utilities" }, all.Select(c => c.Name));
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsCategory_WhenItExists()
    {
        var created = await service.CreateAsync(new CategoryInput { Name = "Health", Description = "Doctor visits" }, cancellationToken);

        var found = await service.GetByIdAsync(created.Id, cancellationToken);

        Assert.NotNull(found);
        Assert.Equal(created.Id, found.Id);
        Assert.Equal("Health", found.Name);
        Assert.Equal("Doctor visits", found.Description);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-an-object-id")]
    [InlineData("507f1f77bcf86cd799439011")]
    public async Task GetByIdAsync_ReturnsNull_WhenIdIsInvalidOrUnknown(string id)
    {
        await service.CreateAsync(new CategoryInput { Name = "Health" }, cancellationToken);

        var found = await service.GetByIdAsync(id, cancellationToken);

        Assert.Null(found);
    }

    [Fact]
    public async Task GetByIdsAsync_ReturnsOnlyRequestedCategories_AndIgnoresInvalidIds()
    {
        var rent = await service.CreateAsync(new CategoryInput { Name = "Rent" }, cancellationToken);
        var salary = await service.CreateAsync(new CategoryInput { Name = "Salary" }, cancellationToken);
        await service.CreateAsync(new CategoryInput { Name = "Other" }, cancellationToken);

        var found = await service.GetByIdsAsync(
            [rent.Id, salary.Id, rent.Id, "not-an-object-id", ObjectId.GenerateNewId().ToString()],
            cancellationToken);

        Assert.Equal(
            new[] { rent.Id, salary.Id }.Order(StringComparer.Ordinal),
            found.Select(c => c.Id).Order(StringComparer.Ordinal));
    }

    [Fact]
    public async Task GetByIdsAsync_ReturnsEmptyList_WhenNoIdIsValid()
    {
        await service.CreateAsync(new CategoryInput { Name = "Rent" }, cancellationToken);

        var found = await service.GetByIdsAsync(["", "not-an-object-id"], cancellationToken);

        Assert.Empty(found);
    }
}
