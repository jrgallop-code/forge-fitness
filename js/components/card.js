const ICONS = {
    "🏋️": `
        <svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2.7 10.2h2v3.6h-2v-3.6Zm3-2h2.1v7.6H5.7V8.2Zm2.9 2.8h6.8v2H8.6v-2Zm7.6-2.8h2.1v7.6h-2.1V8.2Zm3.1 2h2v3.6h-2v-3.6Z"/>
        </svg>
    `,
    "✓": `
        <svg class="app-silhouette-icon app-silhouette-stroke" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m4.5 12.4 4.4 4.4L19.7 6.4"/>
        </svg>
    `,
    "💪": `
        <svg class="app-silhouette-icon bicep-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7.2 3.1c.8-.5 1.8-.2 2.3.5l.8 1.2 1.1-.8c.7-.5 1.7-.3 2.2.4.4.6.3 1.5-.2 2l-2.1 1.8v3.2l1.1-1c1.2-1.1 2.8-1.7 4.4-1.7 2.9 0 5.3 2.1 5.7 4.9.5 3.6-2.3 6.9-6 6.9H8.1c-3.1 0-5.6-2.5-5.6-5.6 0-1.7.8-3.4 2.1-4.4l2.3-1.8V5.1c0-.8.1-1.5.3-2Z"/>
            <path d="M7.1 2.8 9 2.1l1.2 2-2.1.9-1-2.2Zm3.3 2 1.8-1.3 1.2 1.7-2 1.5-1-1.9Z"/>
        </svg>
    `,
    "📋": `
        <svg class="app-silhouette-icon app-silhouette-stroke" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5.5H5.8A1.8 1.8 0 0 0 4 7.3v12.9h16V7.3a1.8 1.8 0 0 0-1.8-1.8H16"/>
            <path d="M8 4.2h2a2 2 0 0 1 4 0h2v3H8v-3ZM8 11h8M8 15h8"/>
        </svg>
    `,
    "⚖️": `
        <svg class="app-silhouette-icon app-silhouette-stroke" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v15M7 5h10M4.5 8 2.5 13h4L4.5 8Zm15 0-2 5h4l-2-5ZM7.5 20h9"/>
        </svg>
    `,
    "💧": `
        <svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2.4S5.8 9.4 5.8 14a6.2 6.2 0 0 0 12.4 0C18.2 9.4 12 2.4 12 2.4Z"/>
        </svg>
    `,
    "🌙": `
        <svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.4 15.2A8.6 8.6 0 0 1 9 3.6 9 9 0 1 0 20.4 15.2Z"/>
        </svg>
    `
};

export function createCard(title, value, icon){

const renderedIcon = ICONS[icon] || icon;

return `

<div class="metric-card">

<div class="metric-icon">
${renderedIcon}
</div>

<div>

<h3>
${title}
</h3>

<p>
${value}
</p>

</div>

</div>

`;

}