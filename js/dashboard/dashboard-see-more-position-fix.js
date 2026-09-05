const STYLE_ID = "dashboard-see-more-position-fix-1";

if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .dashboard-weight-see-more-action {
            top: -22px !important;
        }
    `;
    document.head.appendChild(style);
}
