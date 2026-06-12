using TaskDrop.Api.Data;
using TaskDrop.Api.Models;
using TaskDrop.Api.Services;

namespace TaskDrop.Api.Middleware;

public class SubscriptionGateMiddleware
{
    private static readonly HashSet<string> ExemptPrefixes = new(StringComparer.OrdinalIgnoreCase)
    {
        "/api/auth",
        "/api/webhooks",
        "/api/releases",
        "/hubs",
        "/swagger",
        "/health"
    };

    private readonly RequestDelegate _next;

    public SubscriptionGateMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        var path = context.Request.Path.Value ?? "";

        if (ExemptPrefixes.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
        {
            await _next(context);
            return;
        }

        if (context.User.Identity?.IsAuthenticated != true)
        {
            await _next(context);
            return;
        }

        var orgIdClaim = context.User.FindFirst("org_id")?.Value;
        if (orgIdClaim == null || !Guid.TryParse(orgIdClaim, out var orgId))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { error = "Invalid organization" });
            return;
        }

        var org = await db.Organizations.FindAsync(orgId);
        if (org == null || !StripeService.IsSubscriptionActive(org))
        {
            context.Response.StatusCode = StatusCodes.Status402PaymentRequired;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "Subscription inactive",
                status = org?.SubscriptionStatus.ToString() ?? "Unknown"
            });
            return;
        }

        await _next(context);
    }
}
