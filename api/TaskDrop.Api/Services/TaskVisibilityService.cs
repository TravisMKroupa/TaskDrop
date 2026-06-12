using Microsoft.EntityFrameworkCore;
using TaskDrop.Api.Data;
using TaskDrop.Api.Models;

namespace TaskDrop.Api.Services;

public class TaskVisibilityService
{
    private readonly AppDbContext _db;

    public TaskVisibilityService(AppDbContext db) => _db = db;

    public async Task<ApplicationUser> GetCurrentUserAsync(string userId) =>
        await _db.Users.AsNoTracking().FirstAsync(u => u.Id == userId && u.IsActive);

    public IQueryable<TaskItem> GetVisibleTasksQuery(ApplicationUser user, Guid orgId)
    {
        var query = _db.Tasks.AsNoTracking().Where(t => t.OrganizationId == orgId);

        return user.Role switch
        {
            OrgRole.Owner or OrgRole.Admin => query,
            OrgRole.Manager => query.Where(t =>
                t.OwnerUserId == user.Id ||
                t.CreatedByUserId == user.Id ||
                t.AssignedToUserId == user.Id ||
                _db.Users.Any(r => r.ManagerUserId == user.Id && (
                    r.Id == t.OwnerUserId ||
                    r.Id == t.AssignedToUserId ||
                    r.Id == t.CreatedByUserId
                ))
            ),
            _ => query.Where(t =>
                t.OwnerUserId == user.Id ||
                t.CreatedByUserId == user.Id ||
                t.AssignedToUserId == user.Id ||
                (user.ManagerUserId != null && (
                    t.OwnerUserId == user.ManagerUserId ||
                    t.CreatedByUserId == user.ManagerUserId
                ))
            )
        };
    }

    public async Task<bool> CanEditTaskAsync(ApplicationUser user, TaskItem task)
    {
        if (task.OrganizationId != user.OrganizationId) return false;
        if (user.Role is OrgRole.Owner or OrgRole.Admin) return true;
        if (user.Role == OrgRole.Manager)
        {
            if (task.OwnerUserId == user.Id || task.CreatedByUserId == user.Id || task.AssignedToUserId == user.Id)
                return true;
            if (task.AssignedToUserId != null)
            {
                var assignee = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == task.AssignedToUserId);
                if (assignee?.ManagerUserId == user.Id) return true;
            }
            return false;
        }

        if (task.OwnerUserId == user.Id || task.CreatedByUserId == user.Id || task.AssignedToUserId == user.Id)
            return true;

        if (user.ManagerUserId != null &&
            (task.OwnerUserId == user.ManagerUserId || task.CreatedByUserId == user.ManagerUserId))
            return true;

        return false;
    }

    public static IQueryable<TaskItem> ApplyFilter(IQueryable<TaskItem> query, string? filter, string? search)
    {
        var today = DateTime.UtcNow.Date;

        query = filter?.ToLowerInvariant() switch
        {
            "today" => query.Where(t => t.Status == TaskStatus.Active && t.DueDate != null && t.DueDate.Value.Date == today),
            "upcoming" => query.Where(t => t.Status == TaskStatus.Active && t.DueDate != null && t.DueDate.Value.Date > today),
            "completed" => query.Where(t => t.Status == TaskStatus.Completed),
            _ => query.Where(t => t.Status == TaskStatus.Active || t.Status == TaskStatus.Completed)
        };

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(t =>
                t.Title.Contains(term) ||
                _db.Notes.Any(n => n.TaskId == t.Id && n.Body.Contains(term))
            );
        }

        return query;
    }

    public static string ScopeFilter(IQueryable<TaskItem> query, ApplicationUser user, string? scope)
    {
        return scope?.ToLowerInvariant() ?? "all";
    }

    public IQueryable<TaskItem> ApplyScope(IQueryable<TaskItem> query, ApplicationUser user, string? scope)
    {
        return scope?.ToLowerInvariant() switch
        {
            "mine" => query.Where(t =>
                t.OwnerUserId == user.Id ||
                t.CreatedByUserId == user.Id ||
                t.AssignedToUserId == user.Id),
            "team" when user.Role == OrgRole.Manager =>
                query.Where(t =>
                    t.OwnerUserId == user.Id ||
                    _db.Users.Any(r => r.ManagerUserId == user.Id && r.Id == t.AssignedToUserId)),
            "manager" when user.ManagerUserId != null =>
                query.Where(t => t.OwnerUserId == user.ManagerUserId || t.CreatedByUserId == user.ManagerUserId),
            _ => query
        };
    }
}

public static class MappingExtensions
{
    public static DTOs.TaskDto ToDto(this TaskItem t, string? assignedName = null) => new(
        t.Id, t.Title, t.DueDate, t.Priority.ToString(), t.Category, t.Status.ToString(),
        t.SortOrder, t.CreatedByUserId, t.OwnerUserId, t.AssignedToUserId, assignedName,
        t.CreatedAt, t.UpdatedAt
    );

    public static DTOs.NoteDto ToDto(this Note n) => new(n.Id, n.TaskId, n.Body, n.CreatedByUserId, n.CreatedAt);

    public static DTOs.ReminderDto ToDto(this Reminder r) => new(
        r.Id, r.TaskId, r.FireAt, r.TypeToast, r.TypeSms, r.TypeEmail,
        r.Recurring.ToString(), r.SnoozedUntil, r.Fired
    );

    public static TaskPriority ParsePriority(string priority) =>
        Enum.TryParse<TaskPriority>(priority, true, out var p) ? p : TaskPriority.Medium;

    public static TaskStatus ParseStatus(string status) =>
        Enum.TryParse<TaskStatus>(status, true, out var s) ? s : TaskStatus.Active;

    public static RecurringType ParseRecurring(string recurring) =>
        Enum.TryParse<RecurringType>(recurring, true, out var r) ? r : RecurringType.None;
}
