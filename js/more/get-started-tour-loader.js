const STYLE_ID = "level-up-get-started-tour-styles";

if (!document.getElementById(STYLE_ID)) {
  const link = document.createElement("link");
  link.id = STYLE_ID;
  link.rel = "stylesheet";
  link.href = "css/get-started-tour.css?v=get-started-tour-1";
  document.head.appendChild(link);
}

import("./get-started-tour.js?v=get-started-tour-1").catch(error => {
  console.error("Get Started tour failed to load:", error);
});
