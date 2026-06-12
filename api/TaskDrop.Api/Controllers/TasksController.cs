using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TaskDrop.Api.Data;
using TaskDrop.Api.DTOs;
using TaskDrop.Api.Hubs;
using TaskDrop.Api.Models;
using TaskDrop.Api.Services;

namespace TaskDrop.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly TaskVisibilityService _visibility;
    private readonly IHubContext<TaskSyncHub> _hub;

    public TasksController(AppDbContext db, TaskVisibilityService visibility, IHubContext<TaskSyncHub> hub)
    {
        _db = db;
        _visibility = visibility;
        _hub = hub;
    }

    [HttpGet]
    public async Task<ActionResult<IList<TaskDto>>> GetTasks(
        [FromQuery] string? filter,
        [FromQuery] string? search,
        [FromQuery] string? scope)
    {
        var user = await _visibility.GetCurrentUserAsync(User.GetUserId());
        var query = _visibility.GetVisibleTasksQuery(user, user.OrganizationId);
        query = TaskVisibilityService.ApplyFilter(query, filter, search);
        query = _visibility.ApplyScope(query, user, scope);

        var tasks = await query.OrderBy(t => t.SortOrder).ThenByDescending(t => t.CreatedAt).ToListAsync();
        var names = await GetAssigneeNamesAsync(tasks);

        return Ok(tasks.Select(t => t.ToDto(names.GetValueOrDefault(t.AssignedToUserId ?? ""))).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TaskDto>> GetTask(Guid id)
    {
        var user = await _visibility.GetCurrentUserAsync(User.GetUserId());
        var task = await _visibility.GetVisibleTasksQuery(user, user.OrganizationId)
            .FirstOrDefaultAsync(t => t.Id == id);
        if (task == null) return NotFound();

        var name = task.AssignedToUserId != null
            ? await _db.Users.Where(u => u.Id == task.AssignedToUserId).Select(u => u.FirstName + " " + u.LastName).FirstOrDefaultAsync()
            : null;

        return Ok(task.ToDto(name));
    }

    [HttpPost]
    public async Task<ActionResult<TaskDto>> CreateTask([FromBody] CreateTaskRequest request)
    {
        var user = await _visibility.GetCurrentUserAsync(User.GetUserId());
        var maxOrder = await _db.Tasks.Where(t => t.OrganizationId == user.OrganizationId).MaxAsync(t => (int?)t.SortOrder) ?? -1;

        var task = new TaskItem
        {
            OrganizationId = user.OrganizationId,
            Title = request.Title,
            DueDate = request.DueDate,
            Priority = MappingExtensions.ParsePriority(request.Priority),
            Category = request.Category,
            AssignedToUserId = request.AssignedToUserId,
            CreatedByUserId = user.Id,
            OwnerUserId = user.Id,
            SortOrder = maxOrder + 1
        };

        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();
        await NotifyOrgAsync(user.OrganizationId);

        return CreatedAtAction(nameof(GetTask), new { id = task.Id }, task.ToDto());
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TaskDto>> UpdateTask(Guid id, [FromBody] UpdateTaskRequest request)
    {
        var user = await _visibility.GetCurrentUserAsync(User.GetUserId());
        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.OrganizationId == user.OrganizationId);
        if (task == null) return NotFound();
        if (!await _visibility.CanEditTaskAsync(user, task)) return Forbid();

        SyncService.ApplyTaskUpdate(task, request);
        task.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await NotifyOrgAsync(user.OrganizationId);

        return Ok(task.ToDto());
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteTask(Guid id)
    {
        var user = await _visibility.GetCurrentUserAsync(User.GetUserId());
        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.OrganizationId == user.OrganizationId);
        if (task == null) return NotFound();
        if (!await _visibility.CanEditTaskAsync(user, task)) return Forbid();

        task.DeletedAt = DateTime.UtcNow;
        task.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await NotifyOrgAsync(user.OrganizationId);
        return NoContent();
    }

    [HttpPut("reorder")]
    public async Task<IActionResult> ReorderTasks([FromBody] ReorderTasksRequest request)
    {
        var user = await _visibility.GetCurrentUserAsync(User.GetUserId());
        for (var i = 0; i < request.TaskIds.Count; i++)
        {
            var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == request.TaskIds[i] && t.OrganizationId == user.OrganizationId);
            if (task == null || !await _visibility.CanEditTaskAsync(user, task)) continue;
            task.SortOrder = i;
            task.UpdatedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();
        await NotifyOrgAsync(user.OrganizationId);
        return Ok();
    }

    [HttpGet("{taskId:guid}/notes")]
    public async Task<ActionResult<IList<NoteDto>>> GetNotes(Guid taskId)
    {
        var user = await _visibility.GetCurrentUserAsync(User.GetUserId());
        if (!await CanAccessTaskAsync(user, taskId)) return NotFound();

        var notes = await _db.Notes.Where(n => n.TaskId == taskId).OrderBy(n => n.CreatedAt).ToListAsync();
        return Ok(notes.Select(n => n.ToDto()).ToList());
    }

    [HttpPost("{taskId:guid}/notes")]
    public async Task<ActionResult<NoteDto>> CreateNote(Guid taskId, [FromBody] CreateNoteRequest request)
    {
        var user = await _visibility.GetCurrentUserAsync(User.GetUserId());
        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.OrganizationId == user.OrganizationId);
        if (task == null || !await _visibility.CanEditTaskAsync(user, task)) return NotFound();

        var note = new Note
        {
            TaskId = taskId,
            OrganizationId = user.OrganizationId,
            Body = request.Body,
            CreatedByUserId = user.Id
        };
        _db.Notes.Add(note);
        task.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await NotifyOrgAsync(user.OrganizationId);
        return Ok(note.ToDto());
    }

    [HttpDelete("{taskId:guid}/notes/{noteId:guid}")]
    public async Task<IActionResult> DeleteNote(Guid taskId, Guid noteId)
    {
        var user = await _visibility.GetCurrentUserAsync(User.GetUserId());
        var note = await _db.Notes.FirstOrDefaultAsync(n => n.Id == noteId && n.TaskId == taskId && n.OrganizationId == user.OrganizationId);
        if (note == null) return NotFound();

        note.DeletedAt = DateTime.UtcNow;
        note.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await NotifyOrgAsync(user.OrganizationId);
        return NoContent();
    }

    [HttpGet("{taskId:guid}/reminders")]
    public async Task<ActionResult<IList<ReminderDto>>> GetReminders(Guid taskId)
    {
        var user = await _visibility.GetCurrentUserAsync(User.GetUserId());
        if (!await CanAccessTaskAsync(user, taskId)) return NotFound();

        var reminders = await _db.Reminders.Where(r => r.TaskId == taskId).OrderBy(r => r.FireAt).ToListAsync();
        return Ok(reminders.Select(r => r.ToDto()).ToList());
    }

    [HttpPost("{taskId:guid}/reminders")]
    public async Task<ActionResult<ReminderDto>> CreateReminder(Guid taskId, [FromBody] CreateReminderRequest request)
    {
        var user = await _visibility.GetCurrentUserAsync(User.GetUserId());
        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.OrganizationId == user.OrganizationId);
        if (task == null || !await _visibility.CanEditTaskAsync(user, task)) return NotFound();

        var reminder = new Reminder
        {
            TaskId = taskId,
            OrganizationId = user.OrganizationId,
            FireAt = request.FireAt,
            TypeToast = request.TypeToast,
            TypeSms = request.TypeSms,
            TypeEmail = request.TypeEmail,
            Recurring = MappingExtensions.ParseRecurring(request.Recurring)
        };
        _db.Reminders.Add(reminder);
        await _db.SaveChangesAsync();
        await NotifyOrgAsync(user.OrganizationId);
        return Ok(reminder.ToDto());
    }

    [HttpPut("{taskId:guid}/reminders/{reminderId:guid}")]
    public async Task<ActionResult<ReminderDto>> UpdateReminder(Guid taskId, Guid reminderId, [FromBody] UpdateReminderRequest request)
    {
        var user = await _visibility.GetCurrentUserAsync(User.GetUserId());
        var reminder = await _db.Reminders.FirstOrDefaultAsync(r => r.Id == reminderId && r.TaskId == taskId && r.OrganizationId == user.OrganizationId);
        if (reminder == null) return NotFound();

        if (request.FireAt.HasValue) reminder.FireAt = request.FireAt.Value;
        if (request.TypeToast.HasValue) reminder.TypeToast = request.TypeToast.Value;
        if (request.TypeSms.HasValue) reminder.TypeSms = request.TypeSms.Value;
        if (request.TypeEmail.HasValue) reminder.TypeEmail = request.TypeEmail.Value;
        if (request.Recurring != null) reminder.Recurring = MappingExtensions.ParseRecurring(request.Recurring);
        if (request.SnoozeMinutes.HasValue)
            reminder.SnoozedUntil = DateTime.UtcNow.AddMinutes(request.SnoozeMinutes.Value);

        reminder.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(reminder.ToDto());
    }

    [HttpDelete("{taskId:guid}/reminders/{reminderId:guid}")]
    public async Task<IActionResult> DeleteReminder(Guid taskId, Guid reminderId)
    {
        var user = await _visibility.GetCurrentUserAsync(User.GetUserId());
        var reminder = await _db.Reminders.FirstOrDefaultAsync(r => r.Id == reminderId && r.TaskId == taskId);
        if (reminder == null) return NotFound();

        reminder.DeletedAt = DateTime.UtcNow;
        reminder.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await NotifyOrgAsync(user.OrganizationId);
        return NoContent();
    }

    [HttpPost("import")]
    public async Task<ActionResult> ImportLocalTasks([FromBody] ImportLocalTasksRequest request)
    {
        var user = await _visibility.GetCurrentUserAsync(User.GetUserId());
        var maxOrder = await _db.Tasks.Where(t => t.OrganizationId == user.OrganizationId).MaxAsync(t => (int?)t.SortOrder) ?? -1;

        foreach (var t in request.Tasks)
        {
            maxOrder++;
            _db.Tasks.Add(new TaskItem
            {
                OrganizationId = user.OrganizationId,
                Title = t.Title,
                DueDate = t.DueDate,
                Priority = MappingExtensions.ParsePriority(t.Priority),
                Category = t.Category,
                AssignedToUserId = t.AssignedToUserId,
                CreatedByUserId = user.Id,
                OwnerUserId = user.Id,
                SortOrder = maxOrder
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { imported = request.Tasks.Count });
    }

    private async Task<bool> CanAccessTaskAsync(ApplicationUser user, Guid taskId) =>
        await _visibility.GetVisibleTasksQuery(user, user.OrganizationId).AnyAsync(t => t.Id == taskId);

    private async Task<Dictionary<string, string>> GetAssigneeNamesAsync(List<TaskItem> tasks)
    {
        var ids = tasks.Where(t => t.AssignedToUserId != null).Select(t => t.AssignedToUserId!).Distinct().ToList();
        if (ids.Count == 0) return new Dictionary<string, string>();
        return await _db.Users.AsNoTracking()
            .Where(u => ids.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}".Trim());
    }

    private async Task NotifyOrgAsync(Guid orgId) =>
        await _hub.Clients.Group(orgId.ToString()).SendAsync("DataChanged", new { at = DateTime.UtcNow });
}
