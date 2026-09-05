# Ensure we are running as Admin
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "Please run this script as Administrator. (Right click PowerShell -> Run as Administrator)"
    exit
}

Write-Host "Installing Java JDK 17..."
winget install Microsoft.OpenJDK.17 -e --accept-package-agreements --accept-source-agreements --silent

Write-Host "Creating Android SDK directories..."
$androidHome = "C:\Android"
if (!(Test-Path -Path "$androidHome\cmdline-tools")) {
    New-Item -ItemType Directory -Force -Path "$androidHome\cmdline-tools"
}

Write-Host "Downloading Android Command Line Tools..."
$cmdlineUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
$zipPath = "$androidHome\cmdline-tools.zip"
Invoke-WebRequest -Uri $cmdlineUrl -OutFile $zipPath

Write-Host "Extracting Command Line Tools..."
Expand-Archive -Path $zipPath -DestinationPath "$androidHome\cmdline-tools" -Force
if (Test-Path "$androidHome\cmdline-tools\cmdline-tools") {
    Rename-Item -Path "$androidHome\cmdline-tools\cmdline-tools" -NewName "latest"
}

Write-Host "Setting Environment Variables..."
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $androidHome, "Machine")
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot", "Machine")
$oldPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$newPaths = "$androidHome\cmdline-tools\latest\bin;$androidHome\platform-tools;$androidHome\emulator"
if ($oldPath -notmatch "cmdline-tools\\latest\\bin") {
    [Environment]::SetEnvironmentVariable("Path", "$oldPath;$newPaths", "Machine")
}

Write-Host "Installing SDK Components..."
# Accept all licenses
echo y | & "$androidHome\cmdline-tools\latest\bin\sdkmanager.bat" --licenses
& "$androidHome\cmdline-tools\latest\bin\sdkmanager.bat" "platform-tools" "platforms;android-34" "build-tools;34.0.0"

Write-Host "Done! Please restart your terminal so the new Environment Variables take effect."
