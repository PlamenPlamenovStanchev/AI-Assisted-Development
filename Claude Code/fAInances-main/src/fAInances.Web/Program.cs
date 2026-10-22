using System.Globalization;
using fAInances.Services;
using fAInances.Services.Exceptions;
using fAInances.Services.Export;
using fAInances.Web.Components;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddFAInancesServices(builder.Configuration);

builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}
app.UseStatusCodePagesWithReExecute("/not-found", createScopeForStatusCodePages: true);
app.UseHttpsRedirection();

app.UseAntiforgery();

app.MapStaticAssets();

// Plain GET download so the page can use <a download> links instead of streaming over the circuit.
app.MapGet("/transactions/export", async (string? month, string? format, IServiceProvider services, CancellationToken cancellationToken) =>
{
    if (month is null
        || !DateOnly.TryParseExact($"{month}-01", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var firstOfMonth))
    {
        return Results.BadRequest("Please choose a valid month (yyyy-MM).");
    }

    // The key comes from the URL, so [FromKeyedServices] can't be used here.
    var exporter = format is null ? null : services.GetKeyedService<ITransactionExportService>(format.ToLowerInvariant());
    if (exporter is null)
    {
        return Results.BadRequest("Please choose a supported export format.");
    }

    try
    {
        var file = await exporter.ExportMonthAsync(firstOfMonth.Year, firstOfMonth.Month, cancellationToken);
        return Results.File(file.Content, file.ContentType, file.FileName);
    }
    catch (ServiceValidationException ex)
    {
        return Results.BadRequest(ex.Message);
    }
});

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
