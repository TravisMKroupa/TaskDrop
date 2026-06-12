using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using TaskDrop.Api.DTOs;
using TaskDrop.Api.Services;

namespace TaskDrop.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReleasesController : ControllerBase
{
    private readonly AppSettings _app;

    public ReleasesController(IOptions<AppSettings> app) => _app = app.Value;

    [HttpGet("latest")]
    public ActionResult<ReleaseDto> GetLatest()
    {
        var version = typeof(ReleasesController).Assembly.GetName().Version?.ToString(3) ?? "1.0.0";
        return Ok(new ReleaseDto(
            version,
            $"{_app.BaseUrl}/download/TaskDrop-Setup.exe",
            null,
            "TaskDrop desktop sidebar for Windows"
        ));
    }
}
