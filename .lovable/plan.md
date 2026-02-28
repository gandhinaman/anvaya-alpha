

## Restrict Phone Number Format for Calling

Add phone number validation and formatting to both input locations (Login signup and Guardian Settings) to ensure numbers are in international format (`+<country_code><number>`) so `tel:` links work reliably.

### Changes

**1. Create `src/lib/phoneFormat.ts`**
- `formatPhoneInput(value)` — auto-prepend `+`, strip non-digit characters (except leading `+`), limit to 15 digits (ITU max)
- `isValidPhone(value)` — validate: starts with `+`, 7–15 digits after country code
- Used by both input locations

**2. Update `src/pages/Login.tsx` (line 202)**
- Use `formatPhoneInput` in the `onChange` handler so input is auto-formatted
- Show validation hint below the input (e.g. "Include country code, e.g. +91 98765 43210")
- Prevent form submission if phone is present but invalid

**3. Update `src/components/guardian/GuardianDashboard.jsx` (lines 751-754)**
- Same `formatPhoneInput` in `onChange`
- Show inline validation error if phone doesn't match international format
- Disable save button if phone is invalid

**4. Update `src/components/AnvayaApp.jsx` (line 213-214)**
- No change needed — it already strips spaces with `.replace(/\s+/g, "")`, which works with the `+` prefix format

### Format Rules
- Auto-prepend `+` if user starts typing digits
- Only allow digits after `+`
- Allow spaces for readability (stripped before `tel:` use)
- Min 8 chars, max 16 chars (including `+`)
- Visual feedback: green border if valid, red if invalid

