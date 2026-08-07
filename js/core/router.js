import {renderDashboard}
from "../dashboard/dashboard-ui.js";


export function navigate(page){

const content =
document.getElementById("content");


switch(page){


case "home":

content.innerHTML =
renderDashboard();

break;


case "workout":

content.innerHTML = `

<section class="section-card">

<h2>
Today's Workout
</h2>

<p>
No workout started yet.
</p>


<button class="primary-btn">
Start Workout
</button>

</section>

`;

break;



case "progress":

content.innerHTML = `

<section class="section-card">

<h2>
Progress Analytics
</h2>

<p>
Graphs and performance tracking coming soon.
</p>

</section>

`;

break;



case "goals":

content.innerHTML = `


<section class="section-card">


<h2>
🎯 Goals & Calories
</h2>


<p>
Set your body goals and calorie targets.
</p>


<div class="goal-box">


<h3>
Current Goal
</h3>


<select>

<option>
Cut
</option>

<option>
Maintain
</option>

<option>
Bulk
</option>


</select>


</div>



<div class="goal-box">


<h3>
Estimated TDEE
</h3>


<p>
2650 kcal/day
</p>


</div>



<div class="goal-box">


<h3>
Daily Target
</h3>


<p>
2250 kcal/day
</p>


</div>



</section>


`;


break;


}

}