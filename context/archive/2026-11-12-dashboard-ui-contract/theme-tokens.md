# Dashboard theme tokens

## Source and scope

Source: the existing Tailwind color scale, arranged for the calm dark dashboard approved in `plan.md`. Radius retains the repository's existing `0.625rem` value. This is a scoped extension of the existing design system, not an additional palette publication or dependency.

The values live in `.dashboard-theme` in `src/styles/global.css`, after the global `.dark` block. Existing `@theme inline` mappings publish the semantic roles for Tailwind utilities. In phase 3, the dashboard wrapper will use `dashboard-theme dark`; this phase defines the scope without attaching it to a rendered view.

## Values

| Token                    | Value      | Scale source               | Role                                   |
| ------------------------ | ---------- | -------------------------- | -------------------------------------- |
| `--background`           | `#0f172a`  | slate-900                  | Panel page background                  |
| `--foreground`           | `#f1f5f9`  | slate-100                  | Main text                              |
| `--card`                 | `#1e293b`  | slate-800                  | Opaque card surface                    |
| `--card-foreground`      | `#f1f5f9`  | slate-100                  | Card text                              |
| `--primary`              | `#c4b5fd`  | violet-300                 | Primary action                         |
| `--primary-foreground`   | `#1e1b4b`  | indigo-950                 | Text on primary action                 |
| `--secondary`            | `#334155`  | slate-700                  | Secondary action surface               |
| `--secondary-foreground` | `#f1f5f9`  | slate-100                  | Secondary action text                  |
| `--muted`                | `#334155`  | slate-700                  | Muted surface                          |
| `--muted-foreground`     | `#cbd5e1`  | slate-300                  | Supporting text                        |
| `--accent`               | `#334155`  | slate-700                  | Interaction accent surface             |
| `--accent-foreground`    | `#f1f5f9`  | slate-100                  | Interaction accent text                |
| `--destructive`          | `#fca5a5`  | red-300                    | Error text and invalid state           |
| `--border`               | `#64748b`  | slate-500                  | Surface boundaries                     |
| `--input`                | `#64748b`  | slate-500                  | Input boundaries                       |
| `--ring`                 | `#c4b5fd`  | violet-300                 | Visible keyboard focus                 |
| `--radius`               | `0.625rem` | Existing repository radius | Base corner radius                     |
| `color-scheme`           | `dark`     | Native browser scheme      | Dark native form controls and calendar |

## Contract

- The dashboard has one fixed dark theme, without a theme switch or stored preference.
- Use semantic utility roles such as `bg-background`, `bg-card`, `text-foreground`, `border-input` and `ring-ring`; keep raw values in the token source.
- Dashboard surfaces are opaque and do not use gradients.
- Global `:root`, `.dark`, body styles and `bg-cosmic` retain their existing definitions for other views.
- The local dark color scheme supports native date-picker contrast; rendered text, focus and calendar contrast remain a visual verification requirement when the view is connected in phase 3.
