using Microsoft.AspNetCore.Mvc;
using Stripe;
using TaskDrop.Api.Services;

namespace TaskDrop.Api.Controllers;

[ApiController]
[Route("api/webhooks")]
public class WebhooksController : ControllerBase
{
    private readonly StripeService _stripe;
    private readonly StripeSettings _settings;

    public WebhooksController(StripeService stripe, Microsoft.Extensions.Options.IOptions<StripeSettings> settings)
    {
        _stripe = stripe;
        _settings = settings.Value;
    }

    [HttpPost("stripe")]
    public async Task<IActionResult> StripeWebhook()
    {
        var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
        var signature = Request.Headers["Stripe-Signature"].ToString();

        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(json, signature, _settings.WebhookSecret);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        await _stripe.HandleWebhookAsync(stripeEvent);
        return Ok();
    }
}
