{
  alsa-lib,
  at-spi2-atk,
  at-spi2-core,
  atk,
  autoPatchelfHook,
  cairo,
  cups,
  dbus,
  expat,
  fetchurl,
  fontconfig,
  freetype,
  glib,
  gtk3,
  lib,
  libdrm,
  libgbm,
  libglvnd,
  libnotify,
  libcap_ng,
  libseccomp,
  libsecret,
  libuuid,
  libx11,
  libxcb,
  libxcomposite,
  libxdamage,
  libxext,
  libxfixes,
  libxkbcommon,
  libxrandr,
  libxtst,
  makeWrapper,
  nspr,
  nss,
  pango,
  pipewire,
  stdenvNoCC,
  systemd,
  xdg-utils,
  xz,
}: let
  arch =
    {
      x86_64-linux = "amd64";
      aarch64-linux = "arm64";
    }.${
      stdenvNoCC.hostPlatform.system
    };
  hashes = {
    amd64 = "sha256-054dmlcPHlF/FYR59aHZA7mnTR7z8nk2IALcrTdeM88=";
    arm64 = "sha256-puGO0GtI4K8qzQj0g3wmlaTMAn4xqCiRplG0hqSg5Vw=";
  };
in
  stdenvNoCC.mkDerivation {
    pname = "claude-desktop";
    version = "3.1623.0";

    src = fetchurl {
      url = "https://downloads.claude.ai/claude-desktop/apt/stable/pool/main/c/claude-desktop/claude-desktop_3.1623.0_${arch}.deb";
      hash = hashes.${arch};
    };

    nativeBuildInputs = [autoPatchelfHook makeWrapper xz];
    buildInputs = [
      alsa-lib
      at-spi2-atk
      at-spi2-core
      atk
      cairo
      cups
      dbus
      expat
      fontconfig
      freetype
      glib
      gtk3
      libdrm
      libgbm
      libglvnd
      libnotify
      libcap_ng
      libseccomp
      libsecret
      libuuid
      libx11
      libxcb
      libxcomposite
      libxdamage
      libxext
      libxfixes
      libxkbcommon
      libxrandr
      libxtst
      nspr
      nss
      pango
      pipewire
      systemd
    ];

    unpackPhase = ''
      runHook preUnpack
      ar x "$src"
      runHook postUnpack
    '';

    installPhase = ''
      mkdir -p "$out"
      tar -xJf data.tar.xz --no-same-owner --no-same-permissions -C "$out" \
        ./usr/lib/claude-desktop \
        ./usr/share/applications/com.anthropic.Claude.desktop \
        ./usr/share/icons/hicolor
      mv "$out/usr/lib" "$out/lib"
      mv "$out/usr/share" "$out/share"
      rmdir "$out/usr"
      # Setuid sandbox cannot work in the Nix store; Electron uses user namespaces.
      rm "$out/lib/claude-desktop/chrome-sandbox"
      substituteInPlace "$out/share/applications/com.anthropic.Claude.desktop" \
        --replace-fail 'Exec=claude-desktop ' "Exec=$out/bin/claude-desktop "
      makeWrapper "$out/lib/claude-desktop/claude-desktop" "$out/bin/claude-desktop" \
        --chdir "$out/lib/claude-desktop" \
        --prefix PATH : ${lib.makeBinPath [libsecret xdg-utils]} \
        --prefix LD_LIBRARY_PATH : ${lib.makeLibraryPath [libsecret libglvnd libgbm]}
    '';

    meta = {
      description = "Official Claude Desktop Linux beta packaged for Nix";
      homepage = "https://claude.ai/download";
      license = lib.licenses.unfree;
      mainProgram = "claude-desktop";
      platforms = ["x86_64-linux" "aarch64-linux"];
    };
  }
