param([Parameter(Mandatory=$true)][string]$NdkRoot)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$jniRoot = Join-Path $projectRoot 'native\android'
$outputRoot = Join-Path $projectRoot 'dist'
$ndkBuild = Join-Path $NdkRoot 'ndk-build.cmd'
if (-not (Test-Path -LiteralPath $ndkBuild)) { throw "ndk-build.cmd not found: $ndkBuild" }
foreach ($abi in @('armeabi-v7a','arm64-v8a')) {
  $platform = if ($abi -eq 'arm64-v8a') { 'android-21' } else { 'android-16' }
  & $ndkBuild "NDK_PROJECT_PATH=$jniRoot" "APP_BUILD_SCRIPT=$(Join-Path $jniRoot 'Android.mk')" "NDK_APPLICATION_MK=$(Join-Path $jniRoot 'Application.mk')" "NDK_TOOLCHAIN_VERSION=4.9" "APP_ABI=$abi" "APP_PLATFORM=$platform" "NDK_LIBS_OUT=$outputRoot" "NDK_OUT=$(Join-Path $projectRoot "build\obj-$abi")" -j4
  if ($LASTEXITCODE -ne 0) { throw "Native build failed for $abi" }
}
