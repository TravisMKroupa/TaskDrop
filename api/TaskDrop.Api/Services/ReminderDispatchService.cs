using Microsoft.EntityFrameworkCore;
using TaskDrop.Api.Data;
using TaskDrop.Api.DTOs;
using TaskDrop.Api.Models;

namespace TaskDrop.Api.Services;

public class ReminderDispatchService
{
    private readonly AppDbContext _db;

    public ReminderDispatchService(AppDbContext db) => _db = db;

    public async Task<ReminderDispatchResponse> TryDispatchAsync(
        ApplicationUser user,
        ReminderDispatchRequest request)
    {
        var reminder = await _db.Reminders
            .Include(r => r.Task)
            .FirstOrDefaultAsync(r => r.Id == request.ReminderId && r.OrganizationId == user.OrganizationId);

        if (reminder == null)
            return new ReminderDispatchResponse(false, false, "Reminder not found");

        if (reminder.Fired)
            return new ReminderDispatchResponse(false, true, "Already fired");

        var now = DateTime.UtcNow;
        var effectiveFireAt = reminder.SnoozedUntil ?? reminder.FireAt;
        if (effectiveFireAt > now)
            return new ReminderDispatchResponse(false, false, "Not yet due");

        var device = await _db.Devices.FirstOrDefaultAsync(d => d.Id == request.DeviceId && d.UserId == user.Id);
        if (device == null)
            return new ReminderDispatchResponse(false, false, "Device not registered");

        if (reminder.LastDispatchedAt.HasValue &&
            reminder.LastDispatchedAt.Value > now.AddMinutes(-1) &&
            reminder.LastDispatchedByDeviceId != request.DeviceId.ToString())
        {
            return new ReminderDispatchResponse(false, true, "Dispatched by another device");
        }

        reminder.LastDispatchedAt = now;
        reminder.LastDispatchedByDeviceId = request.DeviceId.ToString();

        if (reminder.Recurring == RecurringType.Daily)
        {
            reminder.FireAt = reminder.FireAt.AddDays(1);
            reminder.SnoozedUntil = null;
        }
        else if (reminder.Recurring == RecurringType.Weekly)
        {
            reminder.FireAt = reminder.FireAt.AddDays(7);
            reminder.SnoozedUntil = null;
        }
        else
        {
            reminder.Fired = true;
        }

        reminder.UpdatedAt = now;
        await _db.SaveChangesAsync();

        var msg = $"Reminder: {reminder.Task.Title}";
        return new ReminderDispatchResponse(true, false, msg);
    }

    public async Task<IList<Reminder>> GetDueRemindersAsync(ApplicationUser user)
    {
        var now = DateTime.UtcNow;
        var visibleTaskIds = await _db.Tasks
            .Where(t => t.OrganizationId == user.OrganizationId && t.Status == TaskStatus.Active)
            .Select(t => t.Id)
            .ToListAsync();

        return await _db.Reminders
            .Include(r => r.Task)
            .Where(r => visibleTaskIds.Contains(r.TaskId) && !r.Fired &&
                        ((r.SnoozedUntil != null && r.SnoozedUntil <= now) ||
                         (r.SnoozedUntil == null && r.FireAt <= now)))
            .ToListAsync();
    }
}
