using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using TaskDrop.Api.Data;
using TaskDrop.Api.Models;

namespace TaskDrop.Api.Services;

public class JwtSettings
{
    public string SigningKey { get; set; } = "TaskDrop_Dev_SigningKey_ChangeInProduction_32chars!";
    public string Issuer { get; set; } = "TaskDrop";
    public string Audience { get; set; } = "TaskDropClients";
    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 30;
}

public class AppSettings
{
    public string BaseUrl { get; set; } = "https://taskdrop.live";
    public string PortalUrl { get; set; } = "https://taskdrop.live";
}

public class TokenService
{
    private readonly AppDbContext _db;
    private readonly JwtSettings _jwt;

    public TokenService(AppDbContext db, IOptions<JwtSettings> jwt)
    {
        _db = db;
        _jwt = jwt.Value;
    }

    public async Task<TokenResponse> IssueTokensAsync(ApplicationUser user)
    {
        var org = await _db.Organizations.FindAsync(user.OrganizationId)
            ?? throw new InvalidOperationException("Organization not found");

        var accessToken = CreateAccessToken(user, org);
        var refreshToken = await CreateRefreshTokenAsync(user.Id);

        return new TokenResponse(
            accessToken,
            refreshToken,
            DateTime.UtcNow.AddMinutes(_jwt.AccessTokenMinutes),
            MapUser(user, org)
        );
    }

    public async Task<TokenResponse?> RefreshAsync(string refreshToken)
    {
        var stored = await _db.RefreshTokens
            .FirstOrDefaultAsync(r => r.Token == refreshToken && !r.Revoked && r.ExpiresAt > DateTime.UtcNow);

        if (stored == null) return null;

        stored.Revoked = true;

        var user = await _db.Users.Include(u => u.Organization).FirstOrDefaultAsync(u => u.Id == stored.UserId);
        if (user == null || !user.IsActive) return null;

        return await IssueTokensAsync(user);
    }

    public async Task RevokeRefreshTokenAsync(string refreshToken)
    {
        var stored = await _db.RefreshTokens.FirstOrDefaultAsync(r => r.Token == refreshToken);
        if (stored != null) stored.Revoked = true;
        await _db.SaveChangesAsync();
    }

    private string CreateAccessToken(ApplicationUser user, Organization org)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new("org_id", org.Id.ToString()),
            new("org_role", user.Role.ToString()),
            new("first_name", user.FirstName),
            new("last_name", user.LastName),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.SigningKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwt.AccessTokenMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<string> CreateRefreshTokenAsync(string userId)
    {
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays)
        });
        await _db.SaveChangesAsync();
        return token;
    }

    public static DTOs.AuthResponse MapUser(ApplicationUser user, Organization org) =>
        new(user.Id, user.Email ?? "", user.FirstName, user.LastName,
            org.Id.ToString(), org.Name, user.Role.ToString());

    public static string GeneratePkceChallenge(string verifier)
    {
        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(Encoding.ASCII.GetBytes(verifier));
        return Base64UrlEncode(hash);
    }

    public static string Base64UrlEncode(byte[] input) =>
        Convert.ToBase64String(input).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}

public static class UserExtensions
{
    public static string GetUserId(this ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException();

    public static Guid GetOrgId(this ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue("org_id") ?? throw new UnauthorizedAccessException());

    public static OrgRole GetOrgRole(this ClaimsPrincipal user) =>
        Enum.Parse<OrgRole>(user.FindFirstValue("org_role") ?? "Member");
}
