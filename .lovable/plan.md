

## Auto-load Cities for Location Field

Replace the plain text input for "Location" in Guardian settings with an autocomplete component that suggests cities worldwide as the user types.

### Approach
Use a static curated list of ~600 major world cities (embedded in a helper file) with client-side fuzzy filtering — no API key needed, instant results, works offline.

### Changes

**1. Create `src/lib/cities.ts`**
- Export an array of ~600 major cities worldwide (format: `"City, Country"`)
- Cover all continents, with strong Indian city coverage (~80 Indian cities)

**2. Update `src/components/guardian/GuardianDashboard.jsx` (lines 752-757)**
- Replace the plain `<input>` with an autocomplete widget:
  - Text input that filters the city list on each keystroke (case-insensitive substring match)
  - Dropdown of up to 8 matching suggestions below the input
  - Click a suggestion to select it; typing a custom value is still allowed
  - Dropdown closes on blur or selection
- Add state: `cityQuery`, `showCitySuggestions`, `filteredCities`

### No backend or database changes needed — the `location` column already exists as text.

