# Claude Desktop for Nix

Nix flake for [Anthropic's official Linux beta](https://support.claude.com/en/articles/10065433-install-claude-desktop). Supports x86_64 and aarch64 Linux. Downloads version-pinned `.deb` files from Anthropic's signed APT repository, with hashes pinned in `package.nix`.

```sh
nix run github:AJMC2002/claude-desktop-nix
```

NixOS flake usage:

```nix
inputs.claude-desktop.url = "github:AJMC2002/claude-desktop-nix";

# In a module receiving inputs and pkgs:
environment.systemPackages = [
  inputs.claude-desktop.packages.${pkgs.stdenv.hostPlatform.system}.default
];
```

The package installs `claude-desktop`, Anthropic's `.desktop` file, and hicolor icons. If KDE does not show the new app in search immediately after switching generations, run `kbuildsycoca6 --noincremental` and restart Plasma or log in again.

### Chrome cookie import and desktop keyrings

Cookie import requires the same user-session keyring that encrypts Chrome's cookie key. The package exposes `libsecret` and `secret-tool` at runtime, but it cannot start or unlock a desktop keyring for you.

- **KDE Plasma:** unlock KDE Wallet before importing. Keep Chrome and Claude in the same Plasma/D-Bus session; `kwalletd6` must be running.
- **GNOME:** ensure GNOME Keyring's Secret Service is enabled and unlocked. `secret-tool` is included by this package; a normal GNOME login usually starts the keyring automatically.
- **Hyprland, Sway, and other standalone Wayland sessions:** start a Secret Service provider such as `gnome-keyring` in the user D-Bus session and unlock it before launching Chrome or Claude. Session startup must preserve `DBUS_SESSION_BUS_ADDRESS`.
- **Other desktop shells:** use the shell's Secret Service/KWallet integration and unlock it before importing. A keyring GUI alone is not enough if Claude and Chrome are running outside the same D-Bus session.

If Chrome was configured with a non-default `--password-store` backend, use the matching backend for both applications. Do not copy Chrome cookies or keyring files manually.

Verified on x86_64 NixOS: reproducible build, ELF linking, `--version`, desktop-entry validation, and an actual sandboxed Wayland window. ARM64 is evaluated and pinned against the signed upstream package index, but not runtime-tested. Login, account-dependent features, and Cowork have not been tested. Cowork requires KVM/QEMU and about 25 GB free disk space; this package does not configure those system features.

To update, change the version and per-architecture hashes in `package.nix` using [Anthropic's APT package index](https://downloads.claude.ai/claude-desktop/apt/stable/dists/stable/InRelease).

The packaging code is MIT-licensed. Claude Desktop itself is proprietary Anthropic software and is not redistributed here. NixOS is not an officially supported Linux distribution for the app.
