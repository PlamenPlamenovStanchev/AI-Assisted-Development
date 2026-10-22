using EphemeralMongo;
using MongoDB.Driver;

namespace fAInances.Services.Tests.Infrastructure;

/// <summary>
/// Starts a single ephemeral MongoDB server that is shared by every test in the <see cref="MongoDbCollection"/>.
/// The server and its data directory are removed when the collection finishes.
/// </summary>
public sealed class MongoDbFixture : IAsyncLifetime
{
    private IMongoRunner? runner;

    public IMongoClient Client { get; private set; } = null!;

    public async ValueTask InitializeAsync()
    {
        runner = await MongoRunner.RunAsync(new MongoRunnerOptions
        {
            // Matches the server version used by docker-compose.yml.
            Version = MongoVersion.V7,
            AdditionalArguments = ["--quiet"],
        });

        Client = new MongoClient(runner.ConnectionString);
    }

    /// <summary>
    /// Returns a new, empty database so that tests stay isolated from each other.
    /// </summary>
    public IMongoDatabase CreateDatabase() => Client.GetDatabase($"test_{Guid.NewGuid():N}");

    public ValueTask DisposeAsync()
    {
        Client?.Dispose();
        runner?.Dispose();
        return ValueTask.CompletedTask;
    }
}
