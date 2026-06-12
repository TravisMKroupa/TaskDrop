namespace TaskDrop.Api.Models;

public class TaskItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public Organization Organization { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public DateTime? DueDate { get; set; }
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public string Category { get; set; } = "Personal";
    public TaskStatus Status { get; set; } = TaskStatus.Active;
    public int SortOrder { get; set; }
    public string CreatedByUserId { get; set; } = string.Empty;
    public string OwnerUserId { get; set; } = string.Empty;
    public string? AssignedToUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    public ICollection<Note> Notes { get; set; } = new List<Note>();
    public ICollection<Reminder> Reminders { get; set; } = new List<Reminder>();
}
