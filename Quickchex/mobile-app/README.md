# Quickchex HRMS - Mobile App (Android & iOS)

A native mobile application for Quickchex HRMS built with **React Native & Expo**, connecting directly to your live Render backend (`https://quickchex-backend.onrender.com`).

---

## 📱 Features Included

1. **Secure Employee Sign-In**:
   - Authenticates against `/api/v1/auth/login`.
   - Encrypted token storage with `expo-secure-store`.
2. **GPS Geofenced Attendance**:
   - High-accuracy GPS location fetching using `expo-location`.
   - Punch In & Punch Out linked to your backend `/api/v1/attendance/punch`.
3. **Real-Time Dashboard**:
   - Live digital clock with date and attendance status badge.
   - Today's punch-in and punch-out summary.
4. **Leave Management**:
   - View Casual, Sick, and Privilege leave balances.
   - Quick leave application submission.

---

## 🚀 How to Run and Test on Your Phone (100% Free)

### Step 1: Install Expo Go on Your Phone
- **Android**: Install [Expo Go from Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent).
- **iOS / iPhone**: Install [Expo Go from Apple App Store](https://apps.apple.com/app/expo-go/id982107779).

### Step 2: Start the Development Server
Open PowerShell in this directory:
```powershell
cd "Quickchex\mobile-app"
npx expo start
```

### Step 3: Scan the QR Code
- A QR code will display in your terminal.
- Open the **Expo Go** app on your phone and tap **"Scan QR code"**.
- The app will load directly onto your phone screen! Any edits you make in the code will reflect instantly.

---

## 📦 How to Generate an `.apk` File (100% Free via EAS)

To build a standalone installable Android APK file:

1. Install EAS CLI (once):
   ```bash
   npm install -g eas-cli
   ```
2. Log into your free Expo account:
   ```bash
   eas login
   ```
3. Run the free Android build:
   ```bash
   eas build -p android --profile preview
   ```
4. Expo builds the APK on their cloud servers for free and gives you a direct download link.

---

## ⚙️ Configuration
The backend URL is configured in `src/config/apiConfig.js`:
```javascript
export const API_BASE_URL = 'https://quickchex-backend.onrender.com';
```
