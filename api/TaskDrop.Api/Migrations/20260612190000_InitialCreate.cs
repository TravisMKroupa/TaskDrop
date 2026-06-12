using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaskDrop.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table => table.PrimaryKey("PK_AspNetRoles", x => x.Id));

            migrationBuilder.CreateTable(
                name: "Organizations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    StripeCustomerId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    StripeSubscriptionId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SubscriptionStatus = table.Column<int>(type: "int", nullable: false),
                    PlanId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SeatLimit = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table => table.PrimaryKey("PK_Organizations", x => x.Id));

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Role = table.Column<int>(type: "int", nullable: false),
                    ManagerUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SecurityStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "bit", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "bit", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUsers_AspNetUsers_ManagerUserId",
                        column: x => x.ManagerUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AspNetUsers_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(name: "IX_Organizations_Slug", table: "Organizations", column: "Slug", unique: true);
            migrationBuilder.CreateIndex(name: "IX_AspNetUsers_ManagerUserId", table: "AspNetUsers", column: "ManagerUserId");
            migrationBuilder.CreateIndex(name: "IX_AspNetUsers_OrganizationId", table: "AspNetUsers", column: "OrganizationId");

            migrationBuilder.CreateTable(name: "Tasks", columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                OrganizationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                DueDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                Priority = table.Column<int>(type: "int", nullable: false),
                Category = table.Column<string>(type: "nvarchar(max)", nullable: false),
                Status = table.Column<int>(type: "int", nullable: false),
                SortOrder = table.Column<int>(type: "int", nullable: false),
                CreatedByUserId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                OwnerUserId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                AssignedToUserId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
            }, constraints: table => { table.PrimaryKey("PK_Tasks", x => x.Id); });

            migrationBuilder.CreateTable(name: "Notes", columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                TaskId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                OrganizationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                Body = table.Column<string>(type: "nvarchar(max)", nullable: false),
                CreatedByUserId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
            }, constraints: table => { table.PrimaryKey("PK_Notes", x => x.Id); });

            migrationBuilder.CreateTable(name: "Reminders", columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                TaskId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                OrganizationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                FireAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                TypeToast = table.Column<bool>(type: "bit", nullable: false),
                TypeSms = table.Column<bool>(type: "bit", nullable: false),
                TypeEmail = table.Column<bool>(type: "bit", nullable: false),
                Recurring = table.Column<int>(type: "int", nullable: false),
                SnoozedUntil = table.Column<DateTime>(type: "datetime2", nullable: true),
                Fired = table.Column<bool>(type: "bit", nullable: false),
                LastDispatchedByDeviceId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                LastDispatchedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
            }, constraints: table => { table.PrimaryKey("PK_Reminders", x => x.Id); });

            migrationBuilder.CreateTable(name: "Invitations", columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                OrganizationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                Email = table.Column<string>(type: "nvarchar(max)", nullable: false),
                Role = table.Column<int>(type: "int", nullable: false),
                ManagerUserId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                Token = table.Column<string>(type: "nvarchar(max)", nullable: false),
                ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                Accepted = table.Column<bool>(type: "bit", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
            }, constraints: table => { table.PrimaryKey("PK_Invitations", x => x.Id); });

            migrationBuilder.CreateTable(name: "Devices", columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                DeviceName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                AppVersion = table.Column<string>(type: "nvarchar(max)", nullable: false),
                LastSyncAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
            }, constraints: table => { table.PrimaryKey("PK_Devices", x => x.Id); });

            migrationBuilder.CreateTable(name: "SyncCursors", columns: table => new
            {
                UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                LastSyncedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
            }, constraints: table => { table.PrimaryKey("PK_SyncCursors", x => x.UserId); });

            migrationBuilder.CreateTable(name: "RefreshTokens", columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                UserId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                Token = table.Column<string>(type: "nvarchar(max)", nullable: false),
                ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                Revoked = table.Column<bool>(type: "bit", nullable: false)
            }, constraints: table => { table.PrimaryKey("PK_RefreshTokens", x => x.Id); });

            migrationBuilder.CreateTable(name: "DesktopAuthCodes", columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                UserId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                Code = table.Column<string>(type: "nvarchar(max)", nullable: false),
                CodeChallenge = table.Column<string>(type: "nvarchar(max)", nullable: false),
                ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                Used = table.Column<bool>(type: "bit", nullable: false)
            }, constraints: table => { table.PrimaryKey("PK_DesktopAuthCodes", x => x.Id); });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "DesktopAuthCodes");
            migrationBuilder.DropTable(name: "RefreshTokens");
            migrationBuilder.DropTable(name: "SyncCursors");
            migrationBuilder.DropTable(name: "Devices");
            migrationBuilder.DropTable(name: "Invitations");
            migrationBuilder.DropTable(name: "Reminders");
            migrationBuilder.DropTable(name: "Notes");
            migrationBuilder.DropTable(name: "Tasks");
            migrationBuilder.DropTable(name: "AspNetUsers");
            migrationBuilder.DropTable(name: "Organizations");
            migrationBuilder.DropTable(name: "AspNetRoleClaims");
            migrationBuilder.DropTable(name: "AspNetRoles");
        }
    }
}
