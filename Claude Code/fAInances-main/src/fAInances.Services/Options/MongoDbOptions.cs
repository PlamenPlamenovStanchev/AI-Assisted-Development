using System.ComponentModel.DataAnnotations;

namespace fAInances.Services.Options;

public class MongoDbOptions
{
    public const string SectionName = "MongoDb";

    [Required]
    public string ConnectionString { get; set; } = string.Empty;

    [Required]
    public string DatabaseName { get; set; } = string.Empty;
}
