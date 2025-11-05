# App Store Publishing Guide

Complete guide to publishing your Grudge App to Google Play Store and Apple App Store.

## 📋 Overview

Your Next.js app can be published to app stores using two approaches:
1. **Capacitor** (Recommended) - Native wrapper with full native API access
2. **PWA + TWA** - Lighter approach, web-based with limitations

This guide focuses on **Capacitor** for the best native experience.

---

## 🎯 Prerequisites

### Required Accounts
- [ ] **Apple Developer Account** ($99/year) - https://developer.apple.com/programs/
- [ ] **Google Play Developer Account** ($25 one-time) - https://play.google.com/console/signup

### Required Software
- [ ] **Node.js 18+** (You already have this ✅)
- [ ] **Xcode 14+** (Mac only, for iOS)
- [ ] **Android Studio** (For Android builds)
- [ ] **CocoaPods** (Mac only, for iOS dependencies)

### App Store Assets (Create These)
- [ ] **App Icon** (1024x1024 PNG, no transparency)
- [ ] **Screenshots** (Various device sizes)
- [ ] **Feature Graphic** (1024x500 for Google Play)
- [ ] **App Description** (Short & full descriptions)
- [ ] **Privacy Policy URL** (Required for both stores)
- [ ] **Support URL** (Contact/support page)

---

## 🔧 Step 1: Install Capacitor

Add Capacitor to your existing Next.js project:

```powershell
# Install Capacitor CLI and core
npm install @capacitor/core @capacitor/cli

# Initialize Capacitor (run from grudge-app directory)
npx cap init

# When prompted:
# App name: Grudge App
# App ID: com.yourdomain.grudgeapp (reverse domain notation)
# Web directory: out (for static export)
```

Add platform-specific packages:

```powershell
# iOS platform
npm install @capacitor/ios

# Android platform  
npm install @capacitor/android

# Useful plugins
npm install @capacitor/app @capacitor/haptics @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard
```

---

## 🔧 Step 2: Configure Next.js for Static Export

Capacitor requires a static build. Update your configuration:

### Update `next.config.ts`:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable static export for Capacitor
  output: process.env.CAPACITOR_BUILD === 'true' ? 'export' : undefined,
  
  // Disable image optimization for static export
  images: {
    unoptimized: process.env.CAPACITOR_BUILD === 'true',
  },
  
  // Ensure trailing slashes for proper routing
  trailingSlash: true,
  
  // Keep your existing config
  reactStrictMode: true,
  // ... rest of your config
}

export default nextConfig
```

### Update `package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:mobile": "cross-env CAPACITOR_BUILD=true next build",
    "export": "npm run build:mobile",
    "cap:sync": "cap sync",
    "cap:open:ios": "cap open ios",
    "cap:open:android": "cap open android",
    "mobile:build": "npm run export && npm run cap:sync"
  }
}
```

Install cross-env for Windows compatibility:

```powershell
npm install --save-dev cross-env
```

---

## 🔧 Step 3: Configure Capacitor

### Edit `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourdomain.grudgeapp', // Change this to your domain
  appName: 'Grudge App',
  webDir: 'out',
  server: {
    // For development, you can use your local server
    // url: 'http://localhost:3000',
    // cleartext: true
    
    // For production, use your deployed URL
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000',
    },
  },
};

export default config;
```

---

## 📱 Step 4: Android Setup & Build

### 4.1 Install Android Studio
1. Download from https://developer.android.com/studio
2. Install Android SDK (API 33+)
3. Set up Android environment variables:

```powershell
# Add to your Windows environment variables:
ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk
# Add to PATH:
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
```

### 4.2 Add Android Platform

```powershell
# Build the static export
npm run mobile:build

# Add Android platform
npx cap add android

# Open in Android Studio
npx cap open android
```

### 4.3 Configure Android App

**Edit `android/app/build.gradle`:**

```gradle
android {
    namespace "com.yourdomain.grudgeapp"
    compileSdkVersion 34
    
    defaultConfig {
        applicationId "com.yourdomain.grudgeapp"
        minSdkVersion 22
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }
    
    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Edit `android/app/src/main/AndroidManifest.xml`:**

Add necessary permissions:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <application
        android:label="Grudge App"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:usesCleartextTraffic="false"
        android:networkSecurityConfig="@xml/network_security_config">
        <!-- ... -->
    </application>
</manifest>
```

### 4.4 Generate Android Icons

Use **Android Asset Studio** or generate with:

```powershell
# Install icon generator
npm install -g cordova-res

# Generate icons (place 1024x1024 icon.png in root)
cordova-res android --icon-source icon.png
```

Or manually place icons in:
- `android/app/src/main/res/mipmap-*/ic_launcher.png`

### 4.5 Build Signed APK/AAB

**Generate Signing Key:**

```powershell
# Using keytool (included with Java)
keytool -genkey -v -keystore grudge-app-release.keystore -alias grudge-app -keyalg RSA -keysize 2048 -validity 10000

# Save the keystore file and password securely!
```

**Configure Signing (`android/app/build.gradle`):**

```gradle
android {
    signingConfigs {
        release {
            storeFile file('../../grudge-app-release.keystore')
            storePassword 'YOUR_KEYSTORE_PASSWORD'
            keyAlias 'grudge-app'
            keyPassword 'YOUR_KEY_PASSWORD'
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
        }
    }
}
```

**Build Release AAB (Android App Bundle):**

```powershell
cd android
.\gradlew bundleRelease

# AAB will be at: android/app/build/outputs/bundle/release/app-release.aab
```

---

## 🍎 Step 5: iOS Setup & Build (Mac Required)

### 5.1 Prerequisites (Mac)

```bash
# Install Xcode from Mac App Store (14+)

# Install CocoaPods
sudo gem install cocoapods

# Install Xcode command line tools
xcode-select --install
```

### 5.2 Add iOS Platform

```bash
# Build the static export
npm run mobile:build

# Add iOS platform
npx cap add ios

# Install CocoaPods dependencies
cd ios/App
pod install
cd ../..

# Open in Xcode
npx cap open ios
```

### 5.3 Configure iOS App in Xcode

1. **Select your development team** (requires Apple Developer account)
   - Open project in Xcode
   - Select "App" target → "Signing & Capabilities"
   - Choose your Team

2. **Configure Bundle Identifier**
   - Set to: `com.yourdomain.grudgeapp`
   - Must match your Capacitor config

3. **Set App Icons**
   - Drag 1024x1024 icon to "App Icon" in Assets.xcassets
   - Xcode will generate all sizes

4. **Configure Launch Screen**
   - Customize splash screen in LaunchScreen.storyboard

5. **Set Version Numbers**
   - Version: 1.0.0
   - Build: 1

### 5.4 Build iOS App

**For Testing (Development):**

```bash
# Build and run on simulator
npx cap run ios

# Or select device in Xcode and press Run (Cmd+R)
```

**For App Store Submission:**

1. In Xcode: Product → Archive
2. Wait for archive to complete
3. Window → Organizer shows your archive
4. Click "Distribute App" → "App Store Connect"
5. Follow upload wizard

---

## 📤 Step 6: Google Play Store Submission

### 6.1 Create App in Play Console

1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in:
   - **App name**: Grudge App
   - **Default language**: English (US)
   - **App or game**: App
   - **Free or paid**: Free
   - Accept declarations

### 6.2 Complete App Dashboard

**Store Listing:**
- **App name**: Grudge App
- **Short description**: (80 chars) Track teams, matches, and player rotations
- **Full description**: (4000 chars) Detailed app description
- **App icon**: Upload 512x512 PNG
- **Feature graphic**: Upload 1024x500 JPG/PNG
- **Screenshots**: 
  - Phone: At least 2 (1080x1920 or 1440x2560)
  - 7-inch tablet: At least 2 (1600x2560)
  - 10-inch tablet: At least 2 (2048x2732)

**App Category:**
- Category: Sports
- Tags: Add relevant tags

**Contact Details:**
- Email: your-support@email.com
- Phone: Optional
- Website: Your app website/landing page

**Privacy Policy:**
- URL to your privacy policy (REQUIRED)

### 6.3 Content Rating

1. Fill out questionnaire about app content
2. Sports apps typically get "Everyone" rating
3. Submit for rating

### 6.4 App Content

- **Privacy Policy**: Link to your policy
- **Ads**: Declare if you show ads (No if none)
- **Data Safety**: Describe what data you collect
- **Target Audience**: Select age groups
- **News App**: No (unless it is)

### 6.5 Release Preparation

**Internal Testing Track:**
1. Create release
2. Upload your AAB file (`app-release.aab`)
3. Add release notes
4. Add internal testers (emails)
5. Submit

**Production Release:**
1. After testing, promote to Production
2. Rollout percentage: Start at 20%, monitor
3. Can increase to 50%, 100% gradually

### 6.6 Review Timeline

- **First review**: 7-14 days
- **Updates**: 1-3 days
- Check Play Console for review status

---

## 🍎 Step 7: Apple App Store Submission

### 7.1 Create App in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - **Platform**: iOS
   - **Name**: Grudge App
   - **Primary Language**: English (US)
   - **Bundle ID**: com.yourdomain.grudgeapp (select from dropdown)
   - **SKU**: grudge-app-001 (unique identifier)
   - **User Access**: Full Access

### 7.2 Complete App Information

**General Information:**
- **App Icon**: Upload 1024x1024 PNG (no transparency, no rounded corners)
- **App Previews and Screenshots**:
  - iPhone 6.7" Display (required): 3-10 screenshots
  - iPhone 6.5" Display (required): 3-10 screenshots
  - Use Xcode Simulator or actual devices
- **Description**: (4000 chars max) Detailed description
- **Keywords**: (100 chars) Comma-separated, relevant keywords
- **Support URL**: Link to support page
- **Marketing URL**: Optional website link

**Version Information:**
- **What's New**: Release notes (4000 chars)
- **Promotional Text**: Optional (170 chars)

**App Review Information:**
- **Contact Information**: Email, phone
- **Demo Account**: If app requires login, provide test credentials
- **Notes**: Any special instructions for reviewers

**Age Rating:**
- Answer questionnaire (likely 4+)

**App Privacy:**
- Configure data collection practices
- Must provide privacy policy URL
- Describe what data you collect and how it's used

### 7.3 Pricing and Availability

- **Price**: Free (or set price)
- **Availability**: All territories or select specific countries
- **Pre-Order**: Optional

### 7.4 Prepare Build for Submission

**App Store Requirements:**
- ✅ App uses HTTPS for network requests
- ✅ App handles missing data gracefully
- ✅ No hardcoded test data in production
- ✅ No obvious bugs or crashes
- ✅ Complies with Apple's Human Interface Guidelines
- ✅ No references to other platforms (Android, etc.)

**Test Thoroughly:**
- All user flows work
- No crashes
- Handles poor network conditions
- Works on different device sizes

### 7.5 Submit for Review

1. **Upload build from Xcode** (completed in Step 5.4)
2. **Wait for processing** (15-60 minutes)
3. **Select build** in App Store Connect
4. **Export Compliance**: Answer questions about encryption
5. **Submit for Review**

### 7.6 Review Timeline

- **First review**: 24-48 hours (can be up to 7 days)
- **Updates**: Similar timeline
- **Rejections**: Common first time, address feedback and resubmit

---

## 🔐 Step 8: Production Deployment Checklist

### Backend/API Setup
- [ ] Deploy API to production server (not localhost!)
- [ ] Use production database (PostgreSQL recommended)
- [ ] Set up proper environment variables
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS for mobile app domains
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting and security

### Update App Configuration
- [ ] Update API endpoints from localhost to production URLs
- [ ] Set `NEXT_PUBLIC_API_URL` environment variable
- [ ] Update `NEXTAUTH_URL` to production domain
- [ ] Configure Pusher for real-time features (production credentials)
- [ ] Test all API calls work from mobile app

### Security
- [ ] Remove any test/debug code
- [ ] Ensure no API keys are hardcoded
- [ ] Validate all user inputs
- [ ] Implement proper authentication
- [ ] Enable CSP headers
- [ ] Configure app transport security (iOS)
- [ ] Secure credential storage

### App Store Compliance
- [ ] Privacy policy published and linked
- [ ] Terms of service available
- [ ] Support/contact page live
- [ ] Age-appropriate content
- [ ] No gambling/inappropriate content
- [ ] Proper data collection disclosures

---

## 🚀 Step 9: Build & Deploy Workflow

### Standard Release Process

**1. Update Code:**
```powershell
# Make your changes in the Next.js app
# Test locally
npm run dev
```

**2. Build Mobile App:**
```powershell
# Build static export with mobile optimizations
npm run mobile:build

# Sync with native platforms
npx cap sync

# Copy any updated assets
npx cap copy
```

**3. Android Release:**
```powershell
cd android
.\gradlew clean bundleRelease
# Upload new AAB to Play Console
```

**4. iOS Release:**
```bash
# Open in Xcode
npx cap open ios

# Product → Archive
# Upload to App Store Connect
```

**5. Submit Updates:**
- Update version numbers (both platforms)
- Write release notes
- Submit for review

### Version Numbering

Use semantic versioning:
- **1.0.0** - Initial release
- **1.0.1** - Bug fixes
- **1.1.0** - New features
- **2.0.0** - Major changes

Update in:
- `package.json` (version)
- `android/app/build.gradle` (versionName, versionCode)
- Xcode project settings (Version, Build)

---

## 🐛 Troubleshooting

### Common Issues

**"Could not find or load main class"**
- Check JAVA_HOME environment variable
- Reinstall Android Studio

**"Pod install failed"**
- Run `pod repo update`
- Delete `Podfile.lock` and retry

**"App Transport Security" error (iOS)**
- Ensure all URLs use HTTPS
- Add exception in Info.plist if needed (not recommended)

**"Network request failed"**
- Check API URLs are correct
- Verify CORS settings on backend
- Test API endpoints with Postman

**Build Failed in Xcode**
- Clean build folder: Product → Clean Build Folder
- Delete derived data
- Update CocoaPods: `pod update`

### Testing on Devices

**Android:**
```powershell
# Enable USB debugging on device
# Connect via USB
adb devices
npx cap run android --target=YOUR_DEVICE_ID
```

**iOS:**
```bash
# Connect device via USB
# Trust computer on device
# Select device in Xcode and Run
```

---

## 📊 Post-Launch

### Monitor Performance
- Check crash reports (Play Console, App Store Connect)
- Monitor user reviews and ratings
- Track download and engagement metrics
- Set up analytics (Google Analytics, Firebase)

### User Feedback
- Respond to reviews (both platforms)
- Address reported bugs promptly
- Consider feature requests
- Maintain support channels

### Updates
- Regular bug fixes and improvements
- New feature releases
- Platform requirement updates (new iOS/Android versions)
- Security patches

### Marketing
- Create landing page
- Social media presence
- App Store Optimization (ASO)
- User testimonials/screenshots

---

## 📝 Resources

### Documentation
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)

### Tools
- [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/) - Icon generator
- [App Icon Generator](https://appicon.co/) - iOS/Android icons
- [Screenshot Creator](https://www.appstorescreenshot.com/) - Store screenshots
- [PWA Builder](https://www.pwabuilder.com/) - Alternative approach

### Communities
- [Capacitor Discord](https://discord.gg/UPYYRhtyzp)
- [Ionic Forum](https://forum.ionicframework.com/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/capacitor)

---

## ✅ Quick Checklist

Before submitting to stores:

### Technical
- [ ] App builds without errors
- [ ] All features work on physical devices
- [ ] No crashes or major bugs
- [ ] Fast loading times (< 3 seconds)
- [ ] Handles offline/poor network gracefully
- [ ] Proper error messages
- [ ] Uses production API endpoints

### Design
- [ ] App icon looks good (no blur/distortion)
- [ ] Screenshots are high quality
- [ ] All text is readable
- [ ] Consistent branding
- [ ] Follows platform guidelines (Material Design/HIG)

### Content
- [ ] Privacy policy published
- [ ] Terms of service available
- [ ] Support/contact information
- [ ] App description compelling and accurate
- [ ] Keywords relevant and optimized
- [ ] No typos in store listing

### Legal
- [ ] Complies with store policies
- [ ] Age rating appropriate
- [ ] Data collection disclosed
- [ ] No copyright violations
- [ ] Proper attribution for libraries/assets

---

**Good luck with your app launch! 🚀**

For questions or issues, refer to the troubleshooting section or reach out to the respective platform support channels.
