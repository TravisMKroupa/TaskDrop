namespace TaskDrop.Api.DTOs;

public record RegisterRequest(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    string OrganizationName,
    string PlanId = "starter"
);

public record LoginRequest(string Email, string Password);

public record AuthResponse(
    string UserId,
    string Email,
    string FirstName,
    string LastName,
    string OrganizationId,
    string OrganizationName,
    string Role,
    string? CheckoutUrl = null
);

public record TokenResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    AuthResponse User
);

public record DesktopAuthorizeRequest(string CodeChallenge, string? DeviceName);

public record DesktopAuthorizeResponse(string AuthorizationUrl, string State);

public record DesktopTokenRequest(
    string Code,
    string CodeVerifier,
    string? DeviceName,
    string? AppVersion
);

public record RefreshRequest(string RefreshToken);

public record OrgDto(
    Guid Id,
    string Name,
    string Slug,
    string SubscriptionStatus,
    string PlanId,
    int SeatLimit,
    int MemberCount
);

public record UpdateOrgRequest(string Name);

public record MemberDto(
    string Id,
    string Email,
    string FirstName,
    string LastName,
    string Role,
    string? ManagerUserId,
    string? ManagerName,
    bool IsActive
);

public record InviteMemberRequest(
    string Email,
    string Role,
    string? ManagerUserId
);

public record UpdateMemberRequest(
    string? Role,
    string? ManagerUserId,
    bool? IsActive
);

public record TaskDto(
    Guid Id,
    string Title,
    DateTime? DueDate,
    string Priority,
    string Category,
    string Status,
    int SortOrder,
    string CreatedByUserId,
    string OwnerUserId,
    string? AssignedToUserId,
    string? AssignedToName,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateTaskRequest(
    string Title,
    DateTime? DueDate,
    string Priority,
    string Category,
    string? AssignedToUserId
);

public record UpdateTaskRequest(
    string? Title,
    DateTime? DueDate,
    string? Priority,
    string? Category,
    string? Status,
    string? AssignedToUserId,
    int? SortOrder
);

public record ReorderTasksRequest(IList<Guid> TaskIds);

public record NoteDto(Guid Id, Guid TaskId, string Body, string CreatedByUserId, DateTime CreatedAt);

public record CreateNoteRequest(string Body);

public record ReminderDto(
    Guid Id,
    Guid TaskId,
    DateTime FireAt,
    bool TypeToast,
    bool TypeSms,
    bool TypeEmail,
    string Recurring,
    DateTime? SnoozedUntil,
    bool Fired
);

public record CreateReminderRequest(
    DateTime FireAt,
    bool TypeToast,
    bool TypeSms,
    bool TypeEmail,
    string Recurring
);

public record UpdateReminderRequest(
    DateTime? FireAt,
    bool? TypeToast,
    bool? TypeSms,
    bool? TypeEmail,
    string? Recurring,
    int? SnoozeMinutes
);

public record SyncPullResponse(
    DateTime ServerTime,
    IList<TaskDto> Tasks,
    IList<NoteDto> Notes,
    IList<ReminderDto> Reminders
);

public record SyncPushRequest(
    IList<CreateTaskRequest>? TasksCreated,
    IList<SyncTaskUpdate>? TasksUpdated,
    IList<Guid>? TasksDeleted,
    IList<SyncNotePush>? Notes,
    IList<SyncReminderPush>? Reminders,
    Guid? DeviceId,
    string? DeviceName,
    string? AppVersion
);

public record SyncTaskUpdate(Guid Id, UpdateTaskRequest Updates);

public record SyncNotePush(Guid? Id, Guid TaskId, string Body, DateTime? UpdatedAt, bool Deleted);

public record SyncReminderPush(
    Guid? Id,
    Guid TaskId,
    DateTime FireAt,
    bool TypeToast,
    bool TypeSms,
    bool TypeEmail,
    string Recurring,
    bool Deleted
);

public record SyncStatusResponse(
    bool SubscriptionActive,
    string SubscriptionStatus,
    DateTime? LastSyncedAt,
    string? DeviceId
);

public record CheckoutRequest(string PlanId);

public record CheckoutResponse(string Url);

public record PortalResponse(string Url);

public record ReleaseDto(
    string Version,
    string Url,
    string? Sha256,
    string? ReleaseNotes
);

public record ReminderDispatchRequest(Guid ReminderId, Guid DeviceId, string IdempotencyKey);

public record ReminderDispatchResponse(bool Dispatched, bool AlreadyFired, string Message);

public record ImportLocalTasksRequest(IList<CreateTaskRequest> Tasks);
