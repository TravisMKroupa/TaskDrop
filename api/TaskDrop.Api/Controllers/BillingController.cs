using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskDrop.Api.Data;
using TaskDrop.Api.DTOs;
using TaskDrop.Api.Services;

namespace TaskDrop.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BillingController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly StripeService _stripe;

    public BillingController(AppDbContext db, StripeService stripe)
    {
        _db = db;
        _stripe = stripe;
    }

    [HttpPost("checkout")]
    public async Task<ActionResult<CheckoutResponse>> Checkout([FromBody] CheckoutRequest request)
    {
        if (User.GetOrgRole() is not Models.OrgRole.Owner and not Models.OrgRole.Admin)
            return Forbid();

        var org = await _db.Organizations.FindAsync(User.GetOrgId());
        if (org == null) return NotFound();

        var url = await _stripe.CreateCheckoutSessionAsync(org, request.PlanId);
        return Ok(new CheckoutResponse(url));
    }

    [HttpPost("portal")]
    public async Task<ActionResult<PortalResponse>> Portal()
    {
        if (User.GetOrgRole() is not Models.OrgRole.Owner and not Models.OrgRole.Admin)
            return Forbid();

        var org = await _db.Organizations.FindAsync(User.GetOrgId());
        if (org == null) return NotFound();

        var url = await _stripe.CreatePortalSessionAsync(org);
        return Ok(new PortalResponse(url));
    }
}
