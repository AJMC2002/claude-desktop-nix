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

### Browser cookie import

Cookie import from Chrome or Firefox requires Claude and the browser to run in the same logged-in desktop session. Chrome also needs access to the Secret Service or wallet backend protecting its cookie key. This package includes the required `libsecret` runtime support and `secret-tool`, but cannot unlock the session's credential store.

- **KDE Plasma:** unlock KDE Wallet before importing.
- **GNOME:** unlock GNOME Keyring before importing.
- **Other or standalone sessions:** run an available Secret Service provider and keep Claude, the browser, and D-Bus in the same user session.

Do not copy browser cookies or keyring files manually.

Verified on x86_64 NixOS: reproducible build, ELF linking, `--version`, desktop-entry validation, and an actual sandboxed Wayland window. ARM64 is evaluated and pinned against the signed upstream package index, but not runtime-tested. Login, account-dependent features, and Cowork have not been tested. Cowork requires KVM/QEMU and about 25 GB free disk space; this package does not configure those system features.

To update, change the version and per-architecture hashes in `package.nix` using [Anthropic's APT package index](https://downloads.claude.ai/claude-desktop/apt/stable/dists/stable/InRelease).

The packaging code is MIT-licensed. Claude Desktop itself is proprietary Anthropic software and is not redistributed here. NixOS is not an officially supported Linux distribution for the app.
