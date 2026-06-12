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
[Route("api/org")]
[Authorize]
public class OrgController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;

    public OrgController(AppDbContext db, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<ActionResult<OrgDto>> GetOrg()
    {
        var orgId = User.GetOrgId();
        var org = await _db.Organizations.FindAsync(orgId);
        if (org == null) return NotFound();

        var count = await _db.Users.CountAsync(u => u.OrganizationId == orgId && u.IsActive);
        return Ok(new OrgDto(org.Id, org.Name, org.Slug, org.SubscriptionStatus.ToString(),
            org.PlanId, org.SeatLimit, count));
    }

    [HttpPut]
    public async Task<ActionResult<OrgDto>> UpdateOrg([FromBody] UpdateOrgRequest request)
    {
        if (User.GetOrgRole() is not (OrgRole.Owner or OrgRole.Admin))
            return Forbid();

        var org = await _db.Organizations.FindAsync(User.GetOrgId());
        if (org == null) return NotFound();

        org.Name = request.Name;
        await _db.SaveChangesAsync();

        var count = await _db.Users.CountAsync(u => u.OrganizationId == org.Id && u.IsActive);
        return Ok(new OrgDto(org.Id, org.Name, org.Slug, org.SubscriptionStatus.ToString(),
            org.PlanId, org.SeatLimit, count));
    }

    [HttpGet("members")]
    public async Task<ActionResult<IList<MemberDto>>> GetMembers()
    {
        var orgId = User.GetOrgId();
        var members = await _db.Users.AsNoTracking()
            .Where(u => u.OrganizationId == orgId)
            .ToListAsync();

        var managerIds = members.Where(m => m.ManagerUserId != null).Select(m => m.ManagerUserId!).Distinct();
        var managers = await _db.Users.AsNoTracking()
            .Where(u => managerIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}".Trim());

        return Ok(members.Select(m => new MemberDto(
            m.Id, m.Email ?? "", m.FirstName, m.LastName, m.Role.ToString(),
            m.ManagerUserId,
            m.ManagerUserId != null ? managers.GetValueOrDefault(m.ManagerUserId) : null,
            m.IsActive
        )).ToList());
    }

    [HttpPost("members")]
    public async Task<ActionResult> InviteMember([FromBody] InviteMemberRequest request)
    {
        if (User.GetOrgRole() is not (OrgRole.Owner or OrgRole.Admin))
            return Forbid();

        var orgId = User.GetOrgId();
        var org = await _db.Organizations.FindAsync(orgId);
        if (org == null) return NotFound();

        var activeCount = await _db.Users.CountAsync(u => u.OrganizationId == orgId && u.IsActive);
        if (activeCount >= org.SeatLimit)
            return BadRequest(new { error = "Seat limit reached" });

        if (!Enum.TryParse<OrgRole>(request.Role, true, out var role))
            return BadRequest(new { error = "Invalid role" });

        var invitation = new Invitation
        {
            OrganizationId = orgId,
            Email = request.Email,
            Role = role,
            ManagerUserId = request.ManagerUserId
        };
        _db.Invitations.Add(invitation);
        await _db.SaveChangesAsync();

        return Ok(new { invitation.Token, invitation.ExpiresAt, inviteUrl = $"/signup?invite={invitation.Token}" });
    }

    [HttpPut("members/{id}")]
    public async Task<ActionResult<MemberDto>> UpdateMember(string id, [FromBody] UpdateMemberRequest request)
    {
        if (User.GetOrgRole() is not (OrgRole.Owner or OrgRole.Admin))
            return Forbid();

        var member = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.OrganizationId == User.GetOrgId());
        if (member == null) return NotFound();

        if (request.Role != null && Enum.TryParse<OrgRole>(request.Role, true, out var role))
            member.Role = role;
        if (request.ManagerUserId != null)
            member.ManagerUserId = request.ManagerUserId;
        if (request.IsActive.HasValue)
            member.IsActive = request.IsActive.Value;

        await _db.SaveChangesAsync();

        return Ok(new MemberDto(member.Id, member.Email ?? "", member.FirstName, member.LastName,
            member.Role.ToString(), member.ManagerUserId, null, member.IsActive));
    }

    [HttpDelete("members/{id}")]
    public async Task<IActionResult> RemoveMember(string id)
    {
        if (User.GetOrgRole() is not (OrgRole.Owner or OrgRole.Admin))
            return Forbid();

        var member = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.OrganizationId == User.GetOrgId());
        if (member == null) return NotFound();
        if (member.Role == OrgRole.Owner) return BadRequest(new { error = "Cannot remove owner" });

        member.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
