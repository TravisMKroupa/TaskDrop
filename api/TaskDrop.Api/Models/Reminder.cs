namespace TaskDrop.Api.Models;

public class Reminder
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TaskId { get; set; }
    public TaskItem Task { get; set; } = null!;
    public Guid OrganizationId { get; set; }
    public DateTime FireAt { get; set; }
    public bool TypeToast { get; set; } = true;
    public bool TypeSms { get; set; }
    public bool TypeEmail { get; set; }
    public RecurringType Recurring { get; set; } = RecurringType.None;
    public DateTime? SnoozedUntil { get; set; }
    public bool Fired { get; set; }
    public string? LastDispatchedByDeviceId { get; set; }
    public DateTime? LastDispatchedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }
}
