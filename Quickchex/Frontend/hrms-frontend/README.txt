LA ESFERA CANONICAL /login REBUILD

Files:
- loginPage.jsx -> replace src/pages/Login/loginPage.jsx
- loginPage.css -> replace src/pages/Login/loginPage.css
- login-master-hero.png -> copy to public/login-master-hero.png

IMPORTANT:
1. App.jsx in the existing project already maps /login to LoginPage. Keep that route.
2. Do not import any other login stylesheet into LoginPage.
3. The new page intentionally does not import the old Unsplash/loginImg.jpg.
4. The supplied master screenshot is cropped to the left hero only, so the login form is rendered in React and is not duplicated.
5. The existing authentication flow is preserved: JSON login -> form-encoded fallback on 422 -> session storage -> /otp.
6. No OTP component or OTP CSS is modified.
7. Make sure public/login-master-hero.png exists because LoginPage references /login-master-hero.png.
