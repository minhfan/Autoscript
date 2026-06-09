const fs = require('fs');
const path = require('path');

const APP_HTML_COMPONENTS = {
  "<!-- INJECT_COMPONENT:HEADER -->": "src/app/components/header.html",
  "<!-- INJECT_COMPONENT:WORKSPACE -->": "src/app/components/workspace.html",
  "<!-- INJECT_COMPONENT:MODALS -->": "src/app/components/modals.html",
};

// Wait, the components object in build-app-page.js has more. Let's look at build-app-page.js again.
// Wait, the components are nested.
// build-app-page.js replaces HEADER, WORKSPACE, MODALS.
// Wait, does WORKSPACE contain VIDEO_PANEL, TIMELINE_PANEL, FORM_PANEL, TABLE_PANEL?
