# BrainBucket Android APK Deployment Guide

## Overview

This guide provides comprehensive instructions for building and installing the BrainBucket APK on your Android device. BrainBucket is now configured for production deployment with offline-first functionality, biometric authentication, and optimized Android permissions.

## Prerequisites

### Development Environment Setup

#### 1. Install Android Studio
1. Download [Android Studio](https://developer.android.com/studio) for your operating system
2. Install Android Studio with default settings
3. Launch Android Studio and complete the initial setup wizard
4. Install the latest Android SDK (API level 35 recommended)

#### 2. Install Java Development Kit (JDK)
- **Required**: JDK 17 or higher
- **Recommendation**: Use OpenJDK 17+ from your system package manager or Oracle JDK

#### 3. Configure Environment Variables

**On Windows:**
```bash
# Add to System Environment Variables
ANDROID_HOME=C:\Users\[YOUR_USERNAME]\AppData\Local\Android\Sdk
JAVA_HOME=C:\Program Files\Java\jdk-17

# Add to PATH
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%JAVA_HOME%\bin
```

**On macOS/Linux:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
export ANDROID_HOME=$HOME/Android/Sdk          # Linux
export JAVA_HOME=/path/to/your/jdk17
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:$JAVA_HOME/bin
```

#### 4. Install Required Android SDK Components
Open Android Studio and navigate to SDK Manager:
1. **SDK Platforms**: Install Android 14 (API 35) and Android 6.0 (API 23)
2. **SDK Tools**: Ensure these are installed:
   - Android SDK Build-Tools (latest)
   - Android SDK Command-line Tools
   - Android SDK Platform-Tools
   - Android Emulator (optional, for testing)

### Project Dependencies

Ensure you have Node.js and npm installed:
```bash
node --version  # Should be 18+ 
npm --version   # Should be 8+
```

## Building the APK

### Method 1: Using the Provided Build Script (Recommended)

1. **Navigate to your project directory:**
   ```bash
   cd /path/to/brainbucket
   ```

2. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

3. **Run the build script:**
   ```bash
   chmod +x build-android.sh
   ./build-android.sh
   ```

4. **Generate the APK:**
   ```bash
   # Navigate to Android project
   cd android
   
   # Build debug APK (recommended for personal use - no signing required)
   ./gradlew assembleDebug
   
   # OR build release APK (requires signing - see release signing section below)
   ./gradlew assembleRelease
   ```

### Method 2: Manual Build Process

1. **Build the React application:**
   ```bash
   npm run build
   ```

2. **Sync with Capacitor:**
   ```bash
   npx cap sync android
   ```

3. **Open in Android Studio:**
   ```bash
   npx cap open android
   ```

4. **Build APK in Android Studio:**
   - Go to `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
   - Wait for build completion
   - Click "locate" to find the generated APK

### Method 3: Command Line Build

```bash
# Build and generate APK in one command
npx cap build android

# If the above doesn't work, use Capacitor CLI
cd android
./gradlew assembleRelease
```

## Understanding APK Build Variants

### Debug vs Release APKs

**Debug APK (Recommended for Personal Use):**
- Pre-signed with debug certificate
- Can be installed directly on your device
- Larger file size due to debugging symbols
- Easier installation process

**Release APK:**
- Must be manually signed for installation
- Smaller, optimized file size
- Requires keystore and signing setup
- Recommended only for app store distribution

### APK Build Locations

After successful build, find your APK at:

**Debug APK (Ready to Install):**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

**Release APK (Unsigned - Requires Signing):**
```
android/app/build/outputs/apk/release/app-release-unsigned.apk
```

**Release APK (Signed - Ready to Install):**
```
android/app/build/outputs/apk/release/app-release.apk
```

## APK Signing for Release Builds

⚠️ **Important**: Unsigned release APKs cannot be installed on Android devices. You must sign them first.

### Option 1: Use Debug APK (Recommended for Personal Use)

For personal installation, use the debug APK which is automatically signed:
```bash
cd android
./gradlew assembleDebug
```

### Option 2: Generate Signed Release APK

#### Method A: Android Studio GUI (Recommended)

1. **Open Android Studio:**
   ```bash
   npx cap open android
   ```

2. **Generate Signed APK:**
   - Go to `Build` → `Generate Signed Bundle / APK`
   - Select `APK` and click `Next`
   - Create new keystore or use existing:
     - **Key store path**: Choose location (e.g., `app-keystore.jks`)
     - **Password**: Create secure password
     - **Key alias**: `app-key`
     - **Key password**: Create secure password
     - **Validity**: 25+ years
     - **Certificate info**: Fill required fields
   - Select `release` build variant
   - Click `Finish`

3. **Locate Signed APK:**
   - Android Studio will show location when complete
   - Usually: `android/app/build/outputs/apk/release/app-release.apk`

#### Method B: Command Line Signing

1. **Create Keystore** (one-time setup):
   ```bash
   keytool -genkey -v -keystore app-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias app-key
   ```

2. **Sign the APK:**
   ```bash
   cd android
   ./gradlew assembleRelease
   
   # Sign the unsigned APK
   $ANDROID_HOME/build-tools/[VERSION]/apksigner sign \
     --ks app-keystore.jks \
     --ks-key-alias app-key \
     --out app-release-signed.apk \
     app/build/outputs/apk/release/app-release-unsigned.apk
   ```

## Installing on Android Device

### Prerequisites for Device Installation

1. **Enable Developer Options:**
   - Go to `Settings` → `About Phone`
   - Tap `Build Number` 7 times
   - Developer options will be enabled

2. **Enable USB Debugging:**
   - Go to `Settings` → `Developer Options`
   - Toggle `USB Debugging` ON

3. **Allow Installation from Unknown Sources:**
   - Go to `Settings` → `Security` → `Install unknown apps`
   - Enable for your file manager or browser

### Installation Methods

#### Method 1: USB Installation (Recommended)

1. **Connect your device** via USB cable

2. **Install APK using ADB:**
   
   **For Debug APK (Recommended - No Signing Required):**
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```
   
   **For Signed Release APK:**
   ```bash
   adb install android/app/build/outputs/apk/release/app-release.apk
   ```
   
   **For App Updates (if app already installed):**
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

3. **If ADB is not recognized**, use file transfer:
   - Copy APK file to device storage
   - Use file manager to install

#### Method 2: Wireless Installation

1. **Transfer APK** to your device via:
   - Email attachment
   - Cloud storage (Google Drive, Dropbox)
   - File sharing apps
   - QR code transfer

2. **Install APK:**
   - Open file manager on device
   - Navigate to downloaded APK
   - Tap to install
   - Grant necessary permissions

## Feature Testing Checklist

After installation, verify all features work correctly:

### Core Functionality
- [ ] **App Launch**: App starts without crashes
- [ ] **Biometric Authentication**: Fingerprint/face recognition works
- [ ] **Quick Capture**: Can create captures quickly
- [ ] **Offline Mode**: App works without internet connection
- [ ] **Local Storage**: Data persists between app restarts

### Capture Features
- [ ] **Text Capture**: Can create text-based captures
- [ ] **Voice Capture**: Voice recording functionality works
- [ ] **Camera Capture**: Take photos within app
- [ ] **File Attachments**: Attach files to captures
- [ ] **Edit Captures**: Modify existing captures

### Organization Features
- [ ] **Bucket Management**: Create and manage buckets
- [ ] **Folder Organization**: Create folders within buckets
- [ ] **Search Functionality**: Global search works correctly
- [ ] **Sorting**: Drag-and-drop reordering
- [ ] **Templates**: Task templates function properly

### Mobile-Specific Features
- [ ] **Bottom Navigation**: Navigation works smoothly
- [ ] **Touch Gestures**: Swipe and tap interactions
- [ ] **Responsive Design**: UI adapts to screen size
- [ ] **Notifications**: Local notifications appear
- [ ] **Background Operation**: App maintains state when backgrounded

### Performance Testing
- [ ] **App Startup Time**: Fast loading (< 3 seconds)
- [ ] **Smooth Scrolling**: No lag in long lists
- [ ] **Memory Usage**: No memory leaks during extended use
- [ ] **Battery Impact**: Reasonable battery consumption

## First-Run Setup Verification

1. **Initial App Launch:**
   - Welcome screen appears
   - Biometric setup prompt
   - Permissions requested appropriately

2. **Biometric Setup:**
   - System prompts for biometric registration
   - Successful authentication test
   - Fallback authentication works

3. **Create First Capture:**
   - Quick capture button responsive
   - Data saves locally
   - Appears in capture list

4. **Test Offline Functionality:**
   - Turn off WiFi and mobile data
   - Create new captures
   - Verify data persistence
   - Re-enable network
   - Confirm no data loss

## Troubleshooting

### Common Build Issues

#### "Android SDK not found"
**Solution:**
```bash
# Verify ANDROID_HOME is set
echo $ANDROID_HOME

# Reinstall Capacitor Android
npm uninstall @capacitor/android
npm install @capacitor/android
npx cap sync android
```

#### "Java version incompatible"
**Solution:**
- Ensure JDK 17+ is installed
- Update JAVA_HOME environment variable
- Restart terminal/IDE

#### "Gradle build failed"
**Solution:**
```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

### Common Installation Issues

#### "App not installed" Error
**Solutions:**
1. **Unsigned Release APK:** Most common cause - use debug APK or sign release APK
   ```bash
   # Use debug APK instead
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```
2. **Insufficient Storage:** Free up device space
3. **Conflicting Package:** Uninstall previous versions
4. **Corrupted APK:** Rebuild and re-download APK
5. **ARM Architecture:** Ensure APK matches device architecture

#### "Parse Error" or "There is a problem parsing the package"
**Solutions:**
1. **Unsigned Release APK:** The most common cause
   - Use debug APK: `./gradlew assembleDebug`
   - Or properly sign release APK (see signing section above)
2. **Corrupted Download:** Re-download APK file
3. **Incompatible Architecture:** Build for correct CPU architecture

#### "Unknown Sources" Blocked
**Solution:**
- Enable "Install unknown apps" for your file manager
- Some devices require per-app permission

#### APK Won't Open
**Solutions:**
1. **File Corruption:** Re-download APK
2. **Android Version:** Ensure device runs Android 6.0+ (API 23+)
3. **Architecture Mismatch:** Build APK for correct CPU architecture
4. **Unsigned APK:** Use debug build or sign release build

#### "Installation Failed" in ADB
**Solutions:**
1. **Enable USB Debugging:** In Developer Options
2. **Authorize Computer:** Allow USB debugging when prompted
3. **Use Force Install:** `adb install -r -d [apk-file]`
4. **Check Device Storage:** Ensure sufficient space
5. **Wrong APK Type:** Use debug APK for easier installation:
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Runtime Issues

#### Biometric Authentication Not Working
**Solutions:**
1. Ensure device has biometric hardware
2. Register fingerprints/face in device settings
3. Grant biometric permissions to app
4. Use fallback authentication if needed

#### Offline Features Not Working
**Solutions:**
1. Verify internet connection was disabled properly
2. Check browser cache settings
3. Clear app data and test fresh install

#### Performance Issues
**Solutions:**
1. **Restart Device:** Clear memory and background processes
2. **Close Other Apps:** Free up system resources
3. **Update Android:** Ensure latest OS version
4. **Clear App Cache:** In app settings

## Support and Maintenance

### App Updates
- New APK versions require manual installation
- Backup data before major updates
- Test new versions on secondary device first

### Data Management
- **Backup:** Export important captures before device changes
- **Migration:** Data tied to device biometric authentication
- **Sync:** Currently local-only, cloud sync available in future versions

### Logs and Debugging
For troubleshooting, enable developer logging:
1. Go to app settings
2. Enable "Debug Mode" if available
3. Check device logs: `adb logcat | grep BrainBucket`

## Version Information

- **App Version:** 1.0.0
- **Minimum Android Version:** 6.0 (API 23)
- **Target Android Version:** 14 (API 35)
- **APK Size:** ~15-25 MB (estimated)
- **Architecture Support:** ARM64, ARMv7

## Success Indicators

Your deployment is successful when:
✅ APK builds without errors
✅ App installs on device
✅ Biometric authentication works
✅ Can create and save captures offline
✅ All core features function properly
✅ Performance is smooth and responsive

---

**Need Help?** If you encounter issues not covered in this guide, check the project documentation or create a detailed bug report with:
- Device model and Android version
- Error messages or screenshots
- Steps to reproduce the issue
- APK build method used