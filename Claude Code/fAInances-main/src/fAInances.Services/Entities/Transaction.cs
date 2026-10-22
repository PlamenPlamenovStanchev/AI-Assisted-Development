using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace fAInances.Services.Entities;

public class Transaction
{
    public const int DescriptionMaxLength = 200;
    public const decimal MaxAmount = 1_000_000_000m;

    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonRepresentation(BsonType.String)]
    public TransactionType Type { get; set; }

    /// <summary>
    /// Always positive; <see cref="Type"/> determines whether money comes in or goes out.
    /// </summary>
    [BsonRepresentation(BsonType.Decimal128)]
    public decimal Amount { get; set; }

    public DateOnly Date { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string CategoryId { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
