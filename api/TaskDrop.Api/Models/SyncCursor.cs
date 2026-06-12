namespace TaskDrop.Api.Models;

public class SyncCursor
{
    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;
    public DateTime LastSyncedAt { get; set; } = DateTime.UtcNow;
}
