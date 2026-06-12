using Microsoft.AspNetCore.SignalR;

namespace TaskDrop.Api.Hubs;

public class TaskSyncHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var orgId = Context.User?.FindFirst("org_id")?.Value;
        if (!string.IsNullOrEmpty(orgId))
            await Groups.AddToGroupAsync(Context.ConnectionId, orgId);
        await base.OnConnectedAsync();
    }
}
