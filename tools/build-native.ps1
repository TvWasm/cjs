param([Parameter(Mandatory=$true)][string]$NdkRoot, [string]$Site)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$ndkBuild = Join-Path $NdkRoot 'ndk-build.cmd'
if (-not (Test-Path -LiteralPath $ndkBuild)) { throw "ndk-build.cmd not found: $ndkBuild" }
$siteDirectories = Get-ChildItem -LiteralPath (Join-Path $projectRoot 'sites') -Directory
if ($Site) { $siteDirectories = @($siteDirectories | Where-Object Name -eq $Site); if (!$siteDirectories) { throw "Unknown site: $Site" } }
foreach ($directory in $siteDirectories) {
  $config = Get-Content -Raw -LiteralPath (Join-Path $directory.FullName 'site.json') | ConvertFrom-Json
  $jniRoot = Join-Path $directory.FullName 'native'
  foreach ($abi in @('armeabi-v7a','arm64-v8a')) {
    $platform = if ($abi -eq 'arm64-v8a') { 'android-21' } else { 'android-16' }
    $buildRoot = Join-Path $projectRoot "build/$($directory.Name)/$abi"
    $output = Join-Path $directory.FullName 'dist'
    & $ndkBuild "NDK_PROJECT_PATH=$jniRoot" "APP_BUILD_SCRIPT=$(Join-Path $jniRoot 'Android.mk')" "NDK_APPLICATION_MK=$(Join-Path $projectRoot 'native/android/Application.mk')" 'NDK_TOOLCHAIN_VERSION=4.9' "APP_ABI=$abi" "APP_PLATFORM=$platform" "NDK_LIBS_OUT=$buildRoot/libs" "NDK_OUT=$buildRoot/obj" -j4
    if ($LASTEXITCODE -ne 0) { throw "Native build failed for $($directory.Name)/$abi" }
    $target = Join-Path $output $abi
    New-Item -ItemType Directory -Force -Path $target | Out-Null
    Copy-Item -LiteralPath "$buildRoot/libs/$abi/$($config.module).so" -Destination "$target/$($config.module).so" -Force
  }
}
