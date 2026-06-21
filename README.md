# siyuan-contacts (通讯录)

A [SiYuan Note](https://github.com/siyuan-note/siyuan) plugin that adds contact/address book functionality.

## Features

- **Contact Management** — Add, edit, delete, and search contacts in a dedicated dock panel
- **Rich Contact Fields** — Name, phone, email, birthday, address, organization, groups, avatar, website, WeChat, QQ, and notes
- **Group Tags** — Organize contacts with custom group tags and filter by them
- **@Mention Integration** — Type `@name` in any document to insert a link to a contact
- **Slash Command** — Type `/add-contact` to quickly add a new contact
- **Seamless Navigation** — Click on a contact reference to jump directly to the contact page
- **Contact as Document** — Each contact is a native SiYuan document, enabling all built-in features (linking, referencing, search)

## Installation

### From SiYuan Community Marketplace

Search for "siyuan-contacts" in the SiYuan marketplace.

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/ruan/siyuan-contacts/releases)
2. Copy the plugin folder to your SiYuan `data/plugins/` directory
3. Restart SiYuan or reload plugins

## Usage

### Adding a Contact

- Click the **+** button in the Contacts dock panel
- Or use the keyboard shortcut **Ctrl+Shift+A**
- Or type `/add-contact` in any document

### Viewing & Editing

- Click any contact in the list to view details
- Click **Edit** to modify contact information
- Click **Delete** to remove a contact

### Linking to Contacts

- In any document, type `@` followed by the contact's name
- Select the contact from the dropdown
- A link to the contact will be inserted: `[Name](siyuan://blocks/ID)`
- Click the link to navigate to the contact document

### Organizing with Groups

- In the contact edit form, enter group tags separated by commas (e.g., `friends, work, family`)
- Use the group filter bar at the top of the contacts panel to filter by group

## Development

```bash
# Install dependencies
pnpm install

# Start dev build with watch mode
pnpm run dev

# Production build
pnpm run build
```

### Project Structure

```
src/
  index.ts              Plugin entry point
  index.css             Global styles
  global.d.ts           Type declarations
  utils/
    api.ts              SiYuan API wrapper
    constants.ts        Plugin constants
    i18n.ts             Internationalization
    notebook.ts         Notebook management
    sql.ts              SQL query builders
    avatar.ts           Avatar utilities
  models/
    contact.ts          Contact data model
    attributeKeys.ts    IAL parser & attribute mapping
  stores/
    contactStore.ts     Svelte stores & CRUD actions
    uiStore.ts          UI state management
  components/
    ContactPanel.svelte       Main dock panel
    ContactToolbar.svelte     Search, sort, add
    ContactList.svelte        Contact list
    ContactListItem.svelte    Contact row
    ContactDetail.svelte      Detail view
    ContactForm.svelte        Add/edit form
    ContactAvatar.svelte      Avatar display
    GroupFilter.svelte        Group filter bar
    GroupTag.svelte           Group tag badge
    EmptyState.svelte         Empty placeholder
    LoadingSpinner.svelte     Loading indicator
    DeleteConfirmDialog.svelte Confirmation dialog
  editor/
    mentionPlugin.ts    @mention autocomplete
    slashCommand.ts     /add-contact slash command
    linkPlugin.ts       Click handler & block icon menu
```

## Technical Design

Each contact is stored as a SiYuan document in a dedicated "通讯录" notebook. Contact metadata (phone, email, groups, etc.) is stored as custom block attributes (`custom-contact-*`) on the document root block. This approach:

- Enables full SiYuan search and reference linking
- Keeps contact data queryable via SiYuan's SQL API
- Allows users to freely add notes and content to contact documents

## License

MIT
