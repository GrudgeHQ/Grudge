# App Store Setup Checklist
# Track your progress through the app store submission process

## ✅ Account Setup
- [ ] Apple Developer Account created ($99/year)
- [ ] Google Play Developer Account created ($25 one-time)
- [ ] Payment information added to both accounts
- [ ] Tax forms completed

## 🎨 Asset Creation
- [ ] App icon created (1024x1024 PNG, no transparency)
- [ ] Screenshots taken for:
  - [ ] iPhone 6.7" Display (Pro Max)
  - [ ] iPhone 6.5" Display (Plus)
  - [ ] Android Phone (1080x1920 minimum)
  - [ ] Android Tablet (optional)
- [ ] Feature graphic created (1024x500 for Google Play)
- [ ] App description written (short & long versions)
- [ ] Keywords researched and selected
- [ ] Privacy policy created and published
- [ ] Support/contact page created

## 🔧 Technical Setup
- [ ] Capacitor installed: `npm install @capacitor/core @capacitor/cli`
- [ ] Capacitor initialized: `npx cap init`
- [ ] iOS platform added: `npx cap add ios` (Mac only)
- [ ] Android platform added: `npx cap add android`
- [ ] Next.js configured for static export
- [ ] App icons generated for both platforms
- [ ] Splash screens configured
- [ ] Production API endpoints configured
- [ ] Environment variables set for production

## 🌐 Backend Deployment
- [ ] Production server deployed (Vercel/AWS/etc)
- [ ] Database migrated to production (PostgreSQL recommended)
- [ ] HTTPS/SSL certificates configured
- [ ] API endpoints tested from mobile
- [ ] CORS configured for mobile app
- [ ] Authentication working end-to-end
- [ ] Real-time features (Pusher) configured
- [ ] Monitoring and logging enabled

## 📱 Android Preparation
- [ ] Android Studio installed
- [ ] Android SDK installed (API 33+)
- [ ] Signing keystore generated
- [ ] App signed with release key
- [ ] AAB (Android App Bundle) built successfully
- [ ] Tested on physical Android device
- [ ] No crashes or major bugs
- [ ] App listing completed in Play Console:
  - [ ] App name, description, screenshots
  - [ ] Content rating questionnaire completed
  - [ ] Privacy policy linked
  - [ ] Data safety form completed

## 🍎 iOS Preparation (Mac Required)
- [ ] Xcode installed (14+)
- [ ] CocoaPods installed
- [ ] Development team selected in Xcode
- [ ] App ID created in Apple Developer portal
- [ ] Provisioning profiles configured
- [ ] App signed with distribution certificate
- [ ] Archive built successfully in Xcode
- [ ] Tested on physical iOS device via TestFlight
- [ ] No crashes or major bugs
- [ ] App listing completed in App Store Connect:
  - [ ] App name, description, screenshots
  - [ ] Age rating questionnaire completed
  - [ ] Privacy policy linked
  - [ ] App Privacy details configured
  - [ ] Test account provided (if login required)

## 📋 Store Submission
- [ ] **Google Play**:
  - [ ] Internal testing track created
  - [ ] AAB uploaded
  - [ ] Internal testers added
  - [ ] Internal testing completed
  - [ ] Promoted to Production
  - [ ] Submitted for review
- [ ] **Apple App Store**:
  - [ ] Build uploaded via Xcode
  - [ ] Build selected in App Store Connect
  - [ ] Export compliance answered
  - [ ] Submitted for review

## 🎯 Pre-Launch
- [ ] All features tested on real devices
- [ ] Performance optimized (< 3s load time)
- [ ] Offline functionality tested
- [ ] Network error handling verified
- [ ] Analytics configured (optional)
- [ ] Crash reporting set up (optional)
- [ ] Landing page/website ready
- [ ] Social media accounts created
- [ ] Support email monitored

## 🚀 Post-Launch
- [ ] Monitor crash reports daily
- [ ] Respond to user reviews
- [ ] Track download metrics
- [ ] Gather user feedback
- [ ] Plan feature updates
- [ ] Fix critical bugs immediately
- [ ] Update documentation

---

## 📝 Notes

**App ID (Bundle Identifier):** com.yourdomain.grudgeapp
**Current Version:** 1.0.0
**Build Number:** 1

**Important Dates:**
- Google Play submission: __________
- Google Play approval: __________
- App Store submission: __________
- App Store approval: __________

**Keystore Location:** grudge-app-release.keystore (Keep this safe!)
**Keystore Password:** __________________ (Store securely!)

**Test Accounts:**
- Email: test@grudgeapp.com
- Password: TestPassword123!

---

## 🆘 Quick Commands Reference

```powershell
# Build mobile app
npm run mobile:build

# Sync with native platforms
npx cap sync

# Open in Android Studio
npx cap open android

# Open in Xcode (Mac)
npx cap open ios

# Run on Android device
npx cap run android

# Run on iOS device (Mac)
npx cap run ios

# Build Android release
cd android && .\gradlew bundleRelease

# Update native plugins
npm install @capacitor/[plugin-name]
npx cap sync
```
