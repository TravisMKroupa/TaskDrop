namespace TaskDrop.Api.Models;

public class DesktopAuthCode
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string CodeChallenge { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool Used { get; set; }
}
