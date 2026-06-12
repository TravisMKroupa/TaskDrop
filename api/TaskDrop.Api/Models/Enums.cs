namespace TaskDrop.Api.Models;

public enum OrgRole
{
    Owner = 0,
    Admin = 1,
    Manager = 2,
    Member = 3
}

public enum SubscriptionStatus
{
    Incomplete = 0,
    Trialing = 1,
    Active = 2,
    PastDue = 3,
    Canceled = 4
}

public enum TaskStatus
{
    Active = 0,
    Completed = 1,
    Archived = 2
}

public enum TaskPriority
{
    Low = 0,
    Medium = 1,
    High = 2
}

public enum RecurringType
{
    None = 0,
    Daily = 1,
    Weekly = 2
}
