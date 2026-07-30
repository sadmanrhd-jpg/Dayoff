# Daily Office Attendance

Daily Office, also shown as DO, is a responsive office attendance dashboard built with plain HTML, CSS, and JavaScript. It stores attendance records in the current browser with `localStorage`, so no backend or environment variables are required at this stage.

## Features

1. Daily check in and check out
2. Current day attendance status
3. Monthly leave calculation
4. Monthly average working time with status based card styling
5. Daily work summary
6. Current month attendance sheet
7. Friday and Saturday holiday highlighting
8. Recent working hours chart
9. Monthly attendance status chart
10. CSV export
11. Local data reset
12. Responsive desktop and mobile layout

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

The data is available only in the same browser and device. Clearing browser site data, using another browser, or using another device does not carry the attendance records across.

## Later Supabase migration

The current local state is grouped by date inside `app.js`. A later Supabase version can replace the `loadState` and `saveState` functions with authenticated database queries while keeping most of the interface and calculations unchanged.
