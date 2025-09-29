# Highlight Unused CSS

Highlights unused CSS/SCSS classnames in global stylesheets such as `index.css` or `index.scss`.  
This makes it easier to clean up and maintain your styles by spotting unused selectors directly in VS Code.

---

## Features

- Automatically scans your global stylesheet (`index.css` / `index.scss`)  
- Highlights classes that are not used anywhere in your project  
- Works with **JavaScript / TypeScript / React / Next.js** projects  
- Updates automatically as you edit files  

---

## Extension Settings

You can configure the paths to your global CSS/SCSS files in your VS Code **settings.json**:

```json
{
  "highlight-unused-css.scssPath": "src/index.scss",
  "highlight-unused-css.cssPath": "src/index.css"
}
