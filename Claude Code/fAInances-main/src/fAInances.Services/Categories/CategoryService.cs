using fAInances.Services.Entities;
using fAInances.Services.Exceptions;
using fAInances.Services.Models;
using MongoDB.Bson;
using MongoDB.Driver;

namespace fAInances.Services.Categories;

internal sealed class CategoryService(IMongoCollection<Category> categories, TimeProvider timeProvider) : ICategoryService
{
    public async Task<IReadOnlyList<Category>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await categories
            .Find(FilterDefinition<Category>.Empty)
            .SortBy(c => c.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<Category?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            return null;
        }

        return await categories.Find(c => c.Id == id).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Category>> GetByIdsAsync(IEnumerable<string> ids, CancellationToken cancellationToken = default)
    {
        var validIds = ids.Where(id => ObjectId.TryParse(id, out _)).Distinct().ToList();
        if (validIds.Count == 0)
        {
            return [];
        }

        return await categories
            .Find(Builders<Category>.Filter.In(c => c.Id, validIds))
            .ToListAsync(cancellationToken);
    }

    public async Task<Category> CreateAsync(CategoryInput input, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(input);

        var name = input.Name?.Trim() ?? string.Empty;
        var description = string.IsNullOrWhiteSpace(input.Description) ? null : input.Description.Trim();

        if (name.Length == 0)
        {
            throw new ServiceValidationException("Category name is required.");
        }

        if (name.Length > Category.NameMaxLength)
        {
            throw new ServiceValidationException($"Category name must be at most {Category.NameMaxLength} characters.");
        }

        if (description?.Length > Category.DescriptionMaxLength)
        {
            throw new ServiceValidationException($"Category description must be at most {Category.DescriptionMaxLength} characters.");
        }

        var normalizedName = Category.Normalize(name);
        var existing = await FindByNormalizedNameAsync(normalizedName, cancellationToken);
        if (existing is not null)
        {
            return existing;
        }

        var category = new Category
        {
            Name = name,
            NormalizedName = normalizedName,
            Description = description,
            CreatedAt = timeProvider.GetUtcNow().UtcDateTime,
        };

        try
        {
            await categories.InsertOneAsync(category, cancellationToken: cancellationToken);
            return category;
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            // Another request created the same category between our lookup and insert.
            return await FindByNormalizedNameAsync(normalizedName, cancellationToken)
                ?? throw new InvalidOperationException($"Category '{name}' conflicts with an existing category that could not be loaded.", ex);
        }
    }

    private async Task<Category?> FindByNormalizedNameAsync(string normalizedName, CancellationToken cancellationToken)
    {
        return await categories.Find(c => c.NormalizedName == normalizedName).FirstOrDefaultAsync(cancellationToken);
    }
}
