$env:ANDROID_HOME="C:\Android"
$env:JAVA_HOME="C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"

Write-Host "Accepting licenses..."
echo y | cmd /c "C:\Android\cmdline-tools\latest\bin\sdkmanager.bat --licenses"

Write-Host "Downloading SDK Tools..."
cmd /c "C:\Android\cmdline-tools\latest\bin\sdkmanager.bat platform-tools platforms;android-34 build-tools;34.0.0"

Write-Host "Done!"
