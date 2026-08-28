# Smart Job Hunter — Master Source

This repository is the single source of truth for two product families:

- **Personal Edition:** fully unlocked, includes the dedicated Plastics & Manufacturing mode for Khaled Taha and the generic career mode.
- **Commercial Edition:** generic and customizable for any career field, distributed in Basic, Standard, and Premium tiers.

## Commercial tiers

| Feature | Basic | Standard | Premium |
| --- | --- | --- | --- |
| Career profiles | 1 | 3 | Unlimited |
| Applications | 20 | 100 | Unlimited |
| Search sites | 3 | 5 | All configured sites |
| Target companies | No | Yes | Yes |
| CSV export | No | Yes | Yes |
| Advanced pipeline | No | No | Yes |
| Follow-up alerts | No | No | Yes |
| Excel import/export | No | No | Yes |
| Database backup/restore | No | No | Yes |

Premium pipeline stages are: New → Interested → Applied → Interview → Offer → Rejected.

## Build all editions

```bash
npm install
npm run build:editions
```

The build creates these independent deployment folders in `releases/`:

- `Khaled-Personal`
- `Smart-Job-Hunter-Commercial-Basic`
- `Smart-Job-Hunter-Commercial-Standard`
- `Smart-Job-Hunter-Commercial-Premium`

Each folder contains the static frontend plus the lightweight PHP/MySQL backend for standard cPanel/Hostinger hosting. The backend validates tier limits when data is saved and protects Premium-only database backup/restore actions.

For Basic and Standard sales, replace `UPGRADE_URL_HERE` in the tier's `edition-config.js` with the Khamsat or product upgrade page before distribution.

## Code-language rule

Application code, comments, variables, functions, configuration, and backend logic must remain English-only. Arabic is permitted only in frontend strings that are intentionally rendered to the user.
