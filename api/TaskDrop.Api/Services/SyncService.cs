using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TaskDrop.Api.Data;
using TaskDrop.Api.DTOs;
using TaskDrop.Api.Hubs;
using TaskDrop.Api.Models;

namespace TaskDrop.Api.Services;

public class SyncService
{
    private readonly AppDbContext _db;
    private readonly TaskVisibilityService _visibility;
    private readonly IHubContext<TaskSyncHub> _hub;

    public SyncService(AppDbContext db, TaskVisibilityService visibility, IHubContext<TaskSyncHub> hub)
    {
        _db = db;
        _visibility = visibility;
        _hub = hub;
    }

    public async Task<SyncPullResponse> PullAsync(ApplicationUser user, DateTime? since)
    {
        var sinceTime = since ?? DateTime.MinValue;
        var orgId = user.OrganizationId;

        var taskQuery = _visibility.GetVisibleTasksQuery(user, orgId)
            .IgnoreQueryFilters()
            .Where(t => t.UpdatedAt > sinceTime || (t.DeletedAt != null && t.DeletedAt > sinceTime));

        var tasks = await taskQuery.OrderBy(t => t.SortOrder).ToListAsync();

        var taskIds = tasks.Select(t => t.Id).ToList();

        var notes = await _db.Notes.IgnoreQueryFilters()
            .Where(n => n.OrganizationId == orgId && taskIds.Contains(n.TaskId) &&
                        (n.UpdatedAt > sinceTime || (n.DeletedAt != null && n.DeletedAt > sinceTime)))
            .ToListAsync();

        var reminders = await _db.Reminders.IgnoreQueryFilters()
            .Where(r => r.OrganizationId == orgId && taskIds.Contains(r.TaskId) &&
                        (r.UpdatedAt > sinceTime || (r.DeletedAt != null && r.DeletedAt > sinceTime)))
            .ToListAsync();

        var cursor = await _db.SyncCursors.FindAsync(user.Id);
        if (cursor == null)
        {
            cursor = new SyncCursor { UserId = user.Id, LastSyncedAt = DateTime.UtcNow };
            _db.SyncCursors.Add(cursor);
        }
        else
        {
            cursor.LastSyncedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();

        var userNames = await GetUserNamesAsync(tasks.Select(t => t.AssignedToUserId).Where(id => id != null)!);

        return new SyncPullResponse(
            DateTime.UtcNow,
            tasks.Where(t => t.DeletedAt == null).Select(t => t.ToDto(userNames.GetValueOrDefault(t.AssignedToUserId ?? ""))).ToList(),
            notes.Where(n => n.DeletedAt == null).Select(n => n.ToDto()).ToList(),
            reminders.Where(r => r.DeletedAt == null).Select(r => r.ToDto()).ToList()
        );
    }

    public async Task PushAsync(ApplicationUser user, SyncPushRequest request)
    {
        if (request.DeviceId.HasValue)
        {
            var device = await _db.Devices.FindAsync(request.DeviceId.Value);
            if (device != null && device.UserId == user.Id)
            {
                device.LastSyncAt = DateTime.UtcNow;
                device.AppVersion = request.AppVersion ?? device.AppVersion;
            }
        }
        else if (!string.IsNullOrEmpty(request.DeviceName))
        {
            _db.Devices.Add(new Device
            {
                UserId = user.Id,
                DeviceName = request.DeviceName,
                AppVersion = request.AppVersion ?? "unknown",
                LastSyncAt = DateTime.UtcNow
            });
        }

        if (request.TasksCreated != null)
        {
            foreach (var t in request.TasksCreated)
            {
                var task = new TaskItem
                {
                    OrganizationId = user.OrganizationId,
                    Title = t.Title,
                    DueDate = t.DueDate,
                    Priority = MappingExtensions.ParsePriority(t.Priority),
                    Category = t.Category,
                    AssignedToUserId = t.AssignedToUserId,
                    CreatedByUserId = user.Id,
                    OwnerUserId = user.Id,
                    SortOrder = await _db.Tasks.CountAsync(x => x.OrganizationId == user.OrganizationId)
                };
                _db.Tasks.Add(task);
            }
        }

        if (request.TasksUpdated != null)
        {
            foreach (var update in request.TasksUpdated)
            {
                var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == update.Id && t.OrganizationId == user.OrganizationId);
                if (task == null || !await _visibility.CanEditTaskAsync(user, task)) continue;
                ApplyTaskUpdate(task, update.Updates);
                task.UpdatedAt = DateTime.UtcNow;
            }
        }

        if (request.TasksDeleted != null)
        {
            foreach (var id in request.TasksDeleted)
            {
                var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.OrganizationId == user.OrganizationId);
                if (task == null || !await _visibility.CanEditTaskAsync(user, task)) continue;
                task.DeletedAt = DateTime.UtcNow;
                task.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync();
        await _hub.Clients.Group(user.OrganizationId.ToString()).SendAsync("DataChanged", new { userId = user.Id });
    }

    public static void ApplyTaskUpdate(TaskItem task, UpdateTaskRequest updates)
    {
        if (updates.Title != null) task.Title = updates.Title;
        if (updates.DueDate.HasValue) task.DueDate = updates.DueDate;
        if (updates.Priority != null) task.Priority = MappingExtensions.ParsePriority(updates.Priority);
        if (updates.Category != null) task.Category = updates.Category;
        if (updates.Status != null) task.Status = MappingExtensions.ParseStatus(updates.Status);
        if (updates.AssignedToUserId != null) task.AssignedToUserId = updates.AssignedToUserId;
        if (updates.SortOrder.HasValue) task.SortOrder = updates.SortOrder.Value;
    }

    private async Task<Dictionary<string, string>> GetUserNamesAsync(IEnumerable<string> userIds)
    {
        var ids = userIds.Distinct().ToList();
        if (ids.Count == 0) return new Dictionary<string, string>();
        return await _db.Users.AsNoTracking()
            .Where(u => ids.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}".Trim());
    }
}
