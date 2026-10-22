using fAInances.Services.Entities;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace fAInances.Services.Infrastructure;

/// <summary>
/// Creates the indexes the services rely on and seeds a starter set of categories into an empty database.
/// </summary>
internal sealed class MongoInitializer(
    IMongoCollection<Category> categories,
    IMongoCollection<Transaction> transactions,
    TimeProvider timeProvider,
    ILogger<MongoInitializer> logger) : IHostedService
{
    private static readonly (string Name, string Description)[] DefaultCategories =
    [
        ("Salary", "Regular income from your job."),
        ("Groceries", "Food and household supplies."),
        ("Rent", "Rent or mortgage payments."),
        ("Utilities", "Electricity, water, heating, internet and phone."),
        ("Transport", "Fuel, public transport, taxis and parking."),
        ("Entertainment", "Going out, hobbies, streaming and games."),
        ("Health", "Medicine, doctor visits and fitness."),
        ("Other", "Anything that doesn't fit elsewhere."),
    ];

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        await categories.Indexes.CreateOneAsync(
            new CreateIndexModel<Category>(
                Builders<Category>.IndexKeys.Ascending(c => c.NormalizedName),
                new CreateIndexOptions { Unique = true, Name = "ux_normalized_name" }),
            cancellationToken: cancellationToken);

        await transactions.Indexes.CreateOneAsync(
            new CreateIndexModel<Transaction>(
                Builders<Transaction>.IndexKeys.Descending(t => t.Date),
                new CreateIndexOptions { Name = "ix_date" }),
            cancellationToken: cancellationToken);

        if (await categories.EstimatedDocumentCountAsync(cancellationToken: cancellationToken) > 0)
        {
            return;
        }

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var seed = DefaultCategories.Select(c => new Category
        {
            Name = c.Name,
            NormalizedName = Category.Normalize(c.Name),
            Description = c.Description,
            CreatedAt = now,
        });

        await categories.InsertManyAsync(seed, cancellationToken: cancellationToken);
        logger.LogInformation("Seeded {Count} default categories.", DefaultCategories.Length);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
