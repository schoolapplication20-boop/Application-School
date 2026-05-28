# My Skoolz — Test School Credentials

Permanent test school used for all E2E tests and future feature development.
Run the seeder once to create this school; credentials never change.

| Field | Value |
|-------|-------|
| **School Name** | My Skoolz |
| **School ID** | 9999 |
| **School Code** | MYSKOOLZ |
| **Board** | CBSE |
| **Academic Year** | 2025-2026 |
| **City** | Hyderabad, Telangana |

---

## Credentials

### Super Admin
| | |
|--|--|
| **Email** | `superadmin@myskoolz.test` |
| **Password** | `Skoolz@SuperAdmin1` |
| **Dashboard** | `/superadmin/dashboard` |

### Admin
| | |
|--|--|
| **Email** | `admin@myskoolz.test` |
| **Password** | `Skoolz@Admin1` |
| **Dashboard** | `/admin/dashboard` |

### Teacher 1 — Priya Sharma (Mathematics)
| | |
|--|--|
| **Email** | `teacher1@myskoolz.test` |
| **Password** | `Skoolz@Teacher1` |
| **Emp ID** | `MSZ-T001` |
| **Dashboard** | `/teacher/dashboard` |

### Teacher 2 — Ravi Kumar (Science)
| | |
|--|--|
| **Email** | `teacher2@myskoolz.test` |
| **Password** | `Skoolz@Teacher2` |
| **Emp ID** | `MSZ-T002` |
| **Dashboard** | `/teacher/dashboard` |

### Student 1 — Arjun Singh (Class 5-A, Roll 1)
| | |
|--|--|
| **Admission No** | `MSZ001` |
| **Password** | `Skoolz@Student1` |
| **Dashboard** | `/student/dashboard` |

### Student 2 — Divya Reddy (Class 5-A, Roll 2)
| | |
|--|--|
| **Admission No** | `MSZ002` |
| **Password** | `Skoolz@Student2` |
| **Dashboard** | `/student/dashboard` |

### Student 3 — Mohammed Aziz (Class 5-A, Roll 3)
| | |
|--|--|
| **Admission No** | `MSZ003` |
| **Password** | `Skoolz@Student3` |
| **Dashboard** | `/student/dashboard` |

---

## Classes Created

| Class | Section |
|-------|---------|
| Class 1 | A |
| Class 2 | A |
| Class 3 | A |
| Class 4 | A |
| Class 5 | A |

---

## How to run the seeder

Run once against the live backend. You need the Application Owner credentials.

```bash
cd client

# Against production
OWNER_EMAIL=owner@... \
OWNER_PASS=... \
API_URL=https://application-school.onrender.com \
node tests/seed/seed.mjs

# Against local backend
OWNER_EMAIL=owner@... OWNER_PASS=... node tests/seed/seed.mjs
```

If the school already exists and you need to re-run partial steps:

```bash
# Skip super admin creation (already exists), provide current password
SA_CURRENT_PASS=<current-sa-password> \
OWNER_EMAIL=owner@... OWNER_PASS=... \
node tests/seed/seed.mjs
```

---

## Running E2E tests

After the seeder completes, run:

```bash
cd client
npm run test:e2e           # headless
npm run test:e2e:headed    # with browser visible
npm run test:e2e:ui        # Playwright interactive UI
```

The default credentials in `tests/helpers/constants.ts` already match this school,
so no additional environment variables are needed when running locally.
