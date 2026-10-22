namespace fAInances.Services.Tests.Infrastructure;

[CollectionDefinition(Name)]
public sealed class MongoDbCollection : ICollectionFixture<MongoDbFixture>
{
    public const string Name = "MongoDb";
}
