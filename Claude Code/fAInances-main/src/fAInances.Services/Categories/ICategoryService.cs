using fAInances.Services.Entities;
using fAInances.Services.Models;

namespace fAInances.Services.Categories;

public interface ICategoryService
{
    Task<IReadOnlyList<Category>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<Category?> GetByIdAsync(string id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Category>> GetByIdsAsync(IEnumerable<string> ids, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a category. If one with the same name (ignoring case) already exists, that category is returned instead.
    /// </summary>
    Task<Category> CreateAsync(CategoryInput input, CancellationToken cancellationToken = default);
}
