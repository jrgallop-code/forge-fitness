import {createCard}
from "../components/card.js";


export function renderDashboard(){

return `

<section class="dashboard">


${createCard(
"Weight",
"159.8 lb",
"⚖️"
)}


${createCard(
"Workout Streak",
"12 Days",
"🔥"
)}


${createCard(
"Weekly Volume",
"42,350 lb",
"🏋️"
)}


${createCard(
"Goal",
"Build Strength",
"🎯"
)}

${createCard(
"Calorie Target",
"2300 kcal/day",
"🍽️"
)}

</section>



<section class="section-card">

<h2>
Recent Workout
</h2>


<p>
Upper Body • Bench Press • Pull-ups
</p>


</section>

`;

}