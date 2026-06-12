using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;
using TaskDrop.Api.Data;
using TaskDrop.Api.Models;

namespace TaskDrop.Api.Services;

public class StripeSettings
{
    public string SecretKey { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
    public string StarterPriceId { get; set; } = "price_starter";
    public string TeamPriceId { get; set; } = "price_team";
    public string BusinessPriceId { get; set; } = "price_business";
}

public class StripeService
{
    private readonly AppDbContext _db;
    private readonly StripeSettings _settings;
    private readonly AppSettings _app;

    public StripeService(AppDbContext db, IOptions<StripeSettings> settings, IOptions<AppSettings> app)
    {
        _db = db;
        _settings = settings.Value;
        _app = app.Value;
        StripeConfiguration.ApiKey = _settings.SecretKey;
    }

    public string GetPriceId(string planId) => planId.ToLowerInvariant() switch
    {
        "team" => _settings.TeamPriceId,
        "business" => _settings.BusinessPriceId,
        _ => _settings.StarterPriceId
    };

    public int GetSeatLimit(string planId) => planId.ToLowerInvariant() switch
    {
        "team" => 15,
        "business" => 50,
        _ => 5
    };

    public async Task<string> CreateCheckoutSessionAsync(Organization org, string planId, string? customerEmail = null)
    {
        var options = new SessionCreateOptions
        {
            Mode = "subscription",
            SuccessUrl = $"{_app.PortalUrl}/billing?success=true",
            CancelUrl = $"{_app.PortalUrl}/billing?canceled=true",
            LineItems = new List<SessionLineItemOptions>
            {
                new() { Price = GetPriceId(planId), Quantity = 1 }
            },
            Metadata = new Dictionary<string, string>
            {
                ["organization_id"] = org.Id.ToString(),
                ["plan_id"] = planId
            }
        };

        if (!string.IsNullOrEmpty(org.StripeCustomerId))
            options.Customer = org.StripeCustomerId;
        else if (!string.IsNullOrEmpty(customerEmail))
            options.CustomerEmail = customerEmail;

        var service = new SessionService();
        var session = await service.CreateAsync(options);
        return session.Url;
    }

    public async Task<string> CreatePortalSessionAsync(Organization org)
    {
        if (string.IsNullOrEmpty(org.StripeCustomerId))
            throw new InvalidOperationException("No Stripe customer on file");

        var options = new Stripe.BillingPortal.SessionCreateOptions
        {
            Customer = org.StripeCustomerId,
            ReturnUrl = $"{_app.PortalUrl}/billing"
        };

        var service = new Stripe.BillingPortal.SessionService();
        var session = await service.CreateAsync(options);
        return session.Url;
    }

    public async Task HandleWebhookAsync(Event stripeEvent)
    {
        switch (stripeEvent.Type)
        {
            case "checkout.session.completed":
                await HandleCheckoutCompletedAsync(stripeEvent);
                break;
            case "customer.subscription.updated":
            case "customer.subscription.deleted":
                await HandleSubscriptionChangedAsync(stripeEvent);
                break;
            case "invoice.payment_failed":
                await HandlePaymentFailedAsync(stripeEvent);
                break;
        }
    }

    private async Task HandleCheckoutCompletedAsync(Event stripeEvent)
    {
        var session = stripeEvent.Data.Object as Session;
        if (session?.Metadata == null || !session.Metadata.TryGetValue("organization_id", out var orgIdStr))
            return;

        if (!Guid.TryParse(orgIdStr, out var orgId)) return;

        var org = await _db.Organizations.FindAsync(orgId);
        if (org == null) return;

        org.StripeCustomerId = session.CustomerId;
        org.StripeSubscriptionId = session.SubscriptionId;
        org.SubscriptionStatus = SubscriptionStatus.Active;
        if (session.Metadata.TryGetValue("plan_id", out var planId))
        {
            org.PlanId = planId;
            org.SeatLimit = GetSeatLimit(planId);
        }

        await _db.SaveChangesAsync();
    }

    private async Task HandleSubscriptionChangedAsync(Event stripeEvent)
    {
        var subscription = stripeEvent.Data.Object as Subscription;
        if (subscription?.CustomerId == null) return;

        var org = await _db.Organizations.FirstOrDefaultAsync(o => o.StripeCustomerId == subscription.CustomerId);
        if (org == null) return;

        org.StripeSubscriptionId = subscription.Id;
        org.SubscriptionStatus = subscription.Status switch
        {
            "active" => SubscriptionStatus.Active,
            "trialing" => SubscriptionStatus.Trialing,
            "past_due" => SubscriptionStatus.PastDue,
            "canceled" or "unpaid" => SubscriptionStatus.Canceled,
            _ => org.SubscriptionStatus
        };

        await _db.SaveChangesAsync();
    }

    private async Task HandlePaymentFailedAsync(Event stripeEvent)
    {
        var invoice = stripeEvent.Data.Object as Invoice;
        if (invoice?.CustomerId == null) return;

        var org = await _db.Organizations.FirstOrDefaultAsync(o => o.StripeCustomerId == invoice.CustomerId);
        if (org == null) return;

        org.SubscriptionStatus = SubscriptionStatus.PastDue;
        await _db.SaveChangesAsync();
    }

    public static bool IsSubscriptionActive(Organization org) =>
        org.SubscriptionStatus is SubscriptionStatus.Active or SubscriptionStatus.Trialing;
}
