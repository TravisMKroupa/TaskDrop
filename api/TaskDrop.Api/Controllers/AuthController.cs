using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskDrop.Api.Data;
using TaskDrop.Api.DTOs;
using TaskDrop.Api.Models;
using TaskDrop.Api.Services;

namespace TaskDrop.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly AppDbContext _db;
    private readonly TokenService _tokenService;
    private readonly StripeService _stripe;
    private readonly AppSettings _app;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        AppDbContext db,
        TokenService tokenService,
        StripeService stripe,
        Microsoft.Extensions.Options.IOptions<AppSettings> app)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _db = db;
        _tokenService = tokenService;
        _stripe = stripe;
        _app = app.Value;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        if (await _userManager.FindByEmailAsync(request.Email) != null)
            return BadRequest(new { error = "Email already registered" });

        var slug = Slugify(request.OrganizationName);
        if (await _db.Organizations.AnyAsync(o => o.Slug == slug))
            slug = $"{slug}-{Guid.NewGuid().ToString()[..8]}";

        var org = new Organization
        {
            Name = request.OrganizationName,
            Slug = slug,
            PlanId = request.PlanId,
            SeatLimit = _stripe.GetSeatLimit(request.PlanId),
            SubscriptionStatus = SubscriptionStatus.Trialing
        };
        _db.Organizations.Add(org);
        await _db.SaveChangesAsync();

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            OrganizationId = org.Id,
            Role = OrgRole.Owner,
            EmailConfirmed = true
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { error = string.Join(", ", result.Errors.Select(e => e.Description)) });

        string? checkoutUrl = null;
        try
        {
            checkoutUrl = await _stripe.CreateCheckoutSessionAsync(org, request.PlanId, request.Email);
        }
        catch
        {
            // Stripe not configured in dev
        }

        return Ok(new AuthResponse(
            user.Id, user.Email!, user.FirstName, user.LastName,
            org.Id.ToString(), org.Name, user.Role.ToString(), checkoutUrl
        ));
    }

    [HttpPost("login")]
    public async Task<ActionResult<TokenResponse>> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.Users
            .Include(u => u.Organization)
            .FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive);

        if (user == null) return Unauthorized(new { error = "Invalid credentials" });

        var result = await _signInManager.CheckPasswordSignAsync(user, request.Password);
        if (!result) return Unauthorized(new { error = "Invalid credentials" });

        var tokens = await _tokenService.IssueTokensAsync(user);
        return Ok(tokens);
    }

    [HttpPost("desktop/authorize")]
    public ActionResult<DesktopAuthorizeResponse> DesktopAuthorize([FromBody] DesktopAuthorizeRequest request)
    {
        var state = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        var url = $"{_app.PortalUrl}/desktop-auth?challenge={Uri.EscapeDataString(request.CodeChallenge)}&state={Uri.EscapeDataString(state)}";
        return Ok(new DesktopAuthorizeResponse(url, state));
    }

    [HttpPost("desktop/token")]
    public async Task<ActionResult<TokenResponse>> DesktopToken([FromBody] DesktopTokenRequest request)
    {
        var authCode = await _db.DesktopAuthCodes
            .FirstOrDefaultAsync(c => c.Code == request.Code && !c.Used && c.ExpiresAt > DateTime.UtcNow);

        if (authCode == null) return Unauthorized(new { error = "Invalid or expired code" });

        var expectedChallenge = TokenService.GeneratePkceChallenge(request.CodeVerifier);
        if (authCode.CodeChallenge != expectedChallenge)
            return Unauthorized(new { error = "PKCE verification failed" });

        authCode.Used = true;

        var user = await _userManager.Users.Include(u => u.Organization)
            .FirstOrDefaultAsync(u => u.Id == authCode.UserId && u.IsActive);
        if (user == null) return Unauthorized();

        if (!string.IsNullOrEmpty(request.DeviceName))
        {
            _db.Devices.Add(new Device
            {
                UserId = user.Id,
                DeviceName = request.DeviceName,
                AppVersion = request.AppVersion ?? "unknown",
                LastSyncAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        return Ok(await _tokenService.IssueTokensAsync(user));
    }

    [HttpPost("desktop/code")]
    [Authorize]
    public async Task<ActionResult> CreateDesktopCode([FromBody] DesktopAuthorizeRequest request)
    {
        var userId = User.GetUserId();
        var code = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');

        _db.DesktopAuthCodes.Add(new DesktopAuthCode
        {
            UserId = userId,
            Code = code,
            CodeChallenge = request.CodeChallenge,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5)
        });
        await _db.SaveChangesAsync();

        return Ok(new { code, redirect = $"taskdrop://auth/callback?code={code}" });
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<TokenResponse>> Refresh([FromBody] RefreshRequest request)
    {
        var tokens = await _tokenService.RefreshAsync(request.RefreshToken);
        if (tokens == null) return Unauthorized(new { error = "Invalid refresh token" });
        return Ok(tokens);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest? request)
    {
        if (request?.RefreshToken != null)
            await _tokenService.RevokeRefreshTokenAsync(request.RefreshToken);
        return Ok();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<AuthResponse>> Me()
    {
        var user = await _userManager.Users.Include(u => u.Organization)
            .FirstAsync(u => u.Id == User.GetUserId());
        return Ok(TokenService.MapUser(user, user.Organization));
    }

    private static string Slugify(string name)
    {
        var slug = name.ToLowerInvariant();
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"[\s-]+", "-").Trim('-');
        return slug.Length > 0 ? slug : "org";
    }
}
