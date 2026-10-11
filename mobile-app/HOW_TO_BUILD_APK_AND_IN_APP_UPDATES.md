# 📱 Quickchex HRMS: APK Generation & In-App Updates Guide

This guide explains how to generate the standalone `.apk` file for Android and how automatic in-app updates work every time you push code to GitHub.

---

## 1. How to Generate the `.apk` File

The app is pre-configured with **Expo EAS Build** under the `preview` profile to generate a direct standalone `.apk` (no Google Play Store account required).

### Option A: Cloud Build (Recommended – No Android Studio Needed)

1. Open PowerShell / Terminal in the `mobile-app` directory:
   ```powershell
   cd "c:\Users\username\Downloads\Quickchex 1\Quickchex\mobile-app"
   ```

2. Log in to your Expo account (create a free account at [expo.dev](https://expo.dev) if you don't have one):
   ```bash
   npx eas-cli login
   ```

3. Run the APK build command:
   ```bash
   npx eas-cli build -p android --profile preview
   ```

4. **Get the APK**:
   - EAS Build will package the app on Expo's cloud build servers.
   - Once completed, the terminal will give you:
     - A direct **APK download URL** (e.g., `https://expo.dev/artifacts/eas/xyz...apk`)
     - A **QR Code** you can scan with an Android phone to download the APK directly.
   - Send this `.apk` link or file to your employees to install on their devices.

---

### Option B: Local Build (If Android SDK / Studio is Installed)

If you have Android SDK and Java installed on your machine and prefer building locally:
```bash
npx eas-cli build -p android --profile preview --local
```
The resulting `.apk` will be output directly in your local directory.

---

## 2. How In-App Updates Work (OTA - Over-The-Air)

### A. Instant Web Updates (Website Code Changes)
Because the mobile app uses the **1:1 Web Portal Wrapper (`WebCloneScreen`)**:
- Whenever you make changes to frontend pages, styling, or dashboard components and push to GitHub, **Vercel instantly deploys the changes to production**.
- Anyone opening the mobile app immediately sees the new updates **with zero delay and without needing to download a new APK**.

---

### B. In-App Updates for Native Code (`expo-updates`)
For changes inside `mobile-app/`:
1. The app has `expo-updates` configured in `app.json` and [App.js](file:///c:/Users/username/Downloads/Quickchex%201/Quickchex/mobile-app/App.js).
2. On every app launch, `checkForUpdates()` runs automatically:
   - If an update is detected, it downloads the update bundle in the background.
   - A prompt displays:
     > *"🚀 Update Available: A new version with the latest features and improvements has been downloaded. Restart now to apply?"*
   - Tapping **Restart Now** immediately loads the new code.

---

### C. Automatic In-App Updates on GitHub Push (CI/CD)

We have added a GitHub Actions workflow:
📁 [`.github/workflows/eas-update.yml`](file:///c:/Users/username/Downloads/Quickchex%201/Quickchex/.github/workflows/eas-update.yml)

Whenever you push commits to GitHub affecting `mobile-app/**`, GitHub Actions automatically publishes the in-app update to all user devices!

#### One-Time Setup for GitHub Actions:
1. Log in to [expo.dev](https://expo.dev).
2. Go to **Account Settings** -> **Access Tokens** -> Click **Create Token**.
3. Go to your GitHub repository:
   - **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**.
   - Secret Name: `EXPO_TOKEN`
   - Secret Value: Paste your Expo token.
4. **Done!** From now on, whenever you push changes to GitHub, the workflow runs and sends the in-app update to all installed APKs automatically.

---

### D. Manual In-App Update Command

If you want to push an immediate in-app update from your terminal at any time:
```bash
cd mobile-app
npx eas-cli update --branch preview --message "Updated feature and bug fixes"
```
Within moments, every mobile app user will receive the update notification.
