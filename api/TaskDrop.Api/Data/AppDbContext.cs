using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using TaskDrop.Api.Models;

namespace TaskDrop.Api.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<Reminder> Reminders => Set<Reminder>();
    public DbSet<Invitation> Invitations => Set<Invitation>();
    public DbSet<Device> Devices => Set<Device>();
    public DbSet<SyncCursor> SyncCursors => Set<SyncCursor>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<DesktopAuthCode> DesktopAuthCodes => Set<DesktopAuthCode>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Organization>(e =>
        {
            e.HasIndex(o => o.Slug).IsUnique();
        });

        builder.Entity<ApplicationUser>(e =>
        {
            e.HasOne(u => u.Organization)
                .WithMany(o => o.Users)
                .HasForeignKey(u => u.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(u => u.Manager)
                .WithMany(u => u.DirectReports)
                .HasForeignKey(u => u.ManagerUserId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        builder.Entity<TaskItem>(e =>
        {
            e.HasIndex(t => new { t.OrganizationId, t.UpdatedAt });
            e.HasQueryFilter(t => t.DeletedAt == null);
        });

        builder.Entity<Note>(e =>
        {
            e.HasQueryFilter(n => n.DeletedAt == null);
        });

        builder.Entity<Reminder>(e =>
        {
            e.HasQueryFilter(r => r.DeletedAt == null);
        });

        builder.Entity<SyncCursor>(e =>
        {
            e.HasKey(s => s.UserId);
        });
    }
}
