{
  description = "Official Claude Desktop for Linux, packaged for Nix";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = {nixpkgs, ...}: {
    packages = nixpkgs.lib.genAttrs ["x86_64-linux" "aarch64-linux"] (system: let
      pkgs = import nixpkgs {
        inherit system;
        config.allowUnfree = true;
      };
      claude-desktop = pkgs.callPackage ./package.nix {};
    in {
      inherit claude-desktop;
      default = claude-desktop;
    });
  };
}
