# Hosted demo: accounts and data

This page is for the hosted demo at https://opentexila.site. It has the accounts you can sign in with, the data you will see, and how to try the live check-in. The data is fictional.

## How to sign in

Every account uses the same password:

```text
opentexila-demo-password
```

No account must change its password at first sign-in.

| Role     | Name                           | Email                                                     |
| -------- | ------------------------------ | --------------------------------------------------------- |
| Admin    | Admin                          | `admin@example.com`                                       |
| Lecturer | Lecturer One to Lecturer Eight | `lecturer-one@example.com` … `lecturer-eight@example.com` |
| Lecturer | Lecturer Nine (live demo only) | `lecturer-nine@example.com`                               |
| Student  | Student One to Student Fifty   | `student-one@example.com` … `student-fifty@example.com`   |

The number is spelled out in the email: `student-twenty-one@example.com`, `student-fifty@example.com`.

## What the data looks like

| Data               | Amount                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Admin              | 1                                                                                                  |
| Lecturers          | 9: Lecturers One to Eight teach 3 classes each, and Lecturer Nine teaches only the live demo class |
| Students           | 50 (each is in 3 or 4 classes)                                                                     |
| Classes            | 25: 24 normal classes and 1 live demo class                                                        |
| Terms              | `2026-S2` (21 normal classes and the live class) and `2027-S1` (3 classes)                         |
| Sessions           | 339: weekly sessions from 8 weeks before the data was loaded to 4 weeks after                      |
| Attendance records | about 2,500 (about 1,700 of them are for sessions that already ended)                              |
| Announcements      | 30                                                                                                 |

Every list has 2 or 3 pages (20 rows per page): for example the admin classes list (25 rows), the admin user list (60 rows), a lecturer's attendance sessions, and a student's attendance history.

Two classes meet twice a week, and three classes have about 28 students, so you can see long rosters and long session lists.

## Check-in

- **Regular classes** use a real campus location and follow their scheduled times. A session opens for check-in when it starts and closes when it ends. A student is Present up to the late time, Late after it, and Absent if they do not check in before the end. The student must be inside the class's venue area, so these classes cannot be tried from home.
- **The live demo class** works from anywhere in the world. Use it to try check-in (see below).

## Live check-in demo

Use the class **DEMO101-A, Live Check-in Demo**:

- Its room is "Anywhere (live demo)". The check-in area is so large that every place on Earth is inside it. The student's browser must still allow location access, and the page must use HTTPS (the live site does).
- It has one session that is open every day until 28 January 2027. A check-in is **Present**.
- Students One to Ten are enrolled. **Lecturer Nine** teaches it.

Steps:

1. Sign in as `student-one@example.com`, open **Attendance → Scheduled classes** and open the DEMO101-A session. Select **Check in** and allow location.
2. In another browser, sign in as `lecturer-nine@example.com` and open the attendance records of DEMO101-A. The record changes from Pending to Present.

Each student can check in once. If a student has already checked in, use another of Students One to Ten.

Please do not cancel, delete or edit the Live Check-in Demo class or session in the admin pages, because check-in would stop working. To try those features, use another class.
