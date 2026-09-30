Replace the existing Admin Dashboard files with:
src/pages/Admin/Dashboard.jsx  <- Dashboard.jsx
src/pages/Admin/Dashboard.css  <- Dashboard.css

Notification fix:
- dashboard banner no longer clips its notification dropdown
- dedicated .dash-ov-notif-layer stacking layer
- notification menu z-index raised only within dashboard scope
- no global z-index changes
- all notification content/design/functionality otherwise unchanged
