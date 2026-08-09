const DUMBBELL_ICON = `
    <svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2.7 10.2h2v3.6h-2v-3.6Zm3-2h2.1v7.6H5.7V8.2Zm2.9 2.8h6.8v2H8.6v-2Zm7.6-2.8h2.1v7.6h-2.1V8.2Zm3.1 2h2v3.6h-2v-3.6Z"/>
    </svg>
`;

const ICONS = {
    "🏋️": DUMBBELL_ICON,
    "💪": DUMBBELL_ICON,
    "exercise": DUMBBELL_ICON,
    "✓": `
        <svg class="app-silhouette-icon app-silhouette-stroke" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m4.5 12.4 4.4 4.4L19.7 6.4"/>
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

const resolvedIcon = /exercise/i.test(String(title))
    ? "exercise"
    : icon;

const renderedIcon = ICONS[resolvedIcon] || resolvedIcon;

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