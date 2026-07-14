# Waypoint

Find and jump to TODO comments scattered across your project, all in one sidebar panel.

## Installation

This extension isn't published to the VS Code Marketplace yet, so install manually instead:

1. Download the latest `.vsix` file from the [Releases page](https://github.com/tristancable/waypoint/releases)
2. In VS Code, open the Extensions view
3. Click the `...` menu (top-right of the Extensions panel), then **Install from VSIX...**
4. Select the downloaded file

## Features

- **Sidebar panel**: lists every `TODO`, `FIXME`, `HACK`, and `NOTE` comment in your workspace, grouped by file
- **Click to jump**: click any item to open that exact line
- **Live updates**: the list refreshes automatically every time you save a file
- **Mark as done**: right-click any item to check it off without deleting the comment
- **Custom tags & colors**: configure your own comment tags and assign each one a color
- **Status bar count**: see your total open todo count at a glance

## Usage

1. Open the Waypoint icon in the Activity Bar
2. Your TODOs appear automatically, grouped by file
3. Click any item to jump to it
4. Right-click an item to mark it done
5. Click the gear icon in the panel title bar to customize tags and colors

## Configuration

Waypoint adds one setting, `waypoint.tags`, an object where each key is a tag name and each value is its hex color:

\`\`\`json
"waypoint.tags": {
"TODO": "#e2c08d",
"FIXME": "#f14c4c",
"HACK": "#cc6633",
"NOTE": "#3794ff",
"REVIEW": ""
}
\`\`\`

Leave the color blank to get an automatically assigned color instead.

## Known limitations

- Scans a fixed set of common file types (JS/TS, Python, Java, C/C++, Go, Ruby, PHP, CSS, HTML, Markdown)
- No multi-root workspace support yet

## License

MIT
