# fAInances

fAInances is a simple personal finance tracker that helps you understand, control, and optimize your spending by easily tracking income, expenses, and monthly budgets.

## Tech stack

- ASP.NET Core 10 + Blazor (Interactive Server)
- MongoDB 7.0 (via the official `MongoDB.Driver`)

## Running locally

Prerequisites: .NET 10 SDK and Docker.

1. Start MongoDB:

    ```bash
    docker compose up -d
    ```

2. Run the app:

    ```bash
    dotnet run --project src/fAInances.Web
    ```

3. Open http://localhost:5227.

On first start the app creates its indexes and seeds a few default categories.

## Running tests

```bash
dotnet test
```

The service tests run against a throwaway MongoDB server started by [EphemeralMongo](https://github.com/asimmon/ephemeral-mongo), so Docker is not needed for them. The `mongod` binaries are downloaded from `downloads.mongodb.org` and `fastdl.mongodb.org` on the first run and cached locally.

## Claude Code cloud sessions

The tests are what cloud sessions run; they don't use Docker or a separate database, only EphemeralMongo.

> **Required network access:** the cloud environment must allow these two hosts, or EphemeralMongo cannot download `mongod` and the tests fail:
>
> - `downloads.mongodb.org`
> - `fastdl.mongodb.org`
>
> In the cloud environment's settings at claude.ai/code, set network access to **Custom**, list both hosts under **Allowed domains**, and check **Also include default list of common package managers** (the .NET SDK install and NuGet restore need it). If the hosts are missing, the session-start hook prints a warning naming them.

Cloud sessions don't come with the .NET SDK. The SessionStart hook in `.claude/settings.json` runs `scripts/cloud/install-dotnet.sh`, which installs the .NET 10 SDK there when it is missing (it does nothing locally).
