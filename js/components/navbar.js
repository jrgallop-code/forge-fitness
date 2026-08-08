import {navigate}
from "../core/router.js?v=router-calorie-nav-1";


export function renderNavbar(){

setTimeout(()=>{


document.querySelectorAll(".nav-btn")

.forEach(button=>{


button.addEventListener(
"click",

()=>{

document.querySelectorAll(".nav-btn")
.forEach(item =>
item.classList.toggle(
"active",
item === button
)
);

navigate(
button.dataset.page
);

}

);


});


},0);



return `

<nav class="bottom-nav" aria-label="Primary navigation">


<button class="nav-btn active" data-page="home" aria-label="Home">

🏠

<span>
Home
</span>

</button>



<button class="nav-btn" data-page="workout" aria-label="Workout">

💪

<span>
Workout
</span>

</button>



<button class="nav-btn" data-page="progress" aria-label="Progress">

📈

<span>
Progress
</span>

</button>



<button class="nav-btn" data-page="energy" aria-label="Calorie Planner">

🔥

<span>
Calories
</span>

</button>


<button class="nav-btn" data-page="more" aria-label="More">

•••

<span>
More
</span>

</button>


</nav>

`;

}
