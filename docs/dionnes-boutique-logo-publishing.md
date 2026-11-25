# Dionne's Boutique — official logo upload (WGOS)

## Why this exists
The boutique's home hero previously stretched a 220px raster preview. The original approved transparent PNG (1254 × 1254 RGBA) must be used unchanged in the header, hero, footer, site icon and sale-popup.

## Publishing
1. Open `https://wgos.app/admin/inventory?brand=dionnesBoutique#boutique-brand-logo` with an authorized Dionne’s Boutique administrator account.
2. Select the **exact** approved original `Dionnes_Boutique_Approved_Logo.png`. The uploader accepts only a high-resolution 8-bit transparent RGBA PNG up to 3 MB, without resizing, recoloring, re-rendering or compression.
3. Tap **Publish Official Logo**. The system validates PNG headers and dimensions, creates an immutable public Vercel Blob asset, logs an audit event, and updates WGOS’s approved logo URL.
4. All site placements resolve through `https://dionnesboutique.com/brand/official-logo` and take the new URL on the next request. The old logo remains as a safe fallback if the new asset is not yet published.
5. Verify the live route redirects to a 1254 × 1254 PNG, and inspect iPhone and desktop screenshots for sharpness, cropping and legible tagline.

## Security
- Upload requires WGOS authentication and Dionne’s Boutique administrative privileges.
- The public output is only an approved PNG asset URL, never merchant credentials.
- Public brand lookup is restricted to the existing boutique/WGOS shared service secret.
- WGOS's Vercel Blob store must allow public objects. If the existing store is private-only, create/attach a suitable public store with owner approval.

## Remaining image exceptions
Live browser QA found 66/69 product references load; three still lack images (Benefit Boi-ing Mini / code 3E01; Tarte Shape Tape Mini / Rich Caramel; and an unidentified additional setting powder). Do not substitute shades or items based on fuzzy names. Item 58 remains held from sale in WGOS pending identification.
