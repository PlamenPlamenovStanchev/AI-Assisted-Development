using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace fAInances.Services.Entities;

public class Category
{
    public const int NameMaxLength = 50;
    public const int DescriptionMaxLength = 200;

    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Upper-cased, trimmed name used to keep category names unique regardless of casing.
    /// </summary>
    public string NormalizedName { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; }

    public static string Normalize(string name) => name.Trim().ToUpperInvariant();
}
