export function createCard(title, value, icon){

return `

<div class="metric-card">

<div class="metric-icon">
${icon}
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