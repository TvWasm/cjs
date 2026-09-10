param([Parameter(Mandatory=$true)][string]$NdkDirectory, [string]$Site, [string]$Profile)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$profiles = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'native/profiles.json') | ConvertFrom-Json
if ($Profile) { $profiles = @($profiles | Where-Object id -eq $Profile); if (!$profiles) { throw "Unknown profile: $Profile" } }
$sites = Get-ChildItem -LiteralPath (Join-Path $projectRoot 'sites') -Directory
if ($Site) { $sites = @($sites | Where-Object Name -eq $Site); if (!$sites) { throw "Unknown site: $Site" } }
foreach ($nativeProfile in $profiles) {
  $ndkRoot = Join-Path $NdkDirectory "android-ndk-$($nativeProfile.ndk)"
  $ndkBuild = Join-Path $ndkRoot 'ndk-build.cmd'
  if (!(Test-Path -LiteralPath $ndkBuild)) { throw "Missing NDK: $ndkRoot" }
  foreach ($directory in $sites) {
    $config = Get-Content -Raw -LiteralPath (Join-Path $directory.FullName 'site.json') | ConvertFrom-Json
    $jniRoot = Join-Path $directory.FullName 'native'
    $buildRoot = Join-Path $projectRoot "build/$($directory.Name)/$($nativeProfile.id)-$($nativeProfile.ndk)-clang"
    & $ndkBuild "NDK_PROJECT_PATH=$jniRoot" "APP_BUILD_SCRIPT=$jniRoot/Android.mk" "NDK_APPLICATION_MK=$projectRoot/native/android/Application.mk" 'NDK_TOOLCHAIN_VERSION=clang' "APP_ABI=$($nativeProfile.abi)" "APP_PLATFORM=android-$($nativeProfile.minSdk)" "NDK_LIBS_OUT=$buildRoot/libs" "NDK_OUT=$buildRoot/obj" -j4
    if ($LASTEXITCODE -ne 0) { throw "Native build failed: $($directory.Name)/$($nativeProfile.id)" }
    $target = Join-Path $directory.FullName "dist/$($nativeProfile.directory)"
    New-Item -ItemType Directory -Force -Path $target | Out-Null
    Copy-Item -LiteralPath "$buildRoot/libs/$($nativeProfile.abi)/$($config.module).so" -Destination "$target/$($config.module).so" -Force
  }
}
