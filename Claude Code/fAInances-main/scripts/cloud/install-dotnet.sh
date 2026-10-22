#!/usr/bin/env bash
# SessionStart hook (see .claude/settings.json). Claude Code cloud sessions don't come with the .NET SDK,
# so this installs the .NET 10 SDK there if it is missing, then checks that the hosts EphemeralMongo
# downloads mongod from are reachable. Anywhere else (local sessions) it does nothing.
# Whatever it prints is added to Claude's context.
set -uo pipefail

[[ ${CLAUDE_CODE_REMOTE:-} == true ]] || exit 0

LOG=/tmp/install-dotnet.log
SUDO=""
if [[ $(id -u) != 0 ]] && command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
fi

has_sdk10() { command -v dotnet >/dev/null 2>&1 && dotnet --list-sdks 2>/dev/null | grep -q '^10\.'; }

install_dotnet() {
    # Ubuntu 24.04 ships dotnet-sdk-10.0 in its own archive, which the cloud's default allowlist permits.
    if command -v apt-get >/dev/null 2>&1; then
        { $SUDO apt-get update -qq && DEBIAN_FRONTEND=noninteractive $SUDO apt-get install -y -qq dotnet-sdk-10.0; } >>"$LOG" 2>&1
    fi

    if ! has_sdk10; then
        curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh \
            && bash /tmp/dotnet-install.sh --channel 10.0 --install-dir "$HOME/.dotnet" >>"$LOG" 2>&1
        export PATH="$HOME/.dotnet:$PATH"
        # Make it visible to the Bash commands Claude runs later in this session.
        if [[ -n ${CLAUDE_ENV_FILE:-} ]]; then
            echo "export DOTNET_ROOT=\"$HOME/.dotnet\" PATH=\"$HOME/.dotnet:\$PATH\"" >>"$CLAUDE_ENV_FILE"
        fi
    fi

    if has_sdk10; then
        echo "==> Installed .NET SDK $(dotnet --version)"
    else
        echo "==> WARNING: could not install the .NET 10 SDK; see $LOG"
    fi
}

# The tests start MongoDB with EphemeralMongo, which reads the release list from downloads.mongodb.org
# and downloads mongod from fastdl.mongodb.org. Neither is on the cloud's default network allowlist.
check_mongodb_hosts() {
    local manifest fastdl_url
    manifest=$(curl -fsS --max-time 15 https://downloads.mongodb.org/current.json 2>/dev/null)
    fastdl_url=$(grep -o -m 1 'https://fastdl\.mongodb\.org/[^"]*\.tgz' <<<"$manifest" | head -n 1)
    if [[ -z $fastdl_url ]] || ! curl -fsSI --max-time 15 "$fastdl_url" >/dev/null 2>&1; then
        echo "==> WARNING: the MongoDB download hosts are blocked, so the tests (EphemeralMongo) cannot run."
        echo "==> Tell the user to allow downloads.mongodb.org and fastdl.mongodb.org in this cloud environment's network settings."
    fi
}

# A previous session may have installed it with dotnet-install.sh.
if [[ -x "$HOME/.dotnet/dotnet" ]]; then
    export PATH="$HOME/.dotnet:$PATH"
fi

if has_sdk10; then
    echo "==> .NET SDK $(dotnet --version) is already installed"
else
    install_dotnet
fi
check_mongodb_hosts
exit 0
