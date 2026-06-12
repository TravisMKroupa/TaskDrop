using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskDrop.Api.Data;
using TaskDrop.Api.DTOs;
using TaskDrop.Api.Services;

namespace TaskDrop.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SyncController : ControllerBase
{
    private readonly SyncService _sync;
    private readonly TaskVisibilityService _visibility;
    private readonly AppDbContext _db;
    private readonly ReminderDispatchService _reminders;

    public SyncController(SyncService sync, TaskVisibilityService visibility, AppDbContext db, ReminderDispatchService reminders)
    {
        _sync = sync;
        _visibility = visibility;
        _db = db;
        _reminders = reminders;
    }

    [HttpGet("pull")]
    public async Task<ActionResult<SyncPullResponse>> Pull([FromQuery] DateTime? since)
    {
        var user = await _visibility.GetCurrentUserAsync(User.GetUserId());
        return Ok(await _sync.PullAsync(user, since));
    }

    [HttpPost("push")]
    public async Task<IActionResult> Push([FromBody] SyncPushRequest request)
    {
        var user = await _visibility.GetCurrentUserAsync(User.GetUserId());
        await _sync.PushAsync(user, request);
        return Ok();
    }

    [HttpGet("status")]
    public async Task<ActionResult<SyncStatusResponse>> Status()
    {
        var userId = User.GetUserId();
        var orgId = User.GetOrgId();
        var org = await _db.Organizations.FindAsync(orgId);
        var cursor = await _db.SyncCursors.FindAsync(userId);
        var device = await _db.Devices.Where(d => d.UserId == userId).OrderByDescending(d => d.LastSyncAt).FirstOrDefaultAsync();

        return Ok(new SyncStatusResponse(
            org != null && StripeService.IsSubscriptionActive(org),
            org?.SubscriptionStatus.ToString() ?? "Unknown",
            cursor?.LastSyncedAt,
            device?.Id.ToString()
        ));
    }

    [HttpGet("reminders/due")]
    public async Task<ActionResult<IList<ReminderDto>>> GetDueReminders()
    {
        var user = await _visibility.GetCurrentUserAsync(User.GetUserId());
        var due = await _reminders.GetDueRemindersAsync(user);
        return Ok(due.Select(r => r.ToDto()).ToList());
    }

    [HttpPost("reminders/dispatch")]
    public async Task<ActionResult<ReminderDispatchResponse>> DispatchReminder([FromBody] ReminderDispatchRequest request)
    {
        var user = await _visibility.GetCurrentUserAsync(User.GetUserId());
        return Ok(await _reminders.TryDispatchAsync(user, request));
    }
}
