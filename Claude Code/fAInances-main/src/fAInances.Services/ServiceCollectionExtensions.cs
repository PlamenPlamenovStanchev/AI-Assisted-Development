using fAInances.Services.Categories;
using fAInances.Services.Entities;
using fAInances.Services.Export;
using fAInances.Services.Infrastructure;
using fAInances.Services.Options;
using fAInances.Services.Transactions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace fAInances.Services;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddFAInancesServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<MongoDbOptions>()
            .Bind(configuration.GetSection(MongoDbOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.TryAddSingleton(TimeProvider.System);

        services.AddSingleton<IMongoClient>(sp =>
            new MongoClient(sp.GetRequiredService<IOptions<MongoDbOptions>>().Value.ConnectionString));
        services.AddSingleton(sp =>
            sp.GetRequiredService<IMongoClient>().GetDatabase(sp.GetRequiredService<IOptions<MongoDbOptions>>().Value.DatabaseName));
        services.AddSingleton(sp =>
            sp.GetRequiredService<IMongoDatabase>().GetCollection<Category>(CollectionNames.Categories));
        services.AddSingleton(sp =>
            sp.GetRequiredService<IMongoDatabase>().GetCollection<Transaction>(CollectionNames.Transactions));

        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<ITransactionService, TransactionService>();

        services.AddKeyedScoped<ITransactionExportService, CsvTransactionExportService>(ExportFormats.Csv);
        services.AddKeyedScoped<ITransactionExportService, ExcelTransactionExportService>(ExportFormats.Excel);
        services.AddKeyedScoped<ITransactionExportService, PdfTransactionExportService>(ExportFormats.Pdf);

        services.AddHostedService<MongoInitializer>();

        return services;
    }
}
