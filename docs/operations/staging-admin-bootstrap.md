# Staging admin bootstrap

Use this one-time, non-destructive command when the staging database has no
administrator account. It creates one admin or refreshes an existing admin with
the same email. It never deletes application data and refuses to promote an
existing customer or vendor account.

For an existing admin, the command updates the display name and password and
marks the email as verified. It deliberately preserves the current ban state,
so it cannot reactivate an administrator that was intentionally disabled.

## Required Railway variables

Configure these variables on the staging backend service:

```text
STAGING_ADMIN_EMAIL=<controlled test email>
STAGING_ADMIN_PASSWORD=<unique 16-100 character password using at least three of lowercase, uppercase, numbers, and symbols>
STAGING_ADMIN_NAME=<optional display name>
STAGING_BOOTSTRAP_CONFIRMATION=CREATE_STAGING_ADMIN
```

Store the credentials in the team's password manager. Do not put their values
in source control, GitHub issues, workflow inputs, or command-line arguments.

Railway supplies `DATABASE_URL` and `RAILWAY_ENVIRONMENT_NAME`. The command
requires the latter to equal `staging` exactly and requires a PostgreSQL URL.

## Run once

After deploying the commit that contains the command (the Docker build compiles
it into `dist/scripts`), execute it inside the staging backend service:

```bash
npx -y @railway/cli ssh -s backend -e staging \
  npm run db:staging:bootstrap-admin
```

The command reports only the admin email and whether the account was created or
updated. It never prints the password.

After confirming the login, remove `STAGING_ADMIN_PASSWORD` and
`STAGING_BOOTSTRAP_CONFIRMATION` from Railway. They are needed only when the
bootstrap command is run, and removing them prevents an accidental later run.

After the admin can log in, create customer and vendor accounts through the
staging registration flows. Use the admin dashboard to approve, reject, and
suspend separate vendor accounts so those workflows are exercised rather than
bypassed with direct database writes.

Do not use `npm run db:seed` for this purpose. That command resets the dedicated
web E2E database and deliberately refuses to run against the staging database.
