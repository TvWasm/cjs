param([Parameter(Mandatory=$true)][string]$NdkRoot)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$jniRoot = Join-Path $projectRoot 'native\android'
$outputRoot = Join-Path $projectRoot 'dist'
$ndkBuild = Join-Path $NdkRoot 'ndk-build.cmd'
if (-not (Test-Path -LiteralPath $ndkBuild)) { throw "ndk-build.cmd not found: $ndkBuild" }
foreach ($abi in @('armeabi-v7a','arm64-v8a')) {
  & $ndkBuild -C $jniRoot "APP_ABI=$abi" "NDK_LIBS_OUT=$outputRoot" "NDK_OUT=$(Join-Path $projectRoot "build\obj-$abi")" -j4
  if ($LASTEXITCODE -ne 0) { throw "Native build failed for $abi" }
}
