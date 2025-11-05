# 🚀 Quick Start: Publishing to App Stores

This is your streamlined guide to get your Grudge App published quickly.

---

## 🎯 The 30-Minute Setup

### Step 1: Install Capacitor (5 minutes)

```powershell
# From grudge-app directory
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npm install @capacitor/app @capacitor/haptics @capacitor/splash-screen @capacitor/status-bar
npm install --save-dev cross-env

# Initialize
npx cap init
# Name: Grudge App
# ID: com.yourdomain.grudgeapp (change yourdomain!)
# Web dir: out
```

### Step 2: Update package.json (2 minutes)

Add these scripts to your `package.json`:

```json
"scripts": {
  "build:mobile": "cross-env CAPACITOR_BUILD=true next build",
  "mobile:build": "npm run build:mobile && npx cap sync",
  "cap:open:ios": "npx cap open ios",
  "cap:open:android": "npx cap open android"
}
```

### Step 3: Configure Next.js for Static Export (3 minutes)

Update `next.config.ts` - add this at the top of your config:

```typescript
const nextConfig: NextConfig = {
  output: process.env.CAPACITOR_BUILD === 'true' ? 'export' : undefined,
  images: {
    unoptimized: process.env.CAPACITOR_BUILD === 'true',
  },
  trailingSlash: true,
  // ... rest of your existing config
}
```

### Step 4: Build and Test (5 minutes)

```powershell
# Build for mobile
npm run mobile:build

# Add platforms
npx cap add android
# For iOS (Mac only): npx cap add ios

# Open in Android Studio
npx cap open android
```

### Step 5: Deploy Your Backend (15 minutes)

**Critical: Your app needs a live backend, not localhost!**

Quick deploy options:
- **Vercel** (Recommended): `vercel deploy --prod`
- **Railway**: Push to GitHub, connect repo
- **Render**: Connect GitHub, auto-deploy

Update your API endpoints in the app to use production URL.

---

## 📱 Android: Zero to Play Store in 2 Hours

### Prerequisites
- Google Play Developer account ($25)
- Android Studio installed
- 1024x1024 app icon ready

### Build Process

**1. Generate Signing Key** (5 min)
```powershell
keytool -genkey -v -keystore grudge-app-release.keystore -alias grudge-app -keyalg RSA -keysize 2048 -validity 10000
```
⚠️ **SAVE THE PASSWORD SOMEWHERE SAFE!**

**2. Configure Signing** (5 min)

Edit `android/app/build.gradle`, add before `android {`:

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('../../keystore.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Inside `android {`, add:

```gradle
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
    }
}
```

**3. Create keystore.properties** (2 min)

Create `keystore.properties` in project root:

```
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=grudge-app
storeFile=../../grudge-app-release.keystore
```

**4. Build Release AAB** (10 min)
```powershell
cd android
.\gradlew clean bundleRelease

# AAB location: android/app/build/outputs/bundle/release/app-release.aab
```

**5. Create Play Console Listing** (45 min)

Go to https://play.google.com/console

1. **Create App** → Fill basic info
2. **Store Listing**:
   - Upload icon (512x512)
   - Add 2+ screenshots
   - Write descriptions
   - Add feature graphic
3. **Content Rating** → Complete questionnaire
4. **App Content** → Privacy policy URL
5. **Create Release**:
   - Upload AAB
   - Add release notes
   - Submit for review

**⏰ Review Time:** 1-7 days

---

## 🍎 iOS: Zero to App Store in 3 Hours

### Prerequisites (Mac Only!)
- Apple Developer account ($99/year)
- Xcode 14+ installed
- CocoaPods installed
- 1024x1024 app icon ready

### Build Process

**1. Add iOS Platform** (10 min)
```bash
npx cap add ios
cd ios/App && pod install && cd ../..
npx cap open ios
```

**2. Configure in Xcode** (15 min)

1. Select "App" target → "Signing & Capabilities"
2. Choose your Team (Apple Developer account)
3. Verify Bundle ID: `com.yourdomain.grudgeapp`
4. Drag app icon to Assets.xcassets
5. Set version: 1.0.0, build: 1

**3. Archive and Upload** (20 min)

1. Select "Any iOS Device" as target
2. Product → Archive
3. Wait for archive (5-10 min)
4. Click "Distribute App" → "App Store Connect"
5. Follow wizard to upload

**4. Create App Store Listing** (90 min)

Go to https://appstoreconnect.apple.com

1. **My Apps** → **+** → **New App**
2. Fill in basic info
3. **App Information**:
   - Add screenshots (use Simulator)
   - Write descriptions
   - Add keywords
   - Set privacy policy URL
4. **Pricing and Availability** → Free
5. **App Privacy** → Configure data collection
6. **App Review Info** → Test account if needed
7. **Select Build** → Choose uploaded build
8. **Submit for Review**

**⏰ Review Time:** 24-48 hours (usually)

---

## 🎨 Asset Requirements Quick Reference

### App Icon
- **Size**: 1024x1024 PNG
- **No** transparency
- **No** rounded corners (stores add these)
- **High quality**, recognizable at small sizes

### Screenshots

**Android:**
- At least 2 screenshots
- 1080x1920 or 1440x2560 recommended
- Show key features

**iOS:**
- 3-10 screenshots
- iPhone 6.7" (1290×2796) - Pro Max
- iPhone 6.5" (1242×2688) - Plus
- Show key features

### Privacy Policy
- Must be publicly accessible URL
- Describe what data you collect
- Explain how you use data
- Required by both stores

**Quick template**: Use [Privacy Policy Generator](https://www.privacypolicygenerator.info/)

---

## ⚠️ Common Gotchas

### Both Platforms
❌ **Using localhost URLs** → Update to production URLs
❌ **No privacy policy** → Required, will be rejected
❌ **Poor screenshots** → Take high-quality, attractive screenshots
❌ **Crashes on launch** → Test thoroughly on real devices
❌ **Missing permissions** → Declare all in manifest/Info.plist

### Android Specific
❌ **Wrong signing key** → Keep keystore file safe, can't be recovered!
❌ **Missing content rating** → Complete questionnaire
❌ **Outdated targetSdkVersion** → Use API 33+

### iOS Specific
❌ **Missing provisioning profile** → Select team in Xcode
❌ **No test account** → Provide if app requires login
❌ **Crashes in review** → Test on multiple iOS versions
❌ **References to Android** → Remove all Android mentions from iOS build

---

## 🚨 Emergency Checklist

Before you submit, verify:

- [ ] App installs and launches successfully
- [ ] All features work on physical device
- [ ] No crashes or freezes
- [ ] Using production API (not localhost)
- [ ] Privacy policy is live and linked
- [ ] Screenshots show actual app (not placeholders)
- [ ] App icon looks professional
- [ ] Descriptions are clear and accurate
- [ ] Test account provided (if login required)
- [ ] Version numbers set correctly

---

## 📞 Need Help?

### Resources
- 📚 **Full Guide**: See `docs/APP_STORE_PUBLISHING.md`
- ✅ **Checklist**: See `docs/APP_STORE_CHECKLIST.md`
- 🔧 **Capacitor Docs**: https://capacitorjs.com/docs
- 🤖 **Android Help**: https://support.google.com/googleplay/android-developer
- 🍎 **iOS Help**: https://developer.apple.com/support/app-store-connect/

### Communities
- Capacitor Discord: https://discord.gg/UPYYRhtyzp
- Stack Overflow: Tag questions with `capacitor`, `google-play`, or `app-store-connect`

---

## 🎉 Success Timeline

**Week 1:** 
- Set up accounts
- Install tools
- Build mobile app
- Test on devices

**Week 2:**
- Deploy backend to production
- Create assets (icon, screenshots)
- Write store listings
- Submit to stores

**Week 3:**
- Respond to review feedback
- Make any required changes
- Resubmit if needed

**Week 4:**
- Go live! 🚀
- Monitor reviews and analytics
- Plan first update

---

**You've got this! 💪 Start with Android (faster approval), then tackle iOS.**

Questions? Check the full guide or reach out to the communities above.
