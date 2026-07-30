# Daily Office Attendance

Daily Office, also shown as DO, is a responsive office attendance dashboard built with plain HTML, CSS, and JavaScript. It stores attendance records in the current browser with `localStorage`, so no backend or environment variables are required at this stage.

## Features

1. Daily check in and check out
2. Manual attendance correction for missed or late entries
3. Current day attendance status
4. Monthly leave calculation
5. Completed working days card
6. Monthly average working time with status based card styling
7. Daily work summary
8. Upcoming Friday and Saturday holidays
9. Personal upcoming leave planning with add and remove controls
10. Current month attendance sheet
11. Friday and Saturday holiday highlighting
12. Planned leave highlighting
13. Recent working hours chart
14. Monthly attendance status chart
15. CSV export
16. Local data reset
17. Responsive desktop and mobile layout

## Project files

```text
daily-office-attendance/
├── assets/
│   └── favicon.svg
├── .gitignore
├── _headers
├── app.js
├── index.html
├── LICENSE
├── README.md
├── robots.txt
├── site.webmanifest
├── styles.css
└── vercel.json
```

## Run locally

You can open `index.html` directly in a browser. A local web server is recommended for testing.

Using Python:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Deploy with Vercel

1. Create a new GitHub repository.
2. Upload all files from this project folder to the repository root.
3. In Vercel, select **Add New Project**.
4. Import the GitHub repository.
5. Keep the framework preset as **Other**.
6. Leave the build command empty.
7. Leave the output directory empty.
8. Select **Deploy**.

The included `vercel.json` adds basic security headers. No environment variables are needed.

## Deploy with Cloudflare Pages

1. Create a new GitHub repository.
2. Upload all files from this project folder to the repository root.
3. In Cloudflare, open **Workers and Pages**.
4. Create a Pages application and connect the GitHub repository.
5. Select **None** or **Static HTML** as the framework preset.
6. Leave the build command empty.
7. Set the build output directory to `/` or leave it empty if the interface permits.
8. Start the deployment.

The included `_headers` file adds basic security headers on Cloudflare Pages. No environment variables are needed.

## Browser storage

Records are stored under this key:

```text
dailyOfficeAttendance_v1
```

Existing records from the earlier version remain compatible. The current data model adds `plannedLeaves` and manual edit metadata without changing the storage key.

The data is available only in the same browser and device. Clearing browser site data, using another browser, or using another device does not carry the attendance records across.

## Manual attendance correction

Use the **Add** or **Edit** button in the attendance sheet. You can enter or change check in and check out times for today or any earlier working day in the current month. Future dates and weekly holidays cannot be edited.

## Later Supabase migration

The current local state is grouped by date inside `app.js`. A later Supabase version can replace the `loadState` and `saveState` functions with authenticated database queries while keeping most of the interface and calculations unchanged.
