using Microsoft.AspNetCore.Identity;

namespace TaskDrop.Api.Models;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public Guid OrganizationId { get; set; }
    public Organization Organization { get; set; } = null!;
    public OrgRole Role { get; set; } = OrgRole.Member;
    public string? ManagerUserId { get; set; }
    public ApplicationUser? Manager { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ApplicationUser> DirectReports { get; set; } = new List<ApplicationUser>();
    public ICollection<Device> Devices { get; set; } = new List<Device>();
    public SyncCursor? SyncCursor { get; set; }
}
