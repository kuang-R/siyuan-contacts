# siyuan-contacts

A [SiYuan Note](https://github.com/siyuan-note/siyuan) contact/address book plugin.

## Features

- **Slide-out Panel** — Click the floating button (bottom-right) or the top bar icon to open the contacts panel; auto-refreshes on every open
- **Toggleable FAB** — Show or hide the floating button from the panel toolbar (● visible / ○ hidden), with toast confirmation
- **Rich Contact Fields** — Name, multiple phone numbers, multiple emails, birthday, address, organization, groups, avatar (with image preview), website, WeChat, QQ, and notes
- **Avatar Support** — Upload profile images (≤128KB), displayed in list and detail views
- **Multi-Value Fields** — Add/remove phone numbers and email addresses individually with +/− buttons
- **Group Tags** — Organize contacts with custom tags and filter by them
- **Sort Options** — Sort by name (A-Z / Z-A), recently added, or recently updated
- **Slash Command Linking** — Type `/name` in any document to insert a link to a contact; clicking opens the panel instead of navigating
- **Slash Command** — Type `/add-contact` to quickly add a new contact
- **Click to Copy** — Click a phone number to copy it to clipboard (with visual toast)
- **Read-Only Documents** — Contact documents are protected from direct editing in the file tree
- **Contact as Document** — Each contact is a native SiYuan document, enabling all built-in features (linking, referencing, search, data history)
- **Full i18n** — Complete Chinese (zh_CN) and English (en_US) translations

## Installation

### From SiYuan Community Marketplace

Search for "siyuan-contacts" in the SiYuan marketplace.

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/ruan/siyuan-contacts/releases)
2. Copy the plugin folder to your SiYuan `data/plugins/` directory
3. Restart SiYuan or reload plugins

## Usage

### Opening the Panel

- Click the **blue floating button** (bottom-right corner) to slide out the contacts panel
- Or click the **contacts icon** in the top bar (right side of the SiYuan toolbar)
- The FAB can be toggled on/off from the panel toolbar (● icon next to the + button)
- Click the backdrop or press Escape to close

### Adding a Contact

- Click the **+** button in the panel toolbar
- Or use the keyboard shortcut **Ctrl+Shift+A**
- Or type `/add-contact` in any document

### Managing Phone Numbers & Emails

- In the edit form, each phone/email has its own input field
- Click **+ Phone** / **+ Email** to add another field
- Click the **−** button to remove a field

### Linking to Contacts

- In any document, type `/` followed by the contact's name (e.g., `/张三`)
- Select the contact from the slash menu
- A clickable link to the contact will be inserted
- Click the link to navigate to the contact document

### Organizing with Groups

- In the edit form, enter group tags separated by commas (e.g., `friends, work, family`)
- Use the group filter bar to filter by group

## Development

```bash
npm install          # Install dependencies
npm run dev          # Dev build (watch mode)
npm run build        # Production build → dist/index.js
npm test             # Run unit tests
```

### Project Structure

```
src/
  index.ts              Plugin entry point (DOM injection, FAB, panel)
  index.css             Global styles
  global.d.ts           Type declarations
  utils/
    api.ts              SiYuan API wrapper
    constants.ts        Plugin constants & attribute keys
    i18n.ts             Internationalization
    notebook.ts         Notebook management
    sql.ts              SQL query builders
    avatar.ts           Avatar utilities
  models/
    contact.ts          Contact data model & form data
    attributeKeys.ts    IAL parser & attribute mapping
  stores/
    contactStore.ts     Svelte stores & CRUD actions
    uiStore.ts          UI state management
  components/
    ContactPanel.svelte All-in-one UI component (list, detail, form, dialogs)
  editor/
    mentionPlugin.ts    Slash command contact linking (/name)
    slashCommand.ts     /add-contact slash command
    linkPlugin.ts       Click handler & context menu
  tests/
    ial.test.ts         IAL parser tests
    utils.test.ts       Utility function tests
```

## Technical Design

Each contact is stored as a SiYuan document in a dedicated notebook. Metadata (phone, email, groups, etc.) is stored as custom block attributes (`custom-contact-*`) on the document root block, enabling native SiYuan search, linking, and free-form note-taking.

The UI is built as a single Svelte component rendered into a DOM-injected slide-out overlay for maximum compatibility across desktop app, browser, and Docker deployments.

## License

MIT
